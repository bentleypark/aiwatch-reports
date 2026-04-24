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

  const outDir = path.join(OUT_DIR_ROOT, month)
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'index.md')
  fs.writeFileSync(outPath, filled)

  console.log(`[generate-report] ✓ Wrote ${month}/index.md (published: false)`)
  console.log(`[generate-report]   Review narrative sections, then flip published: true and merge.`)
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
  monthName,
  lastDayOfMonth,
  nextMonthName,
  replaceTableBody,
  fillTemplate,
}
