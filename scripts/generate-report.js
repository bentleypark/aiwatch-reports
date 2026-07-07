#!/usr/bin/env node
// generate-report.js — Generate a draft monthly report from the AIWatch permanent archive.
//
// Usage: node scripts/generate-report.js 2026-04
//
// Data sources (archive-only — no live fallback, per #264 data-integrity policy):
//   /api/report?month=YYYY-MM  — monthly archive (services: score, uptime, incidents, latency)
//   /api/v1/status             — current service metadata (id → display name) ONLY for labels
//
// Schema coupling with the Worker archive (MonthlyServiceData in worker/src/monthly-archive.ts):
//   Used fields: uptime, score, grade, incidents, avgResolutionMin, avgLatencyMs — all present
//     in the current archive schema, so these populate on every run.
//   Optional fields: totalDowntimeMin, longestIncidentMin — NOT yet in the archive. When the
//     companion Worker PR lands, these populate the Incident Summary "Downtime" and "Longest"
//     columns; until then those cells render "—". The script is intentionally forward-compatible:
//     no bump required here once the Worker schema extends.
//
// Archive is written by the Worker cron at `0 0 1 * *` UTC (1st of following month).
// The script exits 3 if the archive is not yet ready; fallback to live data is NOT allowed
// because mixing current + historical values would silently corrupt the published report.
//
// Output: {YYYY-MM}/index.md with `published: false`. Human reviewer edits the narrative
// sections (Summary, Recommendations, Key Insight, Notable Incidents, Observations), toggles
// `published: true`, and merges the PR.

const fs = require('fs')
const path = require('path')
const summary = require('./generate-summary')
const charts = require('./generate-charts')  // trend core (aiwatch-reports#41)

// Mover-exclusion predicates now live in generate-charts.js (single source of truth) so the
// Notable Movers TABLE (here) and the trend CHART (charts.js CLI) exclude the SAME services
// (aiwatch-reports#67). Imported here; re-exported below so existing report.test.js callers work.
const { NO_INCIDENT_FEED, isStaleSource, isRecentlyAdded } = charts

const API_BASE = process.env.AIWATCH_API_BASE || 'https://aiwatch-worker.p2c2kbf.workers.dev'
const TEMPLATE_PATH = path.join(__dirname, '..', '_templates', 'monthly-report.md')
const OUT_DIR_ROOT = path.join(__dirname, '..')

// Services whose uptime is an estimate, not an official rolling-30-day metric read directly
// from a status page — either no published metric (industry-average assumption) or a
// poll/incident-derived figure. Marked "Estimate" in the Score table's Uptime Source column.
// (#29 — `bedrock` was previously missing here, so it leaked a stray "100.00%" row.)
//
// NOTE (aiwatch#586): the Official Uptime TABLE's VALUE now comes from the archive's per-service
// `officialUptime` field (the status-page rolling-30d figure) instead of the daily-counter `uptime`,
// which is what folds ChatGPT in with its real ~99% value (see `officialUptimeFor`). This set is
// STILL the table's exclusion guard, though: the worker emits a non-null `officialUptime` for the
// estimate-source members too (bedrock/azureopenai → synthetic 100), so without the guard #29's
// stray "100.00%" row would return. The set also drives the Score table's "Estimate"/"Official"
// label and the zero-incident framing.
const NO_PUBLIC_UPTIME = new Set([
  'bedrock', 'azureopenai', 'deepgram', 'gemini', 'mistral', 'perplexity', 'xai',
])

// (NO_INCIDENT_FEED / STALE_SOURCE / isStaleSource / isRecentlyAdded moved to generate-charts.js
// as the mover-exclusion single source of truth — aiwatch-reports#67; imported above.)

// Services without direct probe coverage (excluded from API Response Time ranking).
// Archive.avgLatencyMs will be null for these — tracked for explicit messaging.
const NO_PROBE = new Set(['bedrock', 'azureopenai', 'pinecone'])

// ── CLI parsing ──────────────────────────────────────────────────────
function parseCliMonth(argv) {
  const m = argv[2]
  if (!m || !/^\d{4}-\d{2}$/.test(m)) {
    console.error('Usage: node scripts/generate-report.js YYYY-MM')
    console.error('Example: node scripts/generate-report.js 2026-04')
    process.exit(2)
  }
  return m
}

// ── Data fetching ────────────────────────────────────────────────────
async function fetchJson(url, timeoutMs = 15_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return { status: res.status, body: res.ok ? await res.json() : null }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchArchive(month) {
  const url = `${API_BASE}/api/report?month=${month}`
  const { status, body } = await fetchJson(url)
  if (status === 404) {
    console.error(`[generate-report] Archive not ready for ${month}.`)
    console.error('Monthly archive cron runs on the 1st of the following month at 00:00 UTC.')
    console.error('Re-run after that time. No live-data fallback is provided by design — mixing')
    console.error('current + historical data would silently corrupt the report.')
    process.exit(3)
  }
  if (status !== 200 || !body || !body.services) {
    console.error(`[generate-report] Archive fetch failed: HTTP ${status}`)
    process.exit(4)
  }
  return body
}

async function fetchServiceMeta() {
  const { status, body } = await fetchJson(`${API_BASE}/api/v1/status`)
  if (status !== 200 || !body || !Array.isArray(body.services)) {
    console.error(`[generate-report] Service metadata fetch failed: HTTP ${status}`)
    process.exit(5)
  }
  const byId = {}
  for (const s of body.services) {
    byId[s.id] = { name: s.name, category: s.category, provider: s.provider }
  }
  return byId
}

// ── Formatting helpers ───────────────────────────────────────────────
function fmtPercent(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${Number(n).toFixed(2)}%`
}

function fmtMs(ms) {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—'
  return `${Math.round(ms)}ms`
}

function fmtDurationMin(mins) {
  if (mins === null || mins === undefined || mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function serviceName(id, meta) {
  return meta[id]?.name || id
}

// ── Ranking helpers ──────────────────────────────────────────────────
// Competition ranking: 100, 100, 99 → "1=", "1=", "3"
function competitionRank(items, valueFn) {
  const sorted = [...items].sort((a, b) => valueFn(b) - valueFn(a))
  const ranks = []
  let lastValue = Infinity
  let lastRank = 0
  sorted.forEach((item, idx) => {
    const v = valueFn(item)
    if (v < lastValue) {
      lastRank = idx + 1
      lastValue = v
    }
    ranks.push({ item, rank: lastRank })
  })
  // Mark ties: if two entries share a rank, annotate with "="
  const rankCount = ranks.reduce((acc, r) => {
    acc[r.rank] = (acc[r.rank] || 0) + 1
    return acc
  }, {})
  return ranks.map(r => ({
    ...r,
    rankLabel: rankCount[r.rank] > 1 ? `${r.rank}=` : `${r.rank}`,
  }))
}

// ── "Why" text generation for Score Ranking ──────────────────────────
// Formulaic — intentional. Human editors refine as needed.
function buildWhy(svc, id) {
  const { incidents, uptime, avgResolutionMin } = svc.data
  const pieces = []
  if (incidents === 0) {
    // Estimate-uptime service with zero incidents: there's no comparable 30-day % to cite,
    // and "Zero incidents, 100% uptime" would overstate what we can actually measure (#29).
    if (NO_PUBLIC_UPTIME.has(id)) return 'Zero incidents (no published 30-day uptime)'
    pieces.push('Zero incidents')
    if (uptime !== null && uptime !== undefined) pieces.push(`${Number(uptime).toFixed(2)}% uptime`)
  } else if (incidents === 1) {
    pieces.push('1 incident')
    if (avgResolutionMin) pieces.push(fmtDurationMin(avgResolutionMin))
  } else if (avgResolutionMin !== null && avgResolutionMin < 30) {
    pieces.push(`${incidents} incidents`)
    pieces.push(`fast recovery (avg ${fmtDurationMin(avgResolutionMin)})`)
  } else {
    pieces.push(`${incidents} incidents`)
    if (avgResolutionMin) pieces.push(`avg ${fmtDurationMin(avgResolutionMin)}`)
  }
  return pieces.join(', ')
}

// Grade → capitalized label
function gradeLabel(grade) {
  if (!grade) return '—'
  return grade.charAt(0).toUpperCase() + grade.slice(1)
}

// Confidence heuristic — High when uptime AND incident data are both present, Medium otherwise.
// NOTE: no longer shown in the Score table (#29 replaced that column with Uptime Source), but
// still used by the auto-draft analyzer (generate-summary) to pick high-confidence candidates
// for the Summary narrative (`r.Confidence === 'High'`). Kept for archiveToAnalysisRows.
function confidence(svc) {
  if (svc.data.uptime !== null && svc.data.incidents !== null) return 'High'
  return 'Medium'
}

// Uptime Source label for the Score table: Official (read directly from a status page) vs
// Estimate (no published 30-day metric; industry-average or poll-derived). #29 replaced the
// prior "Confidence" column here — it marked estimate-uptime services as "High" and hid that
// their score rests on an assumed uptime. ("Partial (Nd)" for mid-month additions stays a
// manual edit; not derivable from the archive yet.)
function uptimeSourceLabel(id) {
  return NO_PUBLIC_UPTIME.has(id) ? 'Estimate' : 'Official'
}

// Ranking-exclusion note (#29). NO_INCIDENT_FEED services have neither an accessible uptime
// metric nor a reliable incident feed, so they're dropped from the Score ranking and called
// out above the table. Returns '' when none are excluded (the marker then collapses).
// Joins display names with " and " for two, commas otherwise.
function joinNames(svcs, meta) {
  const names = svcs.map(s => serviceName(s.id, meta))
  return names.length === 2 ? names.join(' and ') : names.join(', ')
}

function buildRankingNote(services, meta, period) {
  const scored = services.filter(s => s.data.score !== null)
  const noFeed = scored.filter(s => NO_INCIDENT_FEED.has(s.id))
  // STALE_SOURCE that isn't already a no-feed service (avoid double-listing) — #591.
  const stale = scored.filter(s => isStaleSource(s) && !NO_INCIDENT_FEED.has(s.id))
  // reports#45 — recently-added (partial-month) services, excluding any already covered above.
  const recent = scored.filter(s => isRecentlyAdded(s, period) && !NO_INCIDENT_FEED.has(s.id) && !isStaleSource(s))
  if (noFeed.length === 0 && stale.length === 0 && recent.length === 0) return ''
  const ranked = scored.length - noFeed.length - stale.length - recent.length
  const clauses = []
  if (noFeed.length) {
    const verb = noFeed.length === 1 ? 'is' : 'are'
    clauses.push(`**${joinNames(noFeed, meta)} ${verb} excluded from this ranking** — neither publishes an accessible uptime metric, so their Score would otherwise inherit an industry-average assumption rather than a measured value, and AIWatch has no reliable incident feed for them (see "No incident feed" under [Incident Summary](#incident-summary))`)
  }
  if (stale.length) {
    const verb = stale.length === 1 ? 'is' : 'are'
    const poss = stale.length === 1 ? 'its' : 'their'
    clauses.push(`**${joinNames(stale, meta)} ${verb} excluded from this ranking** — ${poss} status source migrated to a platform AIWatch can't reach, so the incident feed is frozen and the Score would be inflated by an empty 30-day window (see "Stale source" under [Incident Summary](#incident-summary))`)
  }
  if (recent.length) {
    const verb = recent.length === 1 ? 'is' : 'are'
    const poss = recent.length === 1 ? 'it was' : 'they were'
    clauses.push(`**${joinNames(recent, meta)} ${verb} excluded from this ranking** — ${poss} added to AIWatch mid-month, so the partial-month Score rests on insufficient coverage; ${recent.length === 1 ? 'it rejoins' : 'they rejoin'} once a full month of data accrues`)
  }
  return `*${ranked} of ${scored.length} services ranked. ${clauses.join('. ')}.*`
}

// ── Table builders ───────────────────────────────────────────────────
function buildScoreTable(services, meta, period) {
  // Drop NO_INCIDENT_FEED services (no uptime metric + no reliable incidents), STALE_SOURCE services
  // (#591 — frozen feed inflates the Score from an empty window), and recently-added services
  // (reports#45 — partial-month coverage would rank off insufficient data) from the ranking; all are
  // surfaced in the ranking-exclusion note + the Incident Summary ("No incident feed" / "Stale source").
  const withScore = services.filter(s => s.data.score !== null && !NO_INCIDENT_FEED.has(s.id) && !isStaleSource(s) && !isRecentlyAdded(s, period))
  const ranked = competitionRank(withScore, s => s.data.score)
  const rows = ranked.map(r => {
    const s = r.item
    return `| ${r.rankLabel} | ${serviceName(s.id, meta)} | ${s.data.score} | ${gradeLabel(s.data.grade)} | ${uptimeSourceLabel(s.id)} | ${buildWhy(s, s.id)} |`
  })
  return [
    '| Rank | Service | Score | Grade | Uptime Source | Why |',
    '|---|---|---|---|---|---|',
    ...rows,
  ].join('\n')
}

// aiwatch#507 — caveat line for STALE_SOURCE services (frozen status feed). Pure + exported so the
// singular/plural agreement is unit-testable without mutating the maintained set. '' for empty input.
function buildStaleSourceCaveat(names) {
  if (!names.length) return ''
  const n = names.length
  const verb = n === 1 ? 'is' : 'are'
  return `**Stale source (${n} service${n === 1 ? '' : 's'}):** ${names.join(', ')} ${verb} served from a status page that migrated to a platform AIWatch can't reach server-side, so the feed is frozen at the last reachable fetch. The incident count, uptime, and Score reflect only data up to that cutoff — not the full month — so treat the figures as a floor, not a verified picture.`
}

function buildIncidentTable(services, meta) {
  const withIncidents = services.filter(s => s.data.incidents > 0)
  withIncidents.sort((a, b) => b.data.incidents - a.data.incidents)

  const rows = withIncidents.map(s => {
    const inc = s.data.incidents
    const avg = fmtDurationMin(s.data.avgResolutionMin)
    const total = fmtDurationMin(s.data.totalDowntimeMin ?? null)
    const longest = fmtDurationMin(s.data.longestIncidentMin ?? null)
    const totalWithLongest = total === '—' ? '—' : `${total}${longest !== '—' ? ` (${longest})` : ''}`
    return `<tr><td>${serviceName(s.id, meta)}</td><td>${inc}</td><td>${totalWithLongest}</td><td class="hide-mobile">${longest}</td><td class="hide-mobile">${avg}</td></tr>`
  })

  // Zero-incident services split (#29): a "confirmed zero" needs a real, CURRENT incident feed.
  // Estimate-uptime services (NO_PUBLIC_UPTIME) with zero incidents are coverage-limited —
  // a blank count reflects what AIWatch can see, not verified incident-free operation. STALE_SOURCE
  // services (aiwatch#507) are also excluded from "confirmed": their feed is frozen, so a zero count
  // is "nothing since the cutoff," not a verified incident-free month.
  // Use isStaleSource (flag-OR-constant) — not the raw STALE_SOURCE constant — so a service marked
  // stale by the archive's incidentSourceStale flag is handled even though the constant is now empty
  // (aiwatch#618 emptied it; the May 2026 archive still carries the flag).
  const zero = services.filter(s => s.data.incidents === 0)
  const confirmed = zero
    .filter(s => !NO_PUBLIC_UPTIME.has(s.id) && !isStaleSource(s))
    .map(s => serviceName(s.id, meta))
  // Stale sources are excluded from noFeed too (defensive — a future stale service that also lacks a
  // public uptime feed must get the more-specific Stale-source line, not a double caveat).
  const noFeed = zero
    .filter(s => NO_PUBLIC_UPTIME.has(s.id) && !isStaleSource(s))
    .map(s => serviceName(s.id, meta))
  const zeroLines = []
  if (confirmed.length) {
    zeroLines.push(`**Zero incidents (${confirmed.length} services):** ${confirmed.join(', ')} — confirmed via their status-page incident feeds.`)
  }
  if (noFeed.length) {
    zeroLines.push(`**No incident feed (${noFeed.length} services):** ${noFeed.join(', ')} — AIWatch has no reliable incident feed for these (RSS / estimate-only), so a blank incident count reflects monitoring coverage, not verified incident-free operation.`)
  }
  // Stale-source caveat (aiwatch#507) — rendered whenever a stale service is in the report (by the
  // archive's incidentSourceStale flag or the STALE_SOURCE constant), regardless of incident count:
  // a frozen feed means count + uptime + Score are not current. Driven by isStaleSource, not the raw
  // constant, so it survives the aiwatch#618 emptying of STALE_SOURCE (the May archive's flag still fires).
  const staleLine = buildStaleSourceCaveat(services.filter(s => isStaleSource(s)).map(s => serviceName(s.id, meta)))
  if (staleLine) zeroLines.push(staleLine)
  const zeroIncLine = zeroLines.join('\n\n')

  return {
    tableRows: rows.join('\n'),
    zeroIncLine,
  }
}

// #586 — resolve the value the "Official Uptime" table should display for a service: the
// STATUS-PAGE rolling-30d figure (`officialUptime`), NOT the daily-counter `uptime` that feeds the
// Score. Returns null when the service has no comparable published metric (→ omitted from the table).
//   • NO_PUBLIC_UPTIME services are ALWAYS omitted (both paths). The worker emits a non-null
//     `officialUptime` for the estimate-source ones too (bedrock/azureopenai carry a synthetic
//     `uptime30d` of 100 — `services.ts` estimate source), which would otherwise leak the stray
//     "100.00%" row #29 removed; gemini/mistral/perplexity/xai/deepgram already carry null. Gating
//     on the maintained set (not `uptimeSource`) is deliberate: ChatGPT is ALSO `uptimeSource:
//     'estimate'` but is NOT in the set, so it stays IN the table with its real ~99% figure.
//   • New archives (≥2026-06) carry `officialUptime` explicitly: a number shows, null omits. This
//     is what folds ChatGPT in — its daily-counter `uptime` is pessimistic (multi-component status
//     marks it degraded whenever any sub-component has an incident, e.g. 72.78% in May), but its
//     status-page `officialUptime` (~99%) is the real comparable figure.
//   • Legacy archives (≤2026-05) lack the field (undefined) → fall back to the daily-counter
//     `uptime`, but still suppress chatgpt (whose legacy `uptime` is the known-bad value this issue
//     exists to hide), preserving the pre-#586 table + the manual May fixup on regeneration.
function officialUptimeFor(s) {
  if (NO_PUBLIC_UPTIME.has(s.id)) return null
  const o = s.data.officialUptime
  if (o !== undefined) return o
  if (s.id === 'chatgpt') return null
  return s.data.uptime ?? null
}

function buildUptimeTable(services, meta) {
  const withUptime = services
    .map(s => ({ s, uptime: officialUptimeFor(s) }))
    .filter(x => x.uptime !== null && x.uptime !== undefined)
  withUptime.sort((a, b) => b.uptime - a.uptime)
  return withUptime.map(x =>
    `<tr><td>${serviceName(x.s.id, meta)}</td><td>${fmtPercent(x.uptime)}</td></tr>`,
  ).join('\n')
}

// ── Security section (refs aiwatch#290 / aiwatch#291) ───────────────
//
// Schema: archive.security shape from MonthlySecuritySummary in worker/src/monthly-archive.ts:
//   { totalAlerts, bySource: { osv, hackernews }, bySeverity: { critical, high, medium, low },
//     byService: { [serviceName]: count },
//     topFindings: { title, url, source, severity?, service?, detectedAt, timeline? }[] }
// `timeline` only present on OSV findings whose security:timeline:osv:{id} key existed at
// archive build time (#291). HN findings never carry a timeline.
//
// Returns the full markdown block (heading included) or '' when there's nothing to surface.

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low']

function fmtIso(d) {
  if (!d) return '—'
  // Sanitize: only emit a recognizable YYYY-MM-DD prefix. Falling through to `String(d)` would
  // leak unescaped pipes / newlines into a markdown table cell on a malformed `at` field.
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(d))
  return m ? m[1] : '—'
}

function buildBySourceTable(bySource) {
  const rows = []
  if (bySource.osv > 0) rows.push(`| OSV.dev | ${bySource.osv} |`)
  if (bySource.hackernews > 0) rows.push(`| Hacker News | ${bySource.hackernews} |`)
  if (rows.length === 0) return ''
  return ['| Source | Count |', '|---|---|', ...rows].join('\n')
}

function buildBySeverityTable(bySeverity) {
  // Always render all four buckets — readers can scan severity at a glance even when zero.
  const headers = SEVERITY_ORDER.map(s => s.charAt(0).toUpperCase() + s.slice(1))
  const counts = SEVERITY_ORDER.map(s => bySeverity[s] ?? 0)
  if (counts.every(c => c === 0)) return ''
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    `| ${counts.join(' | ')} |`,
  ].join('\n')
}

function buildByServiceTable(byService, limit = 5) {
  const entries = Object.entries(byService || {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
  if (entries.length === 0) return ''
  const rows = entries.map(([name, count]) => `| ${name} | ${count} |`)
  return ['| Service | Count |', '|---|---|', ...rows].join('\n')
}

function buildTimelineDetails(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return ''
  const rows = timeline.map(e =>
    `| ${e.stage ?? '—'} | ${fmtIso(e.at)} | ${e.severity ?? '—'} | ${e.fixedVersion ?? '—'} |`,
  )
  return [
    '<details markdown="1">',
    '<summary>Timeline</summary>',
    '',
    '| Stage | At (UTC) | Severity | Fix Version |',
    '|---|---|---|---|',
    ...rows,
    '',
    '</details>',
  ].join('\n')
}

function buildTopFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return ''
  const sections = findings.map((f, i) => {
    const sev = f.severity ? `\`${f.severity}\`` : '`unrated`'
    const sourceLabel = f.source === 'osv' ? 'OSV.dev' : f.source === 'hackernews' ? 'Hacker News' : f.source
    const titleLink = f.url ? `[${f.title}](${f.url})` : f.title
    const heading = `#### ${i + 1}. ${titleLink} · ${sev}`
    const meta = [
      `- **Source:** ${sourceLabel}`,
      `- **Detected:** ${fmtIso(f.detectedAt)}`,
    ]
    if (f.service) meta.splice(1, 0, `- **Affected:** ${f.service}`)
    const timelineBlock = f.source === 'osv' ? buildTimelineDetails(f.timeline) : ''
    return [heading, '', meta.join('\n'), timelineBlock].filter(Boolean).join('\n')
  })
  return ['### Top Findings', '', ...sections].join('\n\n')
}

function buildSecuritySection(security) {
  // Schema-aligned fast paths — surface nothing when there's nothing to report.
  if (!security) return ''
  // Distinguish "no alerts this month" from "malformed archive". The worker writer
  // (summarizeSecurityAlerts) always sets totalAlerts; if it's missing while other fields
  // are populated, log so build-time CI / operators notice rather than silently dropping.
  if (typeof security.totalAlerts !== 'number') {
    if (security.topFindings?.length || security.bySource || security.bySeverity) {
      console.warn('[security] archive present but totalAlerts missing — section omitted')
    }
    return ''
  }
  if (security.totalAlerts <= 0) return ''

  const parts = [
    '## Security Alerts',
    '',
    `> **Note:** Security alerts captured during the month from OSV.dev (AI SDK package vulnerabilities) and Hacker News (security posts mentioning monitored services). Section omitted for months without detections.`,
    '',
    `**Total alerts:** ${security.totalAlerts}`,
    '',
  ]

  const bySrc = buildBySourceTable(security.bySource || { osv: 0, hackernews: 0 })
  if (bySrc) parts.push('**By source**', '', bySrc, '')

  const bySev = buildBySeverityTable(security.bySeverity || {})
  if (bySev) parts.push('**By severity**', '', bySev, '')

  const bySvc = buildByServiceTable(security.byService || {})
  if (bySvc) parts.push('**Most affected services**', '', bySvc, '')

  const top = buildTopFindings(security.topFindings || [])
  if (top) parts.push(top, '')

  parts.push('---', '')
  return parts.join('\n')
}

// ── Detection & RTT Degradation section (#28) ────────────────────────
// Auto-renders the "## Detection & RTT Degradation" section from the archive's `degradation`
// (RTT degradation rising edges, aiwatch#511/#512) and `detectionLead` (rare probe-first leads,
// aiwatch#369). The whole section is OMITTED when neither exists — the common case for months
// ≤ 2026-05 (no accumulator) and any month with no data — matching what 2026-04/2026-05 did by
// hand. Emits its own trailing `---` (like buildSecuritySection) so the marker carries no
// separator in the template. The #464 framing is fixed: detection latency (MTTD) + RTT
// degradation, NOT any "faster than the official status page" headline.
const DETECTION_LEAD_MIN_SAMPLE = 5  // mirrors worker MIN_LEAD_SAMPLE_SIZE / canPresentLeadAverage

function fmtUtcMinute(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`
}

function fmtLeadMin(ms) {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—'
  return `${Math.round(ms / 60000)}m`
}

function buildDetectionSection(archive, meta) {
  const deg = archive && archive.degradation
  const lead = archive && archive.detectionLead
  const hasDeg = deg && typeof deg.total === 'number' && deg.total > 0
  const examples = lead && Array.isArray(lead.topExamples) ? lead.topExamples : []
  const hasLeads = examples.length > 0
  if (!hasDeg && !hasLeads) return ''

  const parts = [
    '## Detection & RTT Degradation',
    '',
    '### Detection Latency',
    '',
    "AIWatch independently detects incidents and alerts within **~5 minutes** — the probe/poll cadence, the upper bound on how long an issue can go unnoticed by our monitoring. This is independent, low-latency awareness across all monitored services, not a timing comparison against any provider's status page.",
    '',
  ]

  if (hasDeg) {
    const byService = deg.byService || {}
    const noStatus = deg.noStatusByService || {}
    const ids = Object.keys(byService).sort((a, b) => (byService[b] || 0) - (byService[a] || 0))
    parts.push(
      '### RTT Degradation Detection',
      '',
      `AIWatch's direct RTT probes flagged **${deg.total}** latency degradations this month, of which **${deg.noStatusTotal ?? 0}** were **not reflected on the providers' official status pages** — slowdowns status pages typically don't report, only hard outages.`,
      '',
    )
    // Only emit the table when there's a per-service breakdown — a total>0 with an empty
    // byService (shouldn't happen with real worker data) would otherwise render a bodyless table.
    if (ids.length) {
      parts.push(
        '| Service | RTT Degradations | Not on Status Page |',
        '|---|---|---|',
        ...ids.map(id => `| ${serviceName(id, meta)} | ${byService[id] || 0} | ${noStatus[id] || 0} |`),
        '',
      )
    }
    parts.push(
      "> **RTT degradation detection** is AIWatch's differentiator: synthetic probes measure real latency degradation that official status pages (which report hard-down, not slowness) often omit entirely.",
      '',
    )
  }

  if (hasLeads) {
    parts.push(
      '### Early RTT Detections',
      '',
      '| Incident | Service | Probe Flagged (UTC) | Official Update (UTC) | Earlier By |',
      '|---|---|---|---|---|',
      ...examples.map(e => {
        const official = (e.detectedAt && typeof e.leadMs === 'number' && !Number.isNaN(new Date(e.detectedAt).getTime()))
          ? fmtUtcMinute(new Date(new Date(e.detectedAt).getTime() + e.leadMs).toISOString())
          : '—'
        return `| ${e.incId || '—'} | ${serviceName(e.svcId, meta)} | ${fmtUtcMinute(e.detectedAt)} | ${official} | ${fmtLeadMin(e.leadMs)} |`
      }),
      '',
    )
    // Averaged figure only above the sample-size gate (#464) — below it, show per-event rows only.
    if (typeof lead.count === 'number' && lead.count >= DETECTION_LEAD_MIN_SAMPLE && typeof lead.avgLeadMs === 'number') {
      parts.push(`**Average early detection**: ${fmtLeadMin(lead.avgLeadMs)} (across ${lead.count} events)`, '')
    }
    parts.push(
      '> Occasional cases where AIWatch\'s RTT probe flagged degradation before the official status update. Rare by design — the headline metrics are detection latency and degradation detection above, not a "faster than official" average.',
      '',
    )
  }

  parts.push('---', '')
  return parts.join('\n')
}

// Auto-renders the "## N-Month Trend" section (aiwatch#637 quick-win / aiwatch-reports#41).
// Turns the snapshot into a directional signal. The CURRENT month comes from the
// freshly-fetched `archive`; PRIOR months from the committed `_data/{YYYY-MM}.json`
// snapshots (immutable history). Emits its own trailing `---` (like buildSecuritySection /
// buildDetectionSection) when ≥2 months exist AND at least one mover is found; otherwise
// returns '' (a lone first month, or a flat board, has no trend to show). The actual
// slope chart SVG is written by generate-charts.js under the same ≥2-month gate, so the
// `![](trend-chart.svg)` ref below never dangles. The multi-month math lives in
// generate-charts.js (buildTrendSeries / computeScoreMovers) — pure + unit-tested there.
// #605 Phase 3b — "Component Reliability" table: the WEAKEST curated component per multi-component
// service (archive.services[id].components — per-component monthly uptime, least-reliable-first,
// curated to the display set by aiwatch#605 Phase 3a). One row per service whose weakest surface is
// < COMPONENT_WEAK_THRESHOLD (signal-rich — skip all-healthy services), sorted weakest-first. The
// AIWatch differentiator: no competitor publishes a monthly per-component uptime ranking. EN-only,
// like the other data tables. Returns '' (section omitted) when nothing qualifies. Pure + tested.
const COMPONENT_WEAK_THRESHOLD = 99.9
function buildComponentReliabilitySection(archive, meta) {
  const services = archive && archive.services
  if (!services || typeof services !== 'object') return ''
  const rows = []
  for (const [id, s] of Object.entries(services)) {
    const comps = s && Array.isArray(s.components) ? s.components : null
    if (!comps || comps.length < 2) continue // curation already ≥2; defensive
    const weakest = comps[0] // least-reliable-first
    // Number.isFinite (not typeof===number): a NaN uptime is typeof number and NaN>=99.9 is false,
    // so it would slip through and render "NaN%" + poison the weakest-first sort comparator.
    if (!weakest || !Number.isFinite(weakest.uptime) || weakest.uptime >= COMPONENT_WEAK_THRESHOLD) continue
    rows.push({ name: serviceName(id, meta), comp: weakest.name, uptime: weakest.uptime, count: comps.length })
  }
  if (rows.length === 0) return ''
  rows.sort((a, b) => a.uptime - b.uptime || a.name.localeCompare(b.name))
  const cell = (s) => String(s).replace(/\|/g, '\\|') // a component name with a literal | can't break the row
  return [
    '## Component Reliability',
    '',
    "> AIWatch is the only monitor publishing a **monthly per-component uptime ranking**. This surfaces each multi-surface service's weakest component this month — the surface most likely to be your bottleneck, which a single service-level uptime number hides.",
    '',
    '| Service | Weakest Component | Uptime | Components |',
    '|---|---|---|---|',
    ...rows.map(r => `| ${cell(r.name)} | ${cell(r.comp)} | ${r.uptime.toFixed(2)}% | ${r.count} |`),
    '',
    '---',
  ].join('\n')
}

function buildTrendSection(month, archive, meta, dataDir = path.join(__dirname, '..', '_data')) {
  const currentEntry = charts.toMonthEntry(month, archive)
  if (!currentEntry) return ''
  const entries = charts.loadTrendEntries(month, currentEntry, { dataDir })
  if (entries.length < 2) return ''

  const trend = charts.buildTrendSeries(entries)
  // Exclude the services the Score ranking itself excludes (NO_INCIDENT_FEED + stale source,
  // per buildScoreTable / the #29 note) so a trend mover never contradicts a report that
  // elsewhere states it does not rank that service. Estimate-only bedrock/azureopenai scores
  // CAN move month-to-month, so this isn't hypothetical. Keyed off the CURRENT month's archive.
  const exclude = charts.buildMoverExclude(archive.services, month)

  const movers = charts.computeScoreMovers(trend, { nameFor: id => serviceName(id, meta), exclude })
  if (!movers.declining.length && !movers.improving.length) return ''

  const notable = charts.computeNotableMovers(trend, { nameFor: id => serviceName(id, meta), exclude })

  const span = entries.length
  const parts = [
    `## ${span}-Month Trend`,
    '',
    `AIWatch Score direction over the last ${span} months (${entries[0].month} → ${month}). The chart shows the composite-Score direction for every service; **Notable Movers** below decompose the biggest changes into the incident-measured metrics that actually drive a "keep relying on this?" decision — recovery time (MTTR) and total downtime — since a flat Score can hide a recovery-time regression.`,
    '',
    `![AIWatch Score ${span}-month trend](../assets/${month}/trend-chart.svg)`,
    '',
  ]

  if (notable.length) {
    parts.push('### Notable Movers', '')
    // Make the selection rule + the arrow semantics explicit (readers shouldn't have to guess
    // why these N appear): ranked by the single largest change across Score / MTTR / downtime,
    // the bold metric is that change, and 🔺/🔻 track that headline metric — not Score.
    parts.push(
      `*The ${notable.length} services whose **Score, recovery time (MTTR), or total downtime** changed most over the window (ranked by the largest single change, not a fixed threshold). The metric in **bold** is the change that ranked each service here; 🔺 / 🔻 mark whether that headline metric improved or worsened — so a service can show a small Score gain yet land here, and read 🔻, because its downtime regressed.*`,
      '',
    )
    parts.push(...notable.map(m => fmtMoverLine(m)))
    parts.push('')
  }

  if (trend.partialMonths.size) {
    parts.push(
      `> **Partial month**: ${[...trend.partialMonths].join(', ')} had fewer than a full month of monitoring — its point is indicative, not a full-month comparison. MTTR / downtime show "—" for any month a service recorded zero incidents.`,
      '',
    )
  }
  parts.push('---', '')
  return parts.join('\n')
}

// Signed duration delta (MTTR / downtime): "+5h 12m" / "−18m" / "±0".
function fmtDurationDelta(mins) {
  if (mins === null || mins === undefined || Number.isNaN(mins)) return ''
  if (mins === 0) return '±0'
  return `${mins > 0 ? '+' : '−'}${fmtDurationMin(Math.abs(mins))}`
}

// One Notable-Movers bullet: direction marker + name, then Score · MTTR · Downtime with the
// axis that moved most bolded. A null endpoint (a zero-incident month has no MTTR/downtime)
// renders the segment as "—". Uptime is intentionally absent (see computeNotableMovers).
function fmtMoverLine(m) {
  const arrow = m.declining ? '🔻' : '🔺'
  const segs = []

  let s = `Score ${m.score.first} → ${m.score.last} (${charts.fmtScoreDelta(m.score.delta)})`
  if (m.emphasize === 'score') s = `**${s}**`
  segs.push(s)

  // MTTR / downtime measured over the months that have data (first-present → last-present):
  //  • never recorded   → "—"
  //  • one month of data → single value (no redundant arrow)
  //  • ≥2 months        → "X → Y (Δ)"
  // Assumes a zero-incident month is null (not 0) in the archive — per toMonthEntry, MTTR/downtime
  // are read only when typeof === 'number', and the archive emits null (not 0) for no incidents. If
  // a future archive ever emits a literal 0, fmtDurationMin maps it to "—" too, so it still reads as
  // "no incidents" rather than a misleading "0m" — safe either way.
  const span = (o) => {
    if (o.first === null && o.last === null) return '—'
    if (o.delta === null) return fmtDurationMin(o.last)
    return `${fmtDurationMin(o.first)} → ${fmtDurationMin(o.last)} (${fmtDurationDelta(o.delta)})`
  }
  let t = `MTTR ${span(m.mttr)}`
  if (m.emphasize === 'mttr') t = `**${t}**`
  segs.push(t)

  let d = `downtime ${span(m.downtime)}`
  if (m.emphasize === 'downtime') d = `**${d}**`
  segs.push(d)

  return `- ${arrow} **${m.name}** — ${segs.join(' · ')}`
}

function buildLatencyTable(services, meta) {
  const withLatency = services.filter(s => s.data.avgLatencyMs !== null && !NO_PROBE.has(s.id))
  // Competition rank with ascending sort: negate avgLatencyMs so competitionRank's
  // descending comparator yields "faster = higher rank" and ties get "N=" suffix.
  const ranked = competitionRank(withLatency, s => -s.data.avgLatencyMs)

  // Only p75 (avgLatencyMs) exists in the archive today. The p95 / Spikes / vs-Last-Month
  // columns were dropped (#17) — they rendered as a literal "—" in every cell, every month.
  // To re-enable a column: add its field to MonthlyServiceData in the aiwatch worker
  // (worker/src/monthly-archive.ts), surface it via /api/report, then append it here:
  //   p95 (ms)      ← s.data.p95LatencyMs
  //   Spikes        ← s.data.latencySpikes
  //   vs Last Month ← delta from s.data.prevMonthLatencyMs (or read the prior archive)
  const header = [
    '| Rank | Service | p75 (ms) |',
    '|---|---|---|',
  ]
  const rows = ranked.map(r =>
    `| ${r.rankLabel} | ${serviceName(r.item.id, meta)} | ${Math.round(r.item.data.avgLatencyMs)} |`,
  )
  return [...header, ...rows].join('\n')
}

// ── Template filling ─────────────────────────────────────────────────
function monthName(month) {
  const [, mm] = month.split('-').map(Number)
  const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return names[mm]
}

function lastDayOfMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function nextMonthName(month) {
  const [y, m] = month.split('-').map(Number)
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return { name: monthName(`${nextY}-${String(nextM).padStart(2, '0')}`), year: nextY }
}

function todayUtc() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

// Replace an empty table body (single row of empty <td> or `| |` cells) with generated rows.
// The template's placeholder rows look like `<tr><td></td>...</tr>` or `| 1 | | ... | |`.
function replaceTableBody(template, sectionHeading, replacement) {
  const lines = template.split('\n')
  const headIdx = lines.findIndex(l => l.trim().startsWith(`## ${sectionHeading}`))
  if (headIdx === -1) return template

  // Bound the search to this section only — the next `## ` marks the section boundary.
  // Without this, `findIndex` would cross into the next section's table, e.g., the
  // AIWatch Score (markdown) lookup could hit Incident Summary's <tbody> further down.
  const nextHead = lines.findIndex((l, i) => i > headIdx && l.trim().startsWith('## '))
  const sectionEnd = nextHead === -1 ? lines.length : nextHead

  // Prefer HTML <tbody>…</tbody> when present in this section.
  const htmlTbodyStart = lines.findIndex((l, i) => i > headIdx && i < sectionEnd && l.includes('<tbody>'))
  const htmlTbodyEnd = lines.findIndex((l, i) => i > headIdx && i < sectionEnd && l.includes('</tbody>'))
  if (htmlTbodyStart !== -1 && htmlTbodyEnd !== -1) {
    return [
      ...lines.slice(0, htmlTbodyStart + 1),
      replacement,
      ...lines.slice(htmlTbodyEnd),
    ].join('\n')
  }

  // Fall back to markdown `| Rank |` table within this section.
  const mdHeader = lines.findIndex((l, i) => i > headIdx && i < sectionEnd && l.trim().startsWith('| Rank |'))
  if (mdHeader !== -1) {
    let end = mdHeader + 2  // skip header + separator
    while (end < sectionEnd && lines[end].trim().startsWith('|')) end++
    return [
      ...lines.slice(0, mdHeader),
      replacement,
      ...lines.slice(end),
    ].join('\n')
  }

  return template
}

function fillTemplate(template, month, archive, meta) {
  const [year] = month.split('-').map(Number)
  const mName = monthName(month)
  const lastDay = lastDayOfMonth(month)
  const publishDate = todayUtc()
  // Published-month is deterministic: always the month immediately following the
  // report period (April report → Published: May). Deriving this from today's date
  // would re-stamp the header on catch-up re-runs (e.g. June re-generating April's
  // draft would claim "Published: June") — misleading to readers.
  const nxt = nextMonthName(month)
  const publishMonth = nxt.name

  // Extract service array from archive
  const services = Object.entries(archive.services).map(([id, data]) => ({ id, data }))

  // Build tables
  const scoreTable = buildScoreTable(services, meta, month)
  const rankingNote = buildRankingNote(services, meta, month)
  const { tableRows: incidentRows, zeroIncLine } = buildIncidentTable(services, meta)
  const uptimeRows = buildUptimeTable(services, meta)
  const latencyTable = buildLatencyTable(services, meta)

  let out = template

  // Header/frontmatter replacements
  out = out.replace(/\[MON\]/g, mName)
  out = out.replace(/\[MONTH\]/g, mName)
  out = out.replace(/\[YEAR\]/g, String(year))
  out = out.replace(/\[YYYY-MM-DD\]/g, publishDate)
  out = out.replace(/\[YYYY-MM\]/g, month)
  out = out.replace(/\[LAST_DAY\]/g, String(lastDay))
  out = out.replace(/\[PUBLISH_MONTH\]/g, publishMonth)
  out = out.replace(/\[NEXT_MONTH\]/g, nxt.name)

  // Draft — human reviewer flips to true before merge
  out = out.replace(/^published: true$/m, 'published: false')

  // Tables
  out = replaceTableBody(out, 'AIWatch Score', scoreTable)
  // Ranking-exclusion note (#29) — sits above the Score table; collapse the marker when
  // nothing is excluded so no stray blank line / double rule is left behind.
  if (rankingNote) {
    out = out.replace(/<!-- SCORE_RANKING_NOTE -->/, rankingNote)
  } else {
    out = out.replace(/\n*<!-- SCORE_RANKING_NOTE -->\n*/, '\n\n')
  }
  out = replaceTableBody(out, 'API Response Time', latencyTable)
  // Incident Summary + Official Uptime use HTML <tbody>
  out = replaceTableBody(out, 'Incident Summary', incidentRows)
  out = replaceTableBody(out, 'Official Uptime', uptimeRows)

  // Zero-incidents line — replace the placeholder comment
  out = out.replace(
    /\*\*Zero incidents \(N services\):\*\* <!-- List services with zero incidents inline -->/,
    zeroIncLine,
  )

  // Security section — the template carries `<!-- SECURITY_SECTION -->` plus a one-line
  // "do not hand-author" comment, placed right after the Observations `---` separator (and
  // with NO `---` of its own after it). buildSecuritySection emits the whole "## Security
  // Alerts" section *ending in its own trailing `---`* when archive.security has detections;
  // when empty it emits nothing, so we strip the marker + comment and let the preceding `---`
  // stand as the single separator before About. The `(?:---\n*)?` is a guard only — it would
  // absorb a literal `---` if one were ever placed after the marker (none is today).
  const securityBlock = buildSecuritySection(archive.security)
  if (securityBlock) {
    out = out.replace(/<!-- SECURITY_SECTION -->(?:\n*<!--[\s\S]*?-->)?/, securityBlock)
  } else {
    out = out.replace(/\n*<!-- SECURITY_SECTION -->(?:\n*<!--[\s\S]*?-->)?\n*(?:---\n*)?/, '\n\n')
  }

  // Detection & RTT Degradation section (#28) — same pattern as security: buildDetectionSection
  // emits the whole section (ending in its own `---`) when there's degradation/detectionLead
  // data, else nothing. When omitted, strip the marker + its one-line explainer comment AND the
  // trailing `---` so the preceding API-Response `---` stands as the single separator.
  const detectionSection = buildDetectionSection(archive, meta)
  if (detectionSection) {
    out = out.replace(/<!-- DETECTION_SECTION -->(?:\n*<!--[\s\S]*?-->)?/, detectionSection)
  } else {
    out = out.replace(/\n*<!-- DETECTION_SECTION -->(?:\n*<!--[\s\S]*?-->)?\n*(?:---\n*)?/, '\n\n')
  }

  // 3-Month Trend section (aiwatch-reports#41) — same marker pattern as security/detection:
  // buildTrendSection emits the whole section (ending in its own `---`) when ≥2 months of
  // archive history exist and there's a mover, else nothing. When omitted, strip the marker +
  // its explainer comment AND the trailing `---` so the preceding `---` stays the single rule.
  const trendSection = buildTrendSection(month, archive, meta)
  if (trendSection) {
    out = out.replace(/<!-- TREND_SECTION -->(?:\n*<!--[\s\S]*?-->)?/, trendSection)
  } else {
    out = out.replace(/\n*<!-- TREND_SECTION -->(?:\n*<!--[\s\S]*?-->)?\n*(?:---\n*)?/, '\n\n')
  }

  // Component Reliability section (aiwatch#605 Phase 3b) — same marker pattern. The section
  // emits its own trailing `---`; when omitted, strip the marker so the preceding Official
  // Uptime `---` stays the single rule before API Response Time.
  const componentSection = buildComponentReliabilitySection(archive, meta)
  if (componentSection) {
    out = out.replace(/<!-- COMPONENT_RELIABILITY_SECTION -->/, componentSection)
  } else {
    out = out.replace(/\n*<!-- COMPONENT_RELIABILITY_SECTION -->\n*/, '\n\n')
  }

  return out
}

// ── Auto-draft narrative injection (refs aiwatch-reports#4) ──────────
//
// Closes the last "operator runs a local script and copy-pastes the output" gap
// in the Phase 1 pipeline. We reuse generate-summary.js's analyzer as a library,
// but feed it row-shape data derived DIRECTLY from `archive.services` rather
// than re-parsing the just-rendered markdown tables. Why direct: buildIncidentTable
// emits ONLY services with `incidents > 0` (zero-incident services are surfaced
// separately on a `**Zero incidents (N services):** …` prose line). If we re-parsed,
// the analyzer's `totalServices` and `zeroIncidents` counts would collapse to the
// incident-bearing subset and the Opening would report things like "0 services
// recorded zero incidents" on a calm month — silently wrong.
//
// Output placement:
//
//   • Opening narrative replaces the `<!-- Opening narrative ... -->` placeholder
//     in Key Insight — it's a single-paragraph summary that fits that slot 1:1.
//
//   • TL;DR (multiline: 4 bullets + Recommendations subsection + Recovery line)
//     is wrapped in a BEGIN/END HTML-comment fence and inserted right after the
//     `## Summary` heading, BEFORE the existing placeholder bullets. The operator
//     sees the auto-draft in the PR diff, adapts what they want into the bullets
//     below, then DELETES the fenced block before merge. The placeholder bullets
//     are left untouched so the operator's final form-factor never depends on
//     our generator's bullet labels matching the template's.
//
// Failure mode: if `archive.services` is empty/missing or the analyzer throws,
// we LOG and CONTINUE with the un-injected draft. The deterministic data pipeline
// (Score/Incident/Uptime/Latency tables + Security section) is the critical path;
// the narrative draft is a nice-to-have on top. Failing the workflow over a
// narrative-generation hiccup would block the data the operator does need.

// Synthesize analyzer-compatible row shapes from raw archive data. Mirrors the
// vocabulary that generate-summary.analyze() expects (see its `parseTable()`
// output keys), so the analyzer can't tell apart these rows from CLI-parsed
// ones. Including services without incidents lets `zeroIncidents.length` and
// `totalServices` reflect reality rather than the filtered table.
function archiveToAnalysisRows(archive, meta) {
  const scores = []
  const incidents = []
  for (const [id, data] of Object.entries(archive.services || {})) {
    const name = meta[id]?.name || id
    if (data.score !== null && data.score !== undefined) {
      scores.push({
        Service: name,
        Score: String(data.score),
        Grade: gradeLabel(data.grade),
        Confidence: confidence({ data }),
      })
    }
    incidents.push({
      Service: name,
      Incidents: String(data.incidents ?? 0),
      'Total Downtime': fmtDurationMin(data.totalDowntimeMin ?? null),
      'Avg Resolution': fmtDurationMin(data.avgResolutionMin ?? null),
    })
  }
  scores.sort((a, b) => parseInt(b.Score) - parseInt(a.Score))
  return { scores, incidents }
}

const SUMMARY_OPEN_MARKER = '<!-- BEGIN AUTO-DRAFT — review, then DELETE this entire block before merge -->'
const SUMMARY_CLOSE_MARKER = '<!-- END AUTO-DRAFT -->'

function injectAutoDraft(filled, opening, tldr) {
  let out = filled

  // 1. Key Insight: replace the opening-narrative comment with the generated text.
  //    The placeholder is verbatim from _templates/monthly-report.md — if a future
  //    template tweak changes the wording, the regex misses and Key Insight just
  //    keeps its placeholder. That's a soft-fail (visible in PR review) rather
  //    than a silent corruption. Naturally idempotent: a second call finds no
  //    placeholder and is a no-op.
  out = out.replace(
    /<!-- Opening narrative: 1 sentence summarizing the month, then 3 patterns -->/,
    opening,
  )

  // 2. Summary: insert the fenced auto-draft block right after the heading.
  //    Idempotent guard — if the document already carries an open marker, skip
  //    re-injection. CI's force-with-lease + branch reset (generate-report.yml)
  //    makes the double-call path unreachable in practice, but the guard pins
  //    "operator re-runs generate-report.js locally on an injected PR branch"
  //    to a no-op rather than stacking two fences.
  if (out.includes(SUMMARY_OPEN_MARKER)) return out

  //    Using `^## Summary$` with the `m` flag instead of a broader regex so we
  //    don't accidentally splice into any other heading that happens to contain
  //    the word "Summary" (e.g. `## Incident Summary` is the next ## section
  //    further down the page — we must NOT touch it).
  const draftBlock = [
    '',
    SUMMARY_OPEN_MARKER,
    '_Auto-generated narrative draft — English only; translate for the KO `<details>` block below._',
    '',
    tldr,
    '',
    SUMMARY_CLOSE_MARKER,
  ].join('\n')

  out = out.replace(/^## Summary$/m, `## Summary${draftBlock}`)

  return out
}

// Extracted helper that wraps the full auto-draft path (archive→rows→analyze→inject)
// behind a single seam. Lets tests exercise both the happy path AND the catch arm
// (by passing a stub `summaryMod` whose `analyze` throws). main() routes through
// this so the failure-isolation contract — "narrative-generation failure never
// blocks the deterministic data pipeline" — is testable, not just documented.
function applyAutoDraft(filled, archive, meta, month, summaryMod = summary, momByService = {}) {
  try {
    const { scores, incidents } = archiveToAnalysisRows(archive, meta)
    if (scores.length === 0 || incidents.length === 0) {
      console.warn(`[generate-report] Auto-draft skipped: no archive rows (scores=${scores.length}, incidents=${incidents.length}).`)
      return filled
    }
    const a = summaryMod.analyze(scores, incidents)
    const opening = summaryMod.generateOpening(`${monthName(month)} ${month.split('-')[0]}`, a)
    const tldr = summaryMod.generateTldr(a, incidents, momByService)
    return injectAutoDraft(filled, opening, tldr)
  } catch (err) {
    console.warn('[generate-report] Auto-draft injection failed (continuing with un-injected draft):', err instanceof Error ? err.message : err)
    return filled
  }
}

// ── AI retrospective narrative injection (refs aiwatch-reports#4 Phase 3) ──
//
// The Worker bakes an AI-generated retrospective draft into the archive at
// build time — `archive.narrative` (shape: MonthlyNarrativeDraft from
// worker/src/monthly-narrative.ts, refs aiwatch#426). This renders it into the
// Notable Incidents + Observations sections as fenced auto-draft blocks, the
// same operator-review pattern as the Summary/Key Insight injection above.
//
// Forward-compatible: archives written before aiwatch#426 (or months where AI
// generation failed) carry no `narrative` / `narrative: null` — injection is a
// no-op and the report keeps its hand-written placeholders.
//
// Each section gets its own marker pair so the idempotency guard is per-block
// and an operator deleting one fence doesn't disturb the other.

const NOTABLE_OPEN_MARKER = '<!-- BEGIN AUTO-DRAFT (Notable Incidents) — review, adapt into the entries below, then DELETE this entire block before merge -->'
const NOTABLE_CLOSE_MARKER = '<!-- END AUTO-DRAFT (Notable Incidents) -->'
const OBSERVATIONS_OPEN_MARKER = '<!-- BEGIN AUTO-DRAFT (Observations) — review, adapt into the bullets below, then DELETE this entire block before merge -->'
const OBSERVATIONS_CLOSE_MARKER = '<!-- END AUTO-DRAFT (Observations) -->'

// Render the Notable Incidents draft body: each AI-drafted incident as a ready
// `### N.` entry matching the template's structure, so the operator can lift
// entries directly. `e` fields come straight from MonthlyNarrativeDraft.
//
// Defensive against malformed elements: the Worker's parseMonthlyNarrative
// already validates incident rows, but the data crosses a KV JSON round-trip
// and a manual workflow_dispatch — a hand-edited / partially-written archive is
// reachable. Skip rows missing the load-bearing `title` / `narrative` fields
// (same rule as the Worker's own validator) rather than emitting the literal
// string "undefined" into the published report. Returns null when nothing
// valid remains — the caller treats null as "skip this section".
function buildNotableIncidentsDraft(notableIncidents, model) {
  const valid = notableIncidents.filter(
    e => e && typeof e.title === 'string' && typeof e.narrative === 'string',
  )
  if (valid.length === 0) return null
  const entries = valid.map((e, i) => [
    `### ${i + 1}. ${e.title}`,
    `**Affected**: ${typeof e.affected === 'string' && e.affected ? e.affected : '—'}`,
    `**Duration**: ${typeof e.durationLabel === 'string' && e.durationLabel ? e.durationLabel : '—'}`,
    '',
    e.narrative,
  ].join('\n'))
  return [
    NOTABLE_OPEN_MARKER,
    `_Auto-generated retrospective draft (${model}) — review for accuracy, adapt, then delete this block._`,
    '',
    entries.join('\n\n'),
    '',
    NOTABLE_CLOSE_MARKER,
  ].join('\n')
}

// Same defensive contract as buildNotableIncidentsDraft — keep only string
// observations, return null when none remain.
function buildObservationsDraft(observations, model) {
  const valid = observations.filter(o => typeof o === 'string' && o.trim().length > 0)
  if (valid.length === 0) return null
  return [
    OBSERVATIONS_OPEN_MARKER,
    `_Auto-generated retrospective draft (${model}) — review, adapt into prescriptive bullets, then delete this block._`,
    '',
    valid.map(o => `- ${o}`).join('\n'),
    '',
    OBSERVATIONS_CLOSE_MARKER,
  ].join('\n')
}

// Inject the archive's AI narrative into Notable Incidents + Observations.
// Returns `filled` unchanged when there's nothing to inject (no narrative,
// malformed narrative, or empty sections) — never throws.
function injectNarrativeDraft(filled, narrative) {
  // Forward-compat + failure isolation: null/absent/malformed → no-op.
  if (!narrative || typeof narrative !== 'object') return filled
  const model = typeof narrative.model === 'string' ? narrative.model : 'AI'
  let out = filled

  // Notable Incidents — insert the fenced block right after the heading.
  // `^## Notable Incidents$` (m flag) anchors the line so we don't splice into
  // any other heading. Idempotency: skip if the block is already present.
  const incidents = Array.isArray(narrative.notableIncidents) ? narrative.notableIncidents : []
  if (incidents.length > 0 && !out.includes(NOTABLE_OPEN_MARKER)) {
    const block = buildNotableIncidentsDraft(incidents, model)
    // block is null when every candidate row was malformed — skip rather than
    // splice an empty fence.
    if (block) out = out.replace(/^## Notable Incidents$/m, `## Notable Incidents\n\n${block}`)
  }

  // Observations — same pattern.
  const observations = Array.isArray(narrative.observations) ? narrative.observations : []
  if (observations.length > 0 && !out.includes(OBSERVATIONS_OPEN_MARKER)) {
    const block = buildObservationsDraft(observations, model)
    if (block) out = out.replace(/^## Observations$/m, `## Observations\n\n${block}`)
  }

  return out
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const month = parseCliMonth(process.argv)
  console.log(`[generate-report] Generating draft for ${month}`)

  const [archive, meta] = await Promise.all([fetchArchive(month), fetchServiceMeta()])
  console.log(`[generate-report] Archive ready: ${Object.keys(archive.services).length} services, ${archive.daysCollected} days of uptime data`)

  let template
  try {
    template = fs.readFileSync(TEMPLATE_PATH, 'utf-8')
  } catch (err) {
    console.error(`[generate-report] Template not found at ${TEMPLATE_PATH}`)
    console.error('[generate-report] Expected _templates/monthly-report.md in the repo root.')
    throw err
  }
  const filled = fillTemplate(template, month, archive, meta)

  // aiwatch-reports#54 — month-over-month incident-count deltas, used to MoM-frame the
  // auto-draft "Most incidents" bullet AND the recurrence block's "133 → 85" hint.
  // Best-effort: an absent prior-month _data archive yields an empty map (no MoM tails).
  const dataDir = path.join(__dirname, '..', '_data')
  let momByService = {}
  try {
    momByService = buildMomIncidentDeltas(archive, meta, month, { dataDir })
  } catch (err) {
    console.warn('[generate-report] MoM delta computation failed (continuing without deltas):', err instanceof Error ? err.message : err)
  }

  // Auto-draft narrative is best-effort — never blocks the deterministic data pipeline.
  // applyAutoDraft swallows analyzer/parsing failures (logs `console.warn`, returns
  // `filled` unchanged); see its docstring above for the contract.
  let withDraft = applyAutoDraft(filled, archive, meta, month, summary, momByService)
  if (withDraft !== filled) {
    console.log('[generate-report] Injected auto-draft narrative (Opening → Key Insight; TL;DR → Summary).')
  }

  // AI retrospective narrative (aiwatch#426) — render archive.narrative into the
  // Notable Incidents + Observations sections. No-op when the archive carries no
  // narrative (pre-feature months / AI-failed builds). Wrapped defensively so a
  // malformed narrative can't break the report write.
  try {
    const beforeNarrative = withDraft
    withDraft = injectNarrativeDraft(withDraft, archive.narrative)
    if (withDraft !== beforeNarrative) {
      console.log('[generate-report] Injected AI retrospective draft (Notable Incidents + Observations).')
    } else if (!archive.narrative) {
      console.log('[generate-report] No archive.narrative — Notable Incidents / Observations keep their placeholders.')
    } else {
      // narrative is a truthy object but produced no injection — empty sections,
      // non-array fields, or every candidate row malformed. Surface it: a garbage
      // narrative from the Worker should be visible, not silently swallowed.
      console.warn('[generate-report] archive.narrative present but yielded no injection (empty or malformed) — sections keep their placeholders.')
    }
  } catch (err) {
    console.warn('[generate-report] Narrative injection failed (continuing without it):', err instanceof Error ? err.message : err)
  }

  // aiwatch-reports#54 — flag narrative subjects repeated across prior months. Best-effort:
  // a missing/corrupt prior month degrades (loadPriorNarrative skips it), never throws.
  try {
    const currentSubjects = computeCurrentSubjects(archive, meta, month, { dataDir })
    const priorMonths = loadPriorNarrative(month, { rootDir: OUT_DIR_ROOT })
    const flags = detectRecurrence(currentSubjects, priorMonths)
    const block = buildRecurrenceBlock(flags, { currentMonth: month, priorCount: priorMonths.length, momByService })
    const beforeRecurrence = withDraft
    withDraft = injectRecurrenceCheck(withDraft, block)
    if (withDraft !== beforeRecurrence) {
      console.log(`[generate-report] Injected RECURRENCE CHECK — ${flags.length} repeated subject${flags.length === 1 ? '' : 's'} (review, then DELETE the block before merge).`)
    } else if (flags.length === 0) {
      console.log('[generate-report] No narrative recurrence vs prior months.')
    }
  } catch (err) {
    console.warn('[generate-report] Recurrence check failed (continuing without it):', err instanceof Error ? err.message : err)
  }

  const outDir = path.join(OUT_DIR_ROOT, month)
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'index.md')
  fs.writeFileSync(outPath, withDraft)

  console.log(`[generate-report] ✓ Wrote ${month}/index.md (published: false)`)
  console.log(`[generate-report]   Review narrative sections (including AUTO-DRAFT), then flip published: true and merge.`)
}

// ── Narrative recurrence check (aiwatch-reports#54) ──────────────────
//
// The hand-authored narrative slots (Summary "High incident count" bullet, Key
// Insight patterns, Notable Incidents) have no memory of prior months, so the same
// framing recurs (Together AI led the "High incident count" bullet Apr/May/Jun) and
// is only caught by a human at edit time. This injects a generate-time RECURRENCE
// CHECK block — the same class of mechanical gate #415 was on the aiwatch side:
// a passive "compare against last month" rule gets only probabilistic compliance.
//
// Two pure cores (unit-tested, no I/O): `extractNarrativeSubjects` reads the subject
// services out of a prior month's published index.md per slot; `detectRecurrence`
// flags any current-month subject that also filled the SAME slot in ≥2 of the last 3
// months. The I/O wrappers read the prior months + inject the block behind the same
// delete-before-merge fence as AUTO-DRAFT, and degrade gracefully (a missing/corrupt
// prior month is skipped, never thrown — same contract as the charts prior-month read).

// Slots we track. Keyed the same on the current-subject side (computeCurrentSubjects)
// and the prior-month side (extractNarrativeSubjects) so detectRecurrence can pair them.
const RECURRENCE_SLOTS = ['summary', 'keyInsight', 'notable']
const RECURRENCE_WINDOW = 3 // look back this many published months
const RECURRENCE_MIN = 2    // flag a subject repeated in ≥ this many of the window

const RECURRENCE_OPEN_MARKER = '<!-- BEGIN RECURRENCE CHECK — review, reframe around the change, then DELETE this entire block before merge -->'
const RECURRENCE_CLOSE_MARKER = '<!-- END RECURRENCE CHECK -->'

// Human label per slot for the injected block.
const RECURRENCE_SLOT_LABEL = {
  summary: "the Summary 'High incident count' bullet",
  keyInsight: 'a Key Insight pattern',
  notable: 'Notable Incidents',
}

// Case/spacing-insensitive service-name key for cross-month matching. Prior-month
// names are read from rendered markdown (author-typed) so exact equality is unsafe.
function normSubject(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

// Text of a `## <heading>` section up to (excluding) the next top-level `## ` or EOF.
// Returns '' when the heading is absent. The Score heading carries a "— Month Year"
// suffix, so callers pass a prefix and we match `## <prefix>` to end-of-line. No `m`
// flag: the terminating `$` must mean end-of-STRING (EOF fallback), not end-of-line.
function sectionText(md, headingPrefix) {
  const esc = headingPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\n##\\s+${esc}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`)
  const m = ('\n' + String(md)).match(re)
  return m ? m[1] : ''
}

// Service display-names the report names in its own AIWatch Score table — a
// self-contained lexicon so the prose slots can be scanned without external meta.
function serviceNameLexicon(md) {
  return summary.parseTable(md, 'AIWatch Score')
    .map(r => r.Service)
    .filter(Boolean)
}

// Fold an author-typed name variant onto its canonical Score-table name so cross-month
// matching survives spelling drift — the "High incident count" bullet says "Mistral" one
// month and "Mistral API" the next, but both are the same "Mistral API" Score row. Exact
// match wins; else a UNIQUE prefix-word-run resolve ("mistral" → "Mistral API"); an
// ambiguous or absent match keeps the raw token (never a wrong canonicalization).
function canonicalizeToLexicon(name, lexicon) {
  const key = normSubject(name)
  if (!key) return name
  const exact = lexicon.find(l => normSubject(l) === key)
  if (exact) return exact
  const startsWithToken = lexicon.filter(l => normSubject(l).startsWith(key + ' '))
  if (startsWithToken.length === 1) return startsWithToken[0]
  const tokenStartsWith = lexicon.filter(l => key.startsWith(normSubject(l) + ' '))
  if (tokenStartsWith.length === 1) return tokenStartsWith[0]
  return name
}

// Which lexicon names appear in `text` (whole-name, boundary-guarded so "Codex"
// doesn't match inside another word). Order-preserving, de-duplicated.
function subjectsInText(text, lexicon) {
  const seen = new Set()
  const out = []
  for (const name of lexicon) {
    const key = normSubject(name)
    if (seen.has(key)) continue
    const re = new RegExp(`(?<![\\w])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'i')
    if (re.test(text)) { seen.add(key); out.push(name) }
  }
  return out
}

// Subjects of the Summary "High incident count" bullet — the proven recurrence.
// Matches the bullet by its bold label (hand-authored "High incident count…" or the
// auto-draft's "Most incidents"), then pulls each service name that precedes a `(`
// stat group ("Mistral API (155 incidents…) and Together AI (133…)"). Each name is
// canonicalized to the report's own lexicon so "Mistral" and "Mistral API" fold together
// across months (the false-negative this feature exists to prevent).
function highIncidentBulletSubjects(summaryTxt, lexicon) {
  const bulletRe = /^[-*]\s*\*\*(?:high incident|most incidents)[^*]*\*\*:?\s*(.+)$/im
  const m = summaryTxt.match(bulletRe)
  if (!m) return []
  const out = []
  const seen = new Set()
  for (const nm of m[1].matchAll(/([A-Z][A-Za-z0-9.&()/-]*(?:\s+[A-Z0-9][A-Za-z0-9.&()/-]*)*)\s*\(/g)) {
    const name = canonicalizeToLexicon(nm[1].trim(), lexicon)
    const key = normSubject(name)
    if (name && !seen.has(key)) { seen.add(key); out.push(name) }
  }
  return out
}

// Key Insight subjects = services named in the section's BOLD-LEAD bullets (`- **…**: …`)
// ONLY, not its prose — the bold-lead bullets ARE the recurring framings. Scanning the full
// ~200-line section pulls every incidentally-mentioned service (noisy flags); requiring the
// literal word "Pattern" is too strict (real months use free-form labels like "Single-month
// deltas…" / "…two months running"), so we scope to any bold-lead bullet then filter to the
// report's own lexicon — precision without depending on a label convention.
function keyInsightSubjects(keyInsightTxt, lexicon) {
  const boldBullets = (keyInsightTxt.match(/^[-*]\s*\*\*[^\n]*$/gim) || []).join('\n')
  return boldBullets ? subjectsInText(boldBullets, lexicon) : []
}

// Service subjects named on `**Affected**:` lines in the Notable Incidents section.
// "(also Claude Code, claude.ai)" is expanded to its service list; every other
// parenthetical is descriptive prose and dropped. Results are filtered to the report's
// own service lexicon so incident-description noise ("newly-created keys") never leaks
// in as a subject.
function affectedSubjects(notableTxt, lexicon) {
  const known = new Map(lexicon.map(n => [normSubject(n), n]))
  const out = []
  const seen = new Set()
  for (const m of notableTxt.matchAll(/^\s*\*\*Affected:?\*\*:?\s*(.+)$/gim)) {
    const expanded = m[1].replace(/\(also\s+([^)]*)\)/gi, ', $1').replace(/\([^)]*\)/g, '')
    for (const part of expanded.split(/\s*(?:&|,|\band\b)\s*/i)) {
      const canon = known.get(normSubject(part))
      if (canon && !seen.has(normSubject(canon))) { seen.add(normSubject(canon)); out.push(canon) }
    }
  }
  return out
}

// PURE. Extract the subject services of each tracked narrative slot from a prior
// month's published index.md. Never throws — an absent/odd section yields []. The
// lexicon is derived from the same document's Score table (self-contained).
function extractNarrativeSubjects(indexMd) {
  const md = String(indexMd || '')
  const lexicon = serviceNameLexicon(md)
  return {
    summary: highIncidentBulletSubjects(sectionText(md, 'Summary'), lexicon),
    keyInsight: keyInsightSubjects(sectionText(md, 'Key Insight'), lexicon),
    notable: affectedSubjects(sectionText(md, 'Notable Incidents'), lexicon),
  }
}

// PURE. Flag each current-month subject that also filled the SAME slot in ≥ `min` of
// the (up to `window`) prior months.
//   currentSubjectsBySlot: { slot -> [name] }
//   priorMonths:           [{ month, subjects: { slot -> [name] } }]
// Returns [{ service, slot, monthsSeen: [YYYY-MM,…] }], one per (service, slot).
function detectRecurrence(currentSubjectsBySlot, priorMonths, opts = {}) {
  const { window = RECURRENCE_WINDOW, min = RECURRENCE_MIN } = opts
  const recent = (priorMonths || []).slice(0, window)
  const flags = []
  for (const slot of RECURRENCE_SLOTS) {
    const current = currentSubjectsBySlot?.[slot] || []
    const emitted = new Set()
    for (const svc of current) {
      const key = normSubject(svc)
      if (!key || emitted.has(key)) continue
      emitted.add(key)
      const monthsSeen = recent
        .filter(pm => (pm.subjects?.[slot] || []).some(n => normSubject(n) === key))
        .map(pm => pm.month)
      if (monthsSeen.length >= min) flags.push({ service: svc, slot, monthsSeen })
    }
  }
  return flags
}

// ── Recurrence I/O wrappers ──────────────────────────────────────────

// Read the last `window` published months' narrative subjects. Graceful: a month
// with no `index.md` (or an unreadable one) is skipped, matching the charts
// prior-month contract (a partial history degrades, never throws).
function loadPriorNarrative(month, opts = {}) {
  const { rootDir = OUT_DIR_ROOT, window = RECURRENCE_WINDOW } = opts
  const prior = []
  for (const pm of charts.monthsBefore(month, window)) {
    let md
    try {
      md = fs.readFileSync(path.join(rootDir, pm, 'index.md'), 'utf-8')
    } catch {
      continue // month never published / unreadable → skip
    }
    try {
      prior.push({ month: pm, subjects: extractNarrativeSubjects(md) })
    } catch (err) {
      console.warn(`[generate-report] recurrence: could not parse ${pm}/index.md — skipping (${err instanceof Error ? err.message : err})`)
    }
  }
  return prior
}

// Month-over-month incident-count deltas, keyed by service display name, for every
// service with a count this month AND last month. Feeds both the RECURRENCE block's
// "133 → 85" hint and the auto-draft's MoM-framed "Most incidents" bullet (#54 bonus).
function buildMomIncidentDeltas(archive, meta, month, opts = {}) {
  const { dataDir = path.join(__dirname, '..', '_data') } = opts
  const map = {}
  const prevMonth = charts.monthsBefore(month, 1)[0]
  const prev = charts.readDataArchive(prevMonth, dataDir)
  if (!prev || !prev.services) return map
  const { incidents } = archiveToAnalysisRows(archive, meta)
  for (const r of incidents) {
    const curr = parseInt(r.Incidents, 10)
    if (Number.isNaN(curr)) continue
    const id = charts.nameToId(r.Service)
    const p = prev.services[id]?.incidents
    if (typeof p !== 'number') continue
    map[r.Service] = { curr, prev: p }
  }
  return map
}

// Current-month likely narrative subjects per slot, derived from the archive data
// already computed for the report — top incident-count services (drive the Summary
// bullet + Key Insight Pattern-1), the slowest-recovery service (Pattern-2), and the
// Notable Movers (Key Insight turnaround + Notable Incidents). Best-effort: a trend
// gap (fewer than 2 months of _data) just drops the movers.
function computeCurrentSubjects(archive, meta, month, opts = {}) {
  const { dataDir = path.join(__dirname, '..', '_data') } = opts
  const { scores, incidents } = archiveToAnalysisRows(archive, meta)
  if (scores.length === 0 || incidents.length === 0) return { summary: [], keyInsight: [], notable: [] }
  const a = summary.analyze(scores, incidents)
  const topIncident = [...incidents]
    .filter(r => parseInt(r.Incidents, 10) > 0)
    .sort((x, y) => parseInt(y.Incidents, 10) - parseInt(x.Incidents, 10))
    .slice(0, 2)
    .map(r => r.Service)
  const slowest = a.slowestRecovery?.Service ? [a.slowestRecovery.Service] : []
  let movers = []
  try {
    const cur = charts.toMonthEntry(month, archive)
    const entries = charts.loadTrendEntries(month, cur, { dataDir })
    if (entries.length >= 2) {
      const trend = charts.buildTrendSeries(entries)
      movers = charts.computeNotableMovers(trend, { nameFor: id => serviceName(id, meta) }).map(m => m.name)
    }
  } catch { /* movers are optional context */ }
  const uniq = arr => [...new Set(arr.filter(Boolean))]
  return {
    summary: uniq(topIncident),
    keyInsight: uniq([...topIncident, ...slowest, ...movers]),
    notable: uniq([...topIncident, ...movers]),
  }
}

// Render the RECURRENCE CHECK block for the flags (or '' when none). Behind the same
// delete-before-merge fence as AUTO-DRAFT so #55's lint + the "no fence in output"
// sanity check catch a leak. `priorCount` = months actually available (the /N).
function buildRecurrenceBlock(flags, opts = {}) {
  if (!flags || flags.length === 0) return ''
  const { currentMonth = '', priorCount = RECURRENCE_WINDOW, momByService = {} } = opts
  const lines = [
    RECURRENCE_OPEN_MARKER,
    '_Narrative repeated vs prior months — lead with the month-over-month change or a fresh lens, then delete this block._',
    '',
  ]
  for (const f of flags) {
    const label = RECURRENCE_SLOT_LABEL[f.slot] || f.slot
    const priors = f.monthsSeen.join(', ')
    const nMonths = Math.max(priorCount, f.monthsSeen.length)
    const thisMonth = currentMonth ? ` + this month (${currentMonth})` : ''
    const mom = momByService[f.service]
    const momHint = mom && typeof mom.prev === 'number' && typeof mom.curr === 'number'
      ? ` (last month ${mom.prev} → this month ${mom.curr})`
      : ''
    lines.push(`- ⚠️ **${f.service}** — led ${label} in ${f.monthsSeen.length} of the last ${nMonths} published month${nMonths === 1 ? '' : 's'} (${priors})${thisMonth}.${momHint} → Reframe around the change or pick a fresh lens.`)
  }
  lines.push('', RECURRENCE_CLOSE_MARKER)
  return lines.join('\n')
}

// Insert the block directly above `## Summary` (near the top, next to the narrative
// work). Idempotent — a document already carrying the open marker is returned as-is.
function injectRecurrenceCheck(filled, block) {
  if (!block) return filled
  if (filled.includes(RECURRENCE_OPEN_MARKER)) return filled
  // Function replacer — `block` is a literal, so a `$`-sequence in a service name / hint
  // can't be misread as a replacement pattern ($&, $1, …).
  return filled.replace(/^## Summary$/m, () => `${block}\n\n## Summary`)
}

if (require.main === module) {
  main().catch(err => {
    console.error('[generate-report] Fatal:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}

module.exports = {
  parseCliMonth,
  fmtPercent,
  fmtMs,
  fmtDurationMin,
  competitionRank,
  buildWhy,
  gradeLabel,
  confidence,
  uptimeSourceLabel,
  buildRankingNote,
  buildScoreTable,
  isStaleSource,
  isRecentlyAdded,
  buildIncidentTable,
  officialUptimeFor,
  buildStaleSourceCaveat,
  buildUptimeTable,
  buildLatencyTable,
  buildBySourceTable,
  buildBySeverityTable,
  buildByServiceTable,
  buildTimelineDetails,
  buildTopFindings,
  buildSecuritySection,
  buildDetectionSection,
  buildComponentReliabilitySection,
  buildTrendSection,
  fmtLeadMin,
  fmtIso,
  monthName,
  lastDayOfMonth,
  nextMonthName,
  replaceTableBody,
  fillTemplate,
  injectAutoDraft,
  archiveToAnalysisRows,
  applyAutoDraft,
  injectNarrativeDraft,
  buildNotableIncidentsDraft,
  buildObservationsDraft,
  SUMMARY_OPEN_MARKER,
  SUMMARY_CLOSE_MARKER,
  NOTABLE_OPEN_MARKER,
  NOTABLE_CLOSE_MARKER,
  OBSERVATIONS_OPEN_MARKER,
  OBSERVATIONS_CLOSE_MARKER,
  // Narrative recurrence check (aiwatch-reports#54) — pure cores reused by #55's lint.
  extractNarrativeSubjects,
  detectRecurrence,
  buildRecurrenceBlock,
  injectRecurrenceCheck,
  buildMomIncidentDeltas,
  computeCurrentSubjects,
  loadPriorNarrative,
  RECURRENCE_OPEN_MARKER,
  RECURRENCE_CLOSE_MARKER,
  RECURRENCE_SLOTS,
}
