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

const API_BASE = process.env.AIWATCH_API_BASE || 'https://aiwatch-worker.p2c2kbf.workers.dev'
const TEMPLATE_PATH = path.join(__dirname, '..', '_templates', 'monthly-report.md')
const OUT_DIR_ROOT = path.join(__dirname, '..')

// Services whose uptime is an estimate, not an official rolling-30-day metric read directly
// from a status page — either no published metric (industry-average assumption) or a
// poll/incident-derived figure. Marked "Estimate" in the Score table's Uptime Source column
// and excluded from the Official Uptime table. (#29 — `bedrock` was previously missing here,
// so it leaked a stray "100.00%" row into the Official Uptime table.)
// TODO(#29): drive this from an archive `uptimeSource` field once the Worker exposes it
// (it would also fold in chatgpt's group-aggregate case, tracked separately as aiwatch#586),
// instead of this maintained constant.
const NO_PUBLIC_UPTIME = new Set([
  'bedrock', 'azureopenai', 'deepgram', 'gemini', 'mistral', 'perplexity', 'xai',
])

// Estimate-uptime services that ALSO have no reliable incident feed (RSS-only — a blank
// incident count is monitoring coverage, not a verified zero). With neither an accessible
// uptime metric nor trustworthy incident data there's nothing to score fairly, so they're
// dropped from the Score ranking entirely. Subset of NO_PUBLIC_UPTIME; matches the 2026-04
// report's "29 of 31 ranked — Bedrock/Azure excluded" handling.
const NO_INCIDENT_FEED = new Set(['bedrock', 'azureopenai'])

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
function buildRankingNote(services, meta) {
  const scored = services.filter(s => s.data.score !== null)
  const excluded = scored.filter(s => NO_INCIDENT_FEED.has(s.id))
  if (excluded.length === 0) return ''
  const ranked = scored.length - excluded.length
  const names = excluded.map(s => serviceName(s.id, meta))
  const nameList = names.length === 2 ? names.join(' and ') : names.join(', ')
  const verb = excluded.length === 1 ? 'is' : 'are'
  return `*${ranked} of ${scored.length} services ranked. **${nameList} ${verb} excluded from this ranking** — neither publishes an accessible uptime metric, so their Score would otherwise inherit an industry-average assumption rather than a measured value, and AIWatch has no reliable incident feed for them (see "No incident feed" under [Incident Summary](#incident-summary)).*`
}

// ── Table builders ───────────────────────────────────────────────────
function buildScoreTable(services, meta) {
  // Drop NO_INCIDENT_FEED services (no uptime metric + no reliable incidents) from the ranking;
  // they're surfaced in the ranking-exclusion note + the Incident Summary "No incident feed" line.
  const withScore = services.filter(s => s.data.score !== null && !NO_INCIDENT_FEED.has(s.id))
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

  // Zero-incident services split (#29): a "confirmed zero" needs a real incident feed.
  // Estimate-uptime services (NO_PUBLIC_UPTIME) with zero incidents are coverage-limited —
  // a blank count reflects what AIWatch can see, not verified incident-free operation.
  const zero = services.filter(s => s.data.incidents === 0)
  const confirmed = zero.filter(s => !NO_PUBLIC_UPTIME.has(s.id)).map(s => serviceName(s.id, meta))
  const noFeed = zero.filter(s => NO_PUBLIC_UPTIME.has(s.id)).map(s => serviceName(s.id, meta))
  const zeroLines = []
  if (confirmed.length) {
    zeroLines.push(`**Zero incidents (${confirmed.length} services):** ${confirmed.join(', ')} — confirmed via their status-page incident feeds.`)
  }
  if (noFeed.length) {
    zeroLines.push(`**No incident feed (${noFeed.length} services):** ${noFeed.join(', ')} — AIWatch has no reliable incident feed for these (RSS / estimate-only), so a blank incident count reflects monitoring coverage, not verified incident-free operation.`)
  }
  const zeroIncLine = zeroLines.join('\n\n')

  return {
    tableRows: rows.join('\n'),
    zeroIncLine,
  }
}

function buildUptimeTable(services, meta) {
  const withUptime = services.filter(s => s.data.uptime !== null && !NO_PUBLIC_UPTIME.has(s.id))
  withUptime.sort((a, b) => b.data.uptime - a.data.uptime)
  return withUptime.map(s =>
    `<tr><td>${serviceName(s.id, meta)}</td><td>${fmtPercent(s.data.uptime)}</td></tr>`,
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
  const scoreTable = buildScoreTable(services, meta)
  const rankingNote = buildRankingNote(services, meta)
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
function applyAutoDraft(filled, archive, meta, month, summaryMod = summary) {
  try {
    const { scores, incidents } = archiveToAnalysisRows(archive, meta)
    if (scores.length === 0 || incidents.length === 0) {
      console.warn(`[generate-report] Auto-draft skipped: no archive rows (scores=${scores.length}, incidents=${incidents.length}).`)
      return filled
    }
    const a = summaryMod.analyze(scores, incidents)
    const opening = summaryMod.generateOpening(`${monthName(month)} ${month.split('-')[0]}`, a)
    const tldr = summaryMod.generateTldr(a, incidents)
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

  // Auto-draft narrative is best-effort — never blocks the deterministic data pipeline.
  // applyAutoDraft swallows analyzer/parsing failures (logs `console.warn`, returns
  // `filled` unchanged); see its docstring above for the contract.
  let withDraft = applyAutoDraft(filled, archive, meta, month)
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

  const outDir = path.join(OUT_DIR_ROOT, month)
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'index.md')
  fs.writeFileSync(outPath, withDraft)

  console.log(`[generate-report] ✓ Wrote ${month}/index.md (published: false)`)
  console.log(`[generate-report]   Review narrative sections (including AUTO-DRAFT), then flip published: true and merge.`)
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
  buildIncidentTable,
  buildUptimeTable,
  buildLatencyTable,
  buildBySourceTable,
  buildBySeverityTable,
  buildByServiceTable,
  buildTimelineDetails,
  buildTopFindings,
  buildSecuritySection,
  buildDetectionSection,
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
}
