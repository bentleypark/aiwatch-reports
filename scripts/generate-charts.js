#!/usr/bin/env node
// generate-charts.js — Generate SVG charts from monthly report data
// Usage: node scripts/generate-charts.js 2026-03/index.md
//
// Fetches real daily uptime data from AIWatch API for the heatmap.
// Outputs:
//   assets/{YYYY-MM}/score-chart.svg   — AIWatch Score horizontal bar chart
//   assets/{YYYY-MM}/uptime-heatmap.svg — 30-day uptime heatmap

const fs = require('fs')
const path = require('path')
const { parseTable } = require('./generate-summary')

// ── Color constants ──────────────────────────────────────
const COLORS = {
  excellent: '#22c55e',
  good: '#3b82f6',
  fair: '#eab308',
  degrading: '#ef4444',
  na: '#6b7280',
  bg: '#0d1117',
  bgAlt: '#161b22',
  text: '#e6edf3',
  textMuted: '#8b949e',
  border: '#30363d',
  operational: '#3fb950',
  heatDegraded: '#eab308',
  down: '#ef4444',
  noData: '#21262d',
}

// Map grade text to color (matches report's Grade scale)
function scoreColorByGrade(grade) {
  const g = (grade || '').toLowerCase()
  if (g === 'excellent') return COLORS.excellent
  if (g === 'good') return COLORS.good
  if (g === 'fair') return COLORS.fair
  if (g === 'degrading' || g === 'unstable') return COLORS.degrading
  return COLORS.na
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// ── Service ID ↔ Name mapping ────────────────────────────
const ID_TO_NAME = {
  claude: 'Claude API', openai: 'OpenAI API', gemini: 'Gemini API',
  mistral: 'Mistral API', cohere: 'Cohere API', groq: 'Groq Cloud',
  together: 'Together AI', fireworks: 'Fireworks AI', cerebras: 'Cerebras Inference',
  perplexity: 'Perplexity', huggingface: 'Hugging Face',
  replicate: 'Replicate', elevenlabs: 'ElevenLabs', xai: 'xAI (Grok)',
  deepseek: 'DeepSeek API', openrouter: 'OpenRouter', bedrock: 'Amazon Bedrock',
  azureopenai: 'Azure OpenAI', pinecone: 'Pinecone', stability: 'Stability AI',
  voyageai: 'Voyage AI', modal: 'Modal', langsmith: 'LangChain (LangSmith)', helicone: 'Helicone', langfuse: 'Langfuse', runway: 'Runway', luma: 'Luma (Dream Machine)',
  claudeai: 'claude.ai', chatgpt: 'ChatGPT', characterai: 'Character.AI', deepseekapp: 'DeepSeek App',
  claudecode: 'Claude Code', codex: 'Codex', cursor: 'Cursor',
  copilot: 'GitHub Copilot', windsurf: 'Windsurf', junie: 'Junie',
  assemblyai: 'AssemblyAI', deepgram: 'Deepgram',
}

// Category-based display order (matches dashboard)
const CATEGORY_ORDER = [
  // AI Apps
  'claudeai', 'chatgpt', 'characterai', 'deepseekapp',
  // LLM API
  'claude', 'openai', 'gemini', 'bedrock', 'azureopenai', 'mistral', 'cohere', 'groq',
  'together', 'fireworks', 'cerebras', 'perplexity', 'xai', 'deepseek', 'openrouter',
  // Voice & Inference (incl. observability — langsmith/helicone/langfuse — and video; coarse grouping)
  'elevenlabs', 'assemblyai', 'deepgram', 'huggingface', 'replicate', 'pinecone',
  'stability', 'voyageai', 'modal', 'langsmith', 'helicone', 'langfuse', 'runway', 'luma',
  // Coding Agents
  'claudecode', 'codex', 'cursor', 'copilot', 'windsurf', 'junie',
]

function nameToId(name) {
  for (const [id, n] of Object.entries(ID_TO_NAME)) {
    if (n === name) return id
  }
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ── Score Bar Chart ──────────────────────────────────────
function generateScoreBarSvg(scores) {
  const ranked = scores
    .filter(r => r.Score && r.Score !== 'N/A')
    .map(r => ({ name: r.Service, score: parseInt(r.Score), grade: r.Grade || '' }))
    .filter(r => !isNaN(r.score))
    .sort((a, b) => b.score - a.score)

  const labelWidth = 130
  const barMaxWidth = 320
  const rowHeight = 28
  const padding = { top: 50, right: 120, bottom: 20, left: 16 }
  const width = padding.left + labelWidth + barMaxWidth + padding.right
  const height = padding.top + ranked.length * rowHeight + padding.bottom

  const rows = ranked.map((r, i) => {
    const y = padding.top + i * rowHeight
    const barW = Math.round((r.score / 100) * barMaxWidth)
    const color = scoreColorByGrade(r.grade)
    return [
      `  <text x="${padding.left + labelWidth - 8}" y="${y + 18}" fill="${COLORS.text}" font-size="12" font-family="ui-monospace,monospace" text-anchor="end">${escapeXml(r.name)}</text>`,
      `  <rect x="${padding.left + labelWidth}" y="${y + 5}" width="${barW}" height="18" rx="3" fill="${color}" opacity="0.85"/>`,
      `  <text x="${padding.left + labelWidth + barW + 8}" y="${y + 18}" fill="${COLORS.textMuted}" font-size="11" font-family="ui-monospace,monospace">${r.score}  (${escapeXml(r.grade)})</text>`,
    ].join('\n')
  }).join('\n')

  const naServices = scores.filter(r => !r.Score || r.Score === 'N/A')
  let naText = ''
  if (naServices.length > 0) {
    const naY = padding.top + ranked.length * rowHeight + 4
    naText = `  <text x="${padding.left}" y="${naY + 14}" fill="${COLORS.textMuted}" font-size="10" font-family="ui-monospace,monospace">${naServices.map(r => escapeXml(r.Service)).join(', ')} — N/A (insufficient data)</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + (naServices.length > 0 ? 24 : 0)}" width="${width}" height="${height + (naServices.length > 0 ? 24 : 0)}">
  <style>
    .chart-bg { fill: ${COLORS.bg}; }
    .chart-title { fill: ${COLORS.text}; }
    .chart-text { fill: ${COLORS.text}; }
    .chart-muted { fill: ${COLORS.textMuted}; }
  </style>
  <rect class="chart-bg" width="100%" height="100%" fill="${COLORS.bg}"/>
  <text x="${padding.left}" y="28" fill="${COLORS.text}" font-size="14" font-weight="600" font-family="ui-monospace,monospace" class="chart-title">AIWatch Score Rankings</text>
  <line x1="${padding.left + labelWidth}" y1="40" x2="${padding.left + labelWidth + barMaxWidth}" y2="40" stroke="${COLORS.border}" stroke-width="1"/>
${rows}
${naText}
</svg>`
}

// ── Uptime Heatmap (real data) ───────────────────────────
function generateUptimeHeatmapSvg(serviceNames, uptimeHistory, daysInMonth, monthKey, monitoringStartDay, lastDataDay) {
  // Only render days with actual data (monitoringStartDay to lastDataDay)
  const endDay = lastDataDay || daysInMonth
  const visibleDays = endDay - monitoringStartDay + 1

  const cellSize = 16
  const cellGap = 3
  const labelWidth = 130
  const padding = { top: 68, right: 16, bottom: 44, left: 16 }
  const gridWidth = visibleDays * (cellSize + cellGap)
  const minLegendWidth = 480
  const width = Math.max(padding.left + labelWidth + gridWidth + padding.right, minLegendWidth)
  const height = padding.top + serviceNames.length * (cellSize + cellGap) + padding.bottom + 16

  // Day number headers — only visible days
  const dayHeaders = Array.from({ length: visibleDays }, (_, i) => {
    const dayNum = monitoringStartDay + i
    const x = padding.left + labelWidth + i * (cellSize + cellGap)
    const interval = visibleDays <= 15 ? 3 : 5
    const show = i === 0 || dayNum % interval === 1 || i === visibleDays - 1
    return show ? `  <text x="${x + cellSize / 2}" y="${padding.top - 8}" fill="${COLORS.textMuted}" font-size="9" font-family="ui-monospace,monospace" text-anchor="middle">${dayNum}</text>` : ''
  }).filter(Boolean).join('\n')

  // Sort services by category order (matches dashboard layout)
  const sortedNames = [...serviceNames].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(nameToId(a))
    const bIdx = CATEGORY_ORDER.indexOf(nameToId(b))
    // Unknown services go to the end
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
  })

  const serviceRows = sortedNames.map((name, si) => {
    const y = padding.top + si * (cellSize + cellGap)
    const label = `  <text x="${padding.left + labelWidth - 8}" y="${y + 12}" fill="${COLORS.text}" font-size="11" font-weight="600" font-family="ui-monospace,monospace" text-anchor="end">${escapeXml(name)}</text>`
    const svcId = nameToId(name)

    const cells = Array.from({ length: visibleDays }, (_, i) => {
      const dayNum = monitoringStartDay + i
      const x = padding.left + labelWidth + i * (cellSize + cellGap)
      const dateKey = `${monthKey}-${String(dayNum).padStart(2, '0')}`
      const dayData = uptimeHistory[dateKey]?.[svcId]

      let color
      if (!dayData) {
        color = COLORS.noData
      } else {
        const ratio = dayData.ok / dayData.total
        if (ratio >= 0.99) color = COLORS.operational
        else if (ratio >= 0.90) color = COLORS.heatDegraded
        else color = COLORS.down
      }

      return `  <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${color}" opacity="0.85"/>`
    }).join('\n')

    return `${label}\n${cells}`
  }).join('\n')

  // Legend — single row with min-width guarantee
  const legendY = height - 28
  const legendItems = [
    { color: COLORS.operational, label: 'Operational' },
    { color: COLORS.heatDegraded, label: 'Degraded' },
    { color: COLORS.down, label: 'Down' },
    { color: COLORS.noData, label: 'Added Later' },
  ]
  const legend = legendItems.map((item, i) => {
    const x = padding.left + i * 110
    return [
      `  <rect x="${x}" y="${legendY}" width="10" height="10" rx="2" fill="${item.color}" opacity="0.85"/>`,
      `  <text x="${x + 14}" y="${legendY + 9}" fill="${COLORS.textMuted}" font-size="10" font-family="ui-monospace,monospace">${item.label}</text>`,
    ].join('\n')
  }).join('\n')
  // Footnote
  const footnote = `  <text x="${padding.left}" y="${height - 4}" fill="${COLORS.textMuted}" font-size="8" font-family="ui-monospace,monospace" opacity="0.7">Gray cells = service added after monitoring began (e.g., Amazon Bedrock, Azure OpenAI added Mar 25)</text>`

  const [yr, mo] = monthKey.split('-').map(Number)
  const monthName = new Date(yr, mo - 1).toLocaleString('en-US', { month: 'long' })
  const subtitle = monitoringStartDay > 1
    ? `${monthName} ${monitoringStartDay}–${endDay} — based on AIWatch polling (5-min intervals)`
    : `${monthName} 1–${daysInMonth} — based on AIWatch polling (5-min intervals)`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .chart-bg { fill: ${COLORS.bg}; }
    .chart-title { fill: ${COLORS.text}; }
    .chart-text { fill: ${COLORS.text}; }
    .chart-muted { fill: ${COLORS.textMuted}; }
  </style>
  <rect class="chart-bg" width="100%" height="100%" fill="${COLORS.bg}"/>
  <text x="${padding.left}" y="28" fill="${COLORS.text}" font-size="14" font-weight="600" font-family="ui-monospace,monospace" class="chart-title">Daily Service Status</text>
  <text x="${padding.left}" y="42" fill="${COLORS.textMuted}" font-size="10" font-family="ui-monospace,monospace">${subtitle}</text>
${dayHeaders}
${serviceRows}
${legend}
${footnote}
</svg>`
}

// ── 3-Month Trend (aiwatch#637 quick-win / aiwatch-reports#41) ──────────
//
// Turns the single-month snapshot into a directional signal: "Claude API 71 → 68
// → 63, down 3 months running". Score is the primary metric (uptime/MTTR can be
// layered later). The multi-month core is PURE (buildTrendSeries / computeScoreMovers)
// so it's unit-testable without filesystem or network; the IO wrappers are thin.
//
// Data sourcing (deliberate, see #41): PRIOR months come from the committed
// `_data/{YYYY-MM}.json` snapshots (immutable history, no network); the CURRENT
// month comes from the freshly-built report (its Score table / the archive the
// report generator already fetched) — because in the CI pipeline `fetch-archive.sh`
// writes `_data/{currentMonth}.json` AFTER generate-charts runs, so that file isn't
// present yet when the chart is drawn.

// Return the `count` month keys immediately BEFORE `month` (ascending), e.g.
// monthsBefore('2026-06', 2) → ['2026-04', '2026-05']. UTC-based, no Date.now().
function monthsBefore(month, count) {
  const [y, m] = month.split('-').map(Number)
  const out = []
  for (let i = count; i >= 1; i--) {
    // m is 1-based; Date(y, m-1 - i, 1) walks back i months, normalizing year.
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

function daysInMonthOf(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

// Read a committed `_data/{month}.json` snapshot → archive-like object, or null if
// absent/corrupt (a missing prior month must degrade gracefully, never throw).
function readDataArchive(month, dataDir) {
  try {
    const raw = fs.readFileSync(path.join(dataDir, `${month}.json`), 'utf-8')
    const d = JSON.parse(raw)
    return d.archive || d
  } catch {
    return null
  }
}

// Normalize an archive-like object into a trend month-entry. `daysCollected`
// (when present) drives the partial-month flag; absent → assumed full.
function toMonthEntry(month, archiveLike) {
  if (!archiveLike || !archiveLike.services) return null
  const services = {}
  for (const [id, s] of Object.entries(archiveLike.services)) {
    services[id] = {
      score: s && typeof s.score === 'number' ? s.score : null,
      grade: s && s.grade ? s.grade : null,
      // MTTR + total downtime feed the Notable Movers decomposition — both incident-feed
      // MEASURED values, consistent across services. The archive's `uptime` field is
      // deliberately NOT used: it mixes per-service sources (group aggregates like ChatGPT's
      // #586 over-count, estimate/poll-derived figures), so surfacing it as a reader-facing
      // "uptime" produces contradictory score-up/uptime-down lines. The clean status-page field
      // (`officialUptime`) is carried only in archives from 2026-06 onward (see officialUptimeFor
      // in generate-report.js) and isn't in the trailing snapshots yet, so a 3-month official-uptime
      // delta isn't available — add it once #586 lands AND officialUptime spans ≥3 archived months. (#41)
      // mttr (avgResolutionMin) / downtime (totalDowntimeMin) are null in a zero-incident month.
      mttr: s && typeof s.avgResolutionMin === 'number' ? s.avgResolutionMin : null,
      downtime: s && typeof s.totalDowntimeMin === 'number' ? s.totalDowntimeMin : null,
    }
  }
  return {
    month,
    daysInMonth: daysInMonthOf(month),
    daysCollected: archiveLike && typeof archiveLike.daysCollected === 'number' ? archiveLike.daysCollected : null,
    services,
  }
}

// Build a CURRENT-month entry from a parsed AIWatch Score table (the report MD rows:
// { Service, Score, Grade }). daysCollected is unknown here → treated as full; the
// report-side section uses the real archive so its partial-flag is authoritative.
function monthEntryFromScoreRows(month, rows) {
  const services = {}
  for (const r of rows || []) {
    const id = nameToId(r.Service)
    const score = parseInt(r.Score, 10)
    services[id] = { score: Number.isNaN(score) ? null : score, grade: r.Grade || null }
  }
  return { month, daysInMonth: daysInMonthOf(month), daysCollected: daysInMonthOf(month), services }
}

// PURE. monthEntries: [{ month, daysInMonth, daysCollected, services:{ id:{score,grade} } }]
// ascending by month. Returns { months, partialMonths:Set, series:{ id:{ id, points } } }
// where points align 1:1 with months (score=null when the service is absent that month).
function buildTrendSeries(monthEntries) {
  const months = monthEntries.map(e => e.month)
  const partialMonths = new Set(
    monthEntries
      .filter(e => typeof e.daysCollected === 'number' && e.daysCollected < e.daysInMonth)
      .map(e => e.month),
  )
  const ids = new Set()
  monthEntries.forEach(e => Object.keys(e.services || {}).forEach(id => ids.add(id)))

  const series = {}
  for (const id of ids) {
    const points = monthEntries.map(e => {
      const s = e.services && e.services[id]
      return {
        month: e.month,
        score: s && typeof s.score === 'number' ? s.score : null,
        grade: s && s.grade ? s.grade : null,
        mttr: s && typeof s.mttr === 'number' ? s.mttr : null,
        downtime: s && typeof s.downtime === 'number' ? s.downtime : null,
        partial: partialMonths.has(e.month),
      }
    })
    series[id] = { id, points }
  }
  return { months, partialMonths, series }
}

// PURE. Top decliners + improvers by Score delta across the window. Only services
// with a numeric score in BOTH the first AND last month qualify (so a service added
// mid-window isn't reported as a fake mover). `monoDown` flags a monotonic decline
// across every present point (the "N months running" signal).
function computeScoreMovers(trend, opts = {}) {
  const { limit = 3, nameFor = id => id, exclude = new Set() } = opts
  const { months, series } = trend
  if (!months || months.length < 2) return { declining: [], improving: [], firstMonth: null, lastMonth: null }
  const firstMonth = months[0]
  const lastMonth = months[months.length - 1]

  const rows = []
  for (const id of Object.keys(series)) {
    if (exclude.has(id)) continue // services the report doesn't rank (no-incident-feed / stale source)
    const pts = series[id].points
    const first = pts.find(p => p.month === firstMonth)
    const last = pts.find(p => p.month === lastMonth)
    if (!first || !last || first.score === null || last.score === null) continue
    const delta = last.score - first.score
    const present = pts.filter(p => p.score !== null)
    // STRICT decrease at every step — a flat-then-drop (88 → 88 → 71) is a net decline
    // but NOT "down every month", so it must not earn the ⚠︎ every-month label.
    const monoDown = present.length >= 2 && delta < 0 && present.every((p, i) => i === 0 || p.score < present[i - 1].score)
    rows.push({ id, name: nameFor(id), delta, first: first.score, last: last.score, points: pts, monoDown })
  }

  const declining = rows.filter(r => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, limit)
  const improving = rows.filter(r => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, limit)
  return { declining, improving, firstMonth, lastMonth }
}

// Delta of a sparse metric over the months that actually have data: first-present →
// last-present. { first, last, delta } where delta is null for <2 present points (a value,
// not a trend) and { null, null, null } when the metric is never present.
function presentDelta(points, field) {
  const present = points.filter(p => p[field] !== null && p[field] !== undefined)
  if (present.length === 0) return { first: null, last: null, delta: null }
  const first = present[0][field]
  const last = present[present.length - 1][field]
  return { first, last, delta: present.length >= 2 ? last - first : null }
}

// PURE. "Notable Movers" — the decision-grade list. Unlike computeScoreMovers (which ranks
// by Score delta only, for the slope chart's emphasis), this ranks by the LARGEST move across
// Score / MTTR / total-downtime — incident-feed MEASURED metrics — so a service with a FLAT
// score but a big recovery-time regression (e.g. Gemini Score 64→64 but MTTR 2h→22h) still
// surfaces; that's the "should I keep relying on this?" signal a composite score hides.
// `uptime` is intentionally excluded (see toMonthEntry: mixed sources / #586 over-count make it
// misleading and it hijacks the ranking). Each row carries all three deltas + which axis moved
// most (`emphasize`) so the renderer can bold it. Magnitudes are normalized to comparable units:
// 10 score pts ≈ 60 min MTTR ≈ 120 min downtime ≈ 1.0.
function computeNotableMovers(trend, opts = {}) {
  const { limit = 5, nameFor = id => id, exclude = new Set() } = opts
  const { months, series } = trend
  if (!months || months.length < 2) return []
  const firstMonth = months[0]
  const lastMonth = months[months.length - 1]

  const rows = []
  for (const id of Object.keys(series)) {
    if (exclude.has(id)) continue // services the report doesn't rank (no-incident-feed / stale source)
    const pts = series[id].points
    const f = pts.find(p => p.month === firstMonth)
    const l = pts.find(p => p.month === lastMonth)
    // Require Score at both ends so a mid-window-added service isn't a fake mover.
    if (!f || !l || f.score === null || l.score === null) continue

    const scoreDelta = l.score - f.score
    // MTTR / downtime are sparse (null in a zero-incident month — common in a partial month
    // like a mid-month-onboarded March), so measure their delta over the months that HAVE
    // data (first-present → last-present), not the strict window endpoints. A single present
    // point → delta null (a value, not a trend). Score always uses the window endpoints.
    const mttr = presentDelta(pts, 'mttr')
    const downtime = presentDelta(pts, 'downtime')

    const nScore = Math.abs(scoreDelta) / 10
    const nMttr = mttr.delta !== null ? Math.abs(mttr.delta) / 60 : 0
    const nDowntime = downtime.delta !== null ? Math.abs(downtime.delta) / 120 : 0
    const notability = Math.max(nScore, nMttr, nDowntime)
    if (notability === 0) continue // nothing moved meaningfully

    let emphasize = 'score'
    if (nMttr >= nScore && nMttr >= nDowntime) emphasize = 'mttr'
    else if (nDowntime >= nScore && nDowntime >= nMttr) emphasize = 'downtime'

    // Direction follows the EMPHASIZED (headline) axis so the 🔺/🔻 marker never contradicts
    // the bolded metric — e.g. Mistral with Score +1 but downtime +36h is a 🔻 (the downtime
    // regression is the story; the small score gain is shown transparently beside it). More
    // downtime / slower recovery = worse = declining. Falls back through the other axes if the
    // chosen one is exactly flat.
    let sign = 0
    if (emphasize === 'mttr') sign = -Math.sign(mttr.delta || 0)
    else if (emphasize === 'downtime') sign = -Math.sign(downtime.delta || 0)
    else sign = Math.sign(scoreDelta)
    if (sign === 0) {
      sign = scoreDelta !== 0 ? Math.sign(scoreDelta)
        : downtime.delta ? -Math.sign(downtime.delta)
        : mttr.delta ? -Math.sign(mttr.delta) : 0
    }

    rows.push({
      id,
      name: nameFor(id),
      score: { first: f.score, last: l.score, delta: scoreDelta, points: pts },
      mttr,
      downtime,
      notability,
      emphasize,
      declining: sign < 0,
    })
  }

  rows.sort((a, b) => b.notability - a.notability || Math.abs(b.score.delta) - Math.abs(a.score.delta))
  return rows.slice(0, limit)
}

// "71 → 68 → 63" from a series' points (skips months the service was absent).
function formatTrendArrow(points) {
  return points.filter(p => p.score !== null).map(p => p.score).join(' → ')
}

// "+8" / "−8" (real minus sign for typography).
function fmtScoreDelta(delta) {
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `−${Math.abs(delta)}`
  return '±0'
}

// The trend window, in months — a ROLLING window: each report shows the latest TREND_MONTHS
// (current + TREND_MONTHS-1 prior), not a cumulative all-history view. Single source of truth
// for both consumers (the report section + the slope chart) so the window can be widened (e.g.
// to 6) in ONE place once enough clean history (incl. the post-#586 officialUptime field)
// accumulates. The "## N-Month Trend" heading derives N from the months actually present, so a
// change here — or an early report with fewer months — relabels automatically. (aiwatch-reports#41)
const TREND_MONTHS = 3

// Assemble the trend month-entries for `month`: prior months from `_data/`, the
// current month from `currentEntry` (built by the caller from the report/archive).
// Filters out months with no snapshot so a gap degrades gracefully.
function loadTrendEntries(month, currentEntry, opts = {}) {
  const { months = TREND_MONTHS, dataDir = path.resolve('_data') } = opts
  const entries = []
  for (const pm of monthsBefore(month, months - 1)) {
    const e = toMonthEntry(pm, readDataArchive(pm, dataDir))
    if (e) entries.push(e)
  }
  if (currentEntry) entries.push(currentEntry)
  return entries
}

// ── Trend slope chart ────────────────────────────────────
// All services render as faint context lines; the movers (decliners red, improvers
// green) are emphasized + end-labeled. Partial months get a "*" on the x-axis label.
function generateTrendSvg(trend, opts = {}) {
  const { nameFor = id => id, movers = computeScoreMovers(trend, { nameFor }) } = opts
  const { months, partialMonths, series } = trend

  const padding = { top: 50, right: 150, bottom: 40, left: 40 }
  const plotW = 360
  const plotH = 300
  const width = padding.left + plotW + padding.right
  const height = padding.top + plotH + padding.bottom

  const n = months.length
  const xFor = i => padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yFor = score => padding.top + plotH - (score / 100) * plotH

  // y gridlines + labels (0/25/50/75/100)
  const gridlines = [0, 25, 50, 75, 100].map(v => {
    const y = yFor(v)
    return [
      `  <line x1="${padding.left}" y1="${y}" x2="${padding.left + plotW}" y2="${y}" stroke="${COLORS.border}" stroke-width="1" opacity="0.5"/>`,
      `  <text x="${padding.left - 8}" y="${y + 4}" fill="${COLORS.textMuted}" font-size="10" font-family="ui-monospace,monospace" text-anchor="end">${v}</text>`,
    ].join('\n')
  }).join('\n')

  // x labels (month short name + "*" when partial)
  const xLabels = months.map((m, i) => {
    const [yr, mo] = m.split('-').map(Number)
    const name = new Date(yr, mo - 1).toLocaleString('en-US', { month: 'short' })
    const star = partialMonths.has(m) ? '*' : ''
    return `  <text x="${xFor(i)}" y="${padding.top + plotH + 20}" fill="${COLORS.textMuted}" font-size="11" font-family="ui-monospace,monospace" text-anchor="middle">${name}${star}</text>`
  }).join('\n')

  const moverIds = new Set([...movers.declining, ...movers.improving].map(m => m.id))
  const polyFor = (pts, stroke, strokeWidth, opacity) => {
    const drawn = pts.map((p, i) => ({ p, i })).filter(o => o.p.score !== null)
    if (drawn.length < 2) return ''
    const d = drawn.map(o => `${xFor(o.i).toFixed(1)},${yFor(o.p.score).toFixed(1)}`).join(' ')
    return `  <polyline points="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
  }

  // context lines (non-movers, faint)
  const contextLines = Object.values(series)
    .filter(s => !moverIds.has(s.id))
    .map(s => polyFor(s.points, COLORS.textMuted, 1, 0.18))
    .filter(Boolean)
    .join('\n')

  // mover lines (emphasized) + end labels
  const moverRows = [...movers.declining, ...movers.improving].map(m => {
    const color = m.delta < 0 ? COLORS.down : COLORS.operational
    const line = polyFor(m.points, color, 2.5, 0.95)
    const drawn = m.points.map((p, i) => ({ p, i })).filter(o => o.p.score !== null)
    const lastDrawn = drawn[drawn.length - 1]
    const label = lastDrawn
      ? `  <text x="${(xFor(lastDrawn.i) + 8).toFixed(1)}" y="${(yFor(lastDrawn.p.score) + 4).toFixed(1)}" fill="${color}" font-size="11" font-family="ui-monospace,monospace">${escapeXml(m.name)} ${fmtScoreDelta(m.delta)}</text>`
      : ''
    return [line, label].filter(Boolean).join('\n')
  }).filter(Boolean).join('\n')

  const partialNote = partialMonths.size
    ? `  <text x="${padding.left}" y="${height - 6}" fill="${COLORS.textMuted}" font-size="9" font-family="ui-monospace,monospace" opacity="0.7">* partial month — fewer days monitored; indicative only</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .chart-bg { fill: ${COLORS.bg}; }
    .chart-title { fill: ${COLORS.text}; }
  </style>
  <rect class="chart-bg" width="100%" height="100%" fill="${COLORS.bg}"/>
  <text x="${padding.left}" y="28" fill="${COLORS.text}" font-size="14" font-weight="600" font-family="ui-monospace,monospace" class="chart-title">AIWatch Score — ${n}-Month Trend</text>
${gridlines}
${xLabels}
${contextLines}
${moverRows}
${partialNote}
</svg>`
}

// ── Exports ──────────────────────────────────────────────
module.exports = {
  generateScoreBarSvg, generateUptimeHeatmapSvg, scoreColorByGrade,
  // trend (aiwatch-reports#41)
  monthsBefore, daysInMonthOf, readDataArchive, toMonthEntry, monthEntryFromScoreRows,
  buildTrendSeries, computeScoreMovers, computeNotableMovers, formatTrendArrow, fmtScoreDelta, loadTrendEntries,
  generateTrendSvg, nameToId, ID_TO_NAME, TREND_MONTHS,
}

// ── CLI ──────────────────────────────────────────────────
if (require.main === module) {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: node scripts/generate-charts.js <report.md>')
    console.error('Example: node scripts/generate-charts.js 2026-03/index.md')
    process.exit(1)
  }

  const reportPath = path.resolve(file)
  let md
  try {
    md = fs.readFileSync(reportPath, 'utf-8')
  } catch (err) {
    console.error(`Cannot read report file: ${reportPath}\n  ${err.message}`)
    process.exit(1)
  }

  const scores = parseTable(md, 'AIWatch Score')

  if (scores.length === 0) { console.error('Failed to parse AIWatch Score table. Check "## AIWatch Score" heading exists.'); process.exit(1) }
  // The Incident Summary renders as an HTML <table> (not a markdown pipe table), so parseTable()
  // can't read it and charts don't consume incident data anyway — the scores guard above is the
  // report-well-formedness check. A markdown-table guard here false-failed on zero-security months:
  // parseTable's non-greedy scan skipped the HTML table and matched the next markdown table further
  // down — the Security Alerts section, which is conditionally omitted (buildSecuritySection returns
  // '' when totalAlerts <= 0) — so the guard aborted the whole pipeline when it was absent (#49).

  const relDir = path.dirname(file)
  const monthMatch = relDir.match(/(\d{4}-\d{2})/)
  if (!monthMatch) {
    console.error(`Cannot extract YYYY-MM from path: ${relDir}\n  Expected format: 2026-03/index.md`)
    process.exit(1)
  }
  const monthKey = monthMatch[1]
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const outDir = path.resolve('assets', monthKey)
  fs.mkdirSync(outDir, { recursive: true })

  // Score chart (sync — no API needed)
  const scoreSvg = generateScoreBarSvg(scores)
  const scorePath = path.join(outDir, 'score-chart.svg')
  fs.writeFileSync(scorePath, scoreSvg + '\n', 'utf-8')
  console.log(`✓ ${scorePath}`)

  // 3-month trend chart (sync — prior months from committed _data/, current month
  // from this report's parsed Score table). Written only when ≥2 months are available
  // (a lone first month has no trend); the report's TREND_SECTION applies the same
  // gate so the `![](trend-chart.svg)` ref never dangles.
  const currentEntry = monthEntryFromScoreRows(monthKey, scores)
  const trendEntries = loadTrendEntries(monthKey, currentEntry, { dataDir: path.resolve('_data') })
  if (trendEntries.length >= 2) {
    const trend = buildTrendSeries(trendEntries)
    // No explicit `exclude` here (unlike the report-section path): the current-month entry is
    // built from the parsed AIWatch Score table, and buildScoreTable already drops the services
    // the report doesn't rank (NO_INCIDENT_FEED + stale), so an excluded service has a null
    // current-month score and computeScoreMovers' "score at both ends" guard filters it from
    // emphasis automatically — it can only ever appear as a faint context line. If the current
    // month is ever sourced from the full archive instead, pass the same exclude set here too.
    const movers = computeScoreMovers(trend, { nameFor: id => ID_TO_NAME[id] || id })
    const trendSvg = generateTrendSvg(trend, { nameFor: id => ID_TO_NAME[id] || id, movers })
    const trendPath = path.join(outDir, 'trend-chart.svg')
    fs.writeFileSync(trendPath, trendSvg + '\n', 'utf-8')
    console.log(`✓ ${trendPath} (${trendEntries.length} months: ${trend.months.join(', ')})`)
  } else {
    console.log(`• trend-chart.svg skipped — only ${trendEntries.length} month(s) of _data available (need ≥2)`)
  }

  // Uptime heatmap — fetch real data from API
  const API_URL = 'https://aiwatch-worker.p2c2kbf.workers.dev/api/uptime?days=' + daysInMonth
  console.log(`Fetching uptime data from ${API_URL}...`)

  fetch(API_URL, { signal: AbortSignal.timeout(30000) })
    .then(r => {
      if (!r.ok) throw new Error(`API returned HTTP ${r.status} ${r.statusText}`)
      return r.json()
    })
    .then(data => {
      const history = data.history
      if (!history || Object.keys(history).length === 0) {
        console.error('API returned no uptime history data. Cannot generate heatmap.')
        process.exit(1)
      }

      // Detect monitoring start day (first day with data)
      let monitoringStartDay = 1
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${monthKey}-${String(d).padStart(2, '0')}`
        if (history[key]) { monitoringStartDay = d; break }
      }

      // Detect last day with data
      let lastDataDay = daysInMonth
      for (let d = daysInMonth; d >= monitoringStartDay; d--) {
        const key = `${monthKey}-${String(d).padStart(2, '0')}`
        if (history[key]) { lastDataDay = d; break }
      }

      // Use all 42 services in category order (not just incident table)
      const serviceNames = CATEGORY_ORDER.map(id => ID_TO_NAME[id]).filter(Boolean)

      const heatmapSvg = generateUptimeHeatmapSvg(serviceNames, history, daysInMonth, monthKey, monitoringStartDay, lastDataDay)
      const heatmapPath = path.join(outDir, 'uptime-heatmap.svg')
      fs.writeFileSync(heatmapPath, heatmapSvg + '\n', 'utf-8')
      console.log(`✓ ${heatmapPath}`)
      console.log(`\nDone! Monitoring data: day ${monitoringStartDay}–${lastDataDay} (${lastDataDay - monitoringStartDay + 1} days)`)
    })
    .catch(err => {
      console.error('Failed to fetch uptime data:', err.message)
      process.exit(1)
    })
}
