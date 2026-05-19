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

// Services that do NOT publish an accessible uptime metric — their archive.uptime is null.
// Keep in sync with the note in _templates/monthly-report.md (Official Uptime section).
const NO_PUBLIC_UPTIME = new Set([
  'azureopenai', 'deepgram', 'gemini', 'mistral', 'perplexity', 'xai',
])

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
function buildWhy(svc) {
  const { incidents, uptime, avgResolutionMin } = svc.data
  const pieces = []
  if (incidents === 0) {
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

// Confidence heuristic: High when uptime AND incident data both present; Medium otherwise.
function confidence(svc) {
  if (svc.data.uptime !== null && svc.data.incidents !== null) return 'High'
  return 'Medium'
}

// ── Table builders ───────────────────────────────────────────────────
function buildScoreTable(services, meta) {
  const withScore = services.filter(s => s.data.score !== null)
  const ranked = competitionRank(withScore, s => s.data.score)
  const rows = ranked.map(r => {
    const s = r.item
    return `| ${r.rankLabel} | ${serviceName(s.id, meta)} | ${s.data.score} | ${gradeLabel(s.data.grade)} | ${confidence(s)} | ${buildWhy(s)} |`
  })
  return [
    '| Rank | Service | Score | Grade | Confidence | Why |',
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

  const zeroInc = services.filter(s => s.data.incidents === 0).map(s => serviceName(s.id, meta))
  const zeroIncLine = `**Zero incidents (${zeroInc.length} services):** ${zeroInc.join(', ')}`

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

function buildLatencyTable(services, meta) {
  const withLatency = services.filter(s => s.data.avgLatencyMs !== null && !NO_PROBE.has(s.id))
  // Competition rank with ascending sort: negate avgLatencyMs so competitionRank's
  // descending comparator yields "faster = higher rank" and ties get "N=" suffix.
  const ranked = competitionRank(withLatency, s => -s.data.avgLatencyMs)

  const header = [
    '| Rank | Service | p75 (ms) | p95 (ms) | Spikes | vs Last Month |',
    '|---|---|---|---|---|---|',
  ]
  const rows = ranked.map(r =>
    `| ${r.rankLabel} | ${serviceName(r.item.id, meta)} | ${Math.round(r.item.data.avgLatencyMs)} | — | — | — |`,
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
  out = replaceTableBody(out, 'API Response Time', latencyTable)
  // Incident Summary + Official Uptime use HTML <tbody>
  out = replaceTableBody(out, 'Incident Summary', incidentRows)
  out = replaceTableBody(out, 'Official Uptime', uptimeRows)

  // Zero-incidents line — replace the placeholder comment
  out = out.replace(
    /\*\*Zero incidents \(N services\):\*\* <!-- List services with zero incidents inline -->/,
    zeroIncLine,
  )

  // Security section — when archive.security is null/empty, collapse the placeholder + its
  // surrounding blank lines down to a single blank line so the preceding `---` separator
  // doesn't end up adjacent to a second one (would render as two horizontal rules).
  const securityBlock = buildSecuritySection(archive.security)
  if (securityBlock) {
    out = out.replace(/<!-- SECURITY_SECTION -->/, securityBlock)
  } else {
    out = out.replace(/\n*<!-- SECURITY_SECTION -->\n*/, '\n\n')
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
