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
  replicate: 'Replicate', fal: 'fal.ai', elevenlabs: 'ElevenLabs', xai: 'xAI (Grok)',
  deepseek: 'DeepSeek API', openrouter: 'OpenRouter', bedrock: 'Amazon Bedrock',
  azureopenai: 'Azure OpenAI', pinecone: 'Pinecone', turbopuffer: 'turbopuffer', stability: 'Stability AI', bfl: 'Black Forest Labs (FLUX)',
  voyageai: 'Voyage AI', modal: 'Modal', twelvelabs: 'Twelve Labs', langsmith: 'LangChain (LangSmith)', helicone: 'Helicone', langfuse: 'Langfuse', runway: 'Runway', luma: 'Luma (Dream Machine)',
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
  'elevenlabs', 'assemblyai', 'deepgram', 'huggingface', 'replicate', 'fal', 'pinecone', 'turbopuffer',
  'stability', 'bfl', 'voyageai', 'modal', 'twelvelabs', 'langsmith', 'helicone', 'langfuse', 'runway', 'luma',
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
function generateUptimeHeatmapSvg(serviceNames, uptimeHistory, daysInMonth, monthKey, firstDataDay, lastDataDay) {
  // Render the span the caller vouched for. The caller asserts month coverage before getting here
  // (aiwatch-reports#77), so a late START means a deliberate --allow-partial run, not an unnoticed
  // short fetch. An early END is still normal: an in-progress month legitimately stops at today.
  const endDay = lastDataDay || daysInMonth
  const visibleDays = endDay - firstDataDay + 1

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
    const dayNum = firstDataDay + i
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
      const dayNum = firstDataDay + i
      const x = padding.left + labelWidth + i * (cellSize + cellGap)
      const dateKey = `${monthKey}-${String(dayNum).padStart(2, '0')}`
      const dayData = uptimeHistory[dateKey]?.[svcId]

      // A ratio we cannot compute is ABSENCE, not an outage. `{}` and `{ok:0,total:0}` both yield
      // NaN, which used to fall through to COLORS.down — painting a missing measurement red.
      // Gray is the only honest color for "we did not measure this" (aiwatch-reports#77).
      const ratio = dayData ? dayData.ok / dayData.total : NaN
      let color
      if (!Number.isFinite(ratio)) color = COLORS.noData
      else if (ratio >= 0.99) color = COLORS.operational
      else if (ratio >= 0.90) color = COLORS.heatDegraded
      else color = COLORS.down

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
    // Gray means "not measured that day" — a service onboarded mid-month, a day with no counters,
    // or a ratio we cannot compute. "Added Later" named only the first of the three.
    { color: COLORS.noData, label: 'No data' },
  ]
  const legend = legendItems.map((item, i) => {
    const x = padding.left + i * 110
    return [
      `  <rect x="${x}" y="${legendY}" width="10" height="10" rx="2" fill="${item.color}" opacity="0.85"/>`,
      `  <text x="${x + 14}" y="${legendY + 9}" fill="${COLORS.textMuted}" font-size="10" font-family="ui-monospace,monospace">${item.label}</text>`,
    ].join('\n')
  }).join('\n')
  // Footnote
  const footnote = `  <text x="${padding.left}" y="${height - 4}" fill="${COLORS.textMuted}" font-size="8" font-family="ui-monospace,monospace" opacity="0.7">Gray cells = no monitoring data for that service on that day (e.g. onboarded partway through the month)</text>`

  const [yr, mo] = monthKey.split('-').map(Number)
  const monthName = new Date(yr, mo - 1).toLocaleString('en-US', { month: 'long' })
  // Always state the span actually rendered. The old branch printed `1–daysInMonth` whenever
  // the chart started on the 1st, even when it ended early (in-progress month).
  const subtitle = `${monthName} ${firstDataDay}–${endDay} — based on AIWatch polling (5-min intervals)`

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

// The /api/uptime endpoint's `days` is a LOOKBACK WINDOW anchored to today: `days=N` returns
// [today-N+1, today]. It is not a count of days in some target month. Passing `daysInMonth`
// conflated the two, so a chart built after month-end silently began where the window happened to
// land — April's chart started on the 5th and May's on the 3rd while both headers read "1–30"/"1–31"
// (aiwatch-reports#77). Derive the window from the month's first day instead.
// 90 is BOTH limits at once, which is why widening the request would not help: /api/uptime caps
// ?days= at 90 (worker index.ts:3994), AND the `history:<date>` daily counters it reads are written
// with a 90-day KV TTL (index.ts:237). A month whose first day is more than 90 days before
// generation is unreachable through the endpoint and its counters are already evicted — there is no
// deeper source to point a wider window at.
const UPTIME_MAX_LOOKBACK_DAYS = 90

/** Days from `monthKey`'s first day through today, inclusive — before the retention cap. */
function uptimeLookbackSpan(monthKey, today = new Date()) {
  const [y, m] = String(monthKey).split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) throw new Error(`invalid monthKey ${monthKey} (expected YYYY-MM)`)
  const first = Date.UTC(y, m - 1, 1)
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  if (now < first) throw new Error(`${monthKey} has not started yet`)
  return Math.floor((now - first) / 86_400_000) + 1
}

/** Lookback window to request, capped at retention. Below the cap it equals uptimeLookbackSpan. */
function uptimeLookbackDays(monthKey, today = new Date()) {
  return Math.min(uptimeLookbackSpan(monthKey, today), UPTIME_MAX_LOOKBACK_DAYS)
}

/**
 * A day counts as covered only if it carries at least one service's counters. `{}` is the trap: it
 * is truthy, so an empty day-entry slips through a `!history[key]` check and renders as an all-gray
 * column — a chart with zero data that still passes the coverage gate. (`null`/`undefined` are
 * already falsy; guarded here so the predicate is total.)
 */
function hasDayData(entry) {
  return !!entry && typeof entry === 'object' && Object.keys(entry).length > 0
}

/**
 * Days of `monthKey` that the API response does not cover. Days still in the future are not
 * missing — an in-progress month legitimately ends at today.
 */
function missingMonthDays(history, monthKey, daysInMonth, today = new Date()) {
  const [y, m] = String(monthKey).split('-').map(Number)
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const missing = []
  for (let d = 1; d <= daysInMonth; d++) {
    if (Date.UTC(y, m - 1, d) > now) break
    const key = `${monthKey}-${String(d).padStart(2, '0')}`
    if (!hasDayData(history[key])) missing.push(key)
  }
  return missing
}

/** Days of `monthKey` that have already happened (the whole month, unless it is in progress). */
function elapsedMonthDays(monthKey, daysInMonth, today = new Date()) {
  const [y, m] = String(monthKey).split('-').map(Number)
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  let n = 0
  for (let d = 1; d <= daysInMonth; d++) {
    if (Date.UTC(y, m - 1, d) > now) break
    n++
  }
  return n
}

/**
 * One line naming the actual cause: a retention clamp (the month's head is unreachable, and no flag
 * brings it back) versus a hole inside a window we did fetch. The two need opposite responses, so
 * the message must not blur them.
 */
function explainWindow(monthKey, today = new Date()) {
  const span = uptimeLookbackSpan(monthKey, today)
  if (span <= UPTIME_MAX_LOOKBACK_DAYS) {
    return `Requested days=${span}, within the ${UPTIME_MAX_LOOKBACK_DAYS}-day history window, so the gap is in the data itself.`
  }
  const preamble = `Reaching ${monthKey}-01 needs a ${span}-day lookback, but uptime history only goes ` +
    `back ${UPTIME_MAX_LOOKBACK_DAYS} days (endpoint cap + counter TTL)`
  // `span - CAP` counts days before the window opens, which can exceed the month itself — a month
  // that ended before the window even begins loses ALL of its days, not "the first 42 of 31".
  const daysInMonth = daysInMonthOf(monthKey)
  const lost = Math.min(span - UPTIME_MAX_LOOKBACK_DAYS, daysInMonth)
  if (lost >= daysInMonth) return `${preamble} — all ${daysInMonth} days of ${monthKey} are permanently unreachable.`
  const subject = lost === 1 ? `the first day of ${monthKey} is` : `the first ${lost} days of ${monthKey} are`
  return `${preamble} — ${subject} permanently unreachable.`
}

/**
 * Decide whether a heatmap may be rendered. PURE — the CLI only prints and exits on this verdict.
 *
 * The ORDER is the contract, not an implementation detail: zero coverage is refused BEFORE
 * `allowPartial` is consulted, so no flag can produce an empty chart captioned as a full month.
 * That precedence is what a refactor could silently invert, which is why it lives here under test
 * rather than inline in the CLI.
 *
 * @returns {{action:'render'|'refuse', reason:'complete'|'partial'|'zero-coverage', missing:string[]}}
 */
function heatmapGate(history, monthKey, daysInMonth, today, { allowPartial = false } = {}) {
  const missing = missingMonthDays(history, monthKey, daysInMonth, today)
  if (missing.length === 0) return { action: 'render', reason: 'complete', missing }
  if (missing.length === elapsedMonthDays(monthKey, daysInMonth, today)) {
    return { action: 'refuse', reason: 'zero-coverage', missing }
  }
  if (!allowPartial) return { action: 'refuse', reason: 'partial', missing }
  return { action: 'render', reason: 'partial', missing }
}

/**
 * Human-readable summary of a gate verdict's missing days. Total by construction: an empty list is
 * not a gap to describe, and rendering it as "0 day(s) … (undefined)" would put a bug in an error
 * message. The CLI only calls this when `reason !== 'complete'`; this keeps that safe for any caller.
 */
function describeMissing(missing, monthKey) {
  if (!missing || missing.length === 0) return `no missing days in ${monthKey}`
  const span = missing.length > 1 ? `${missing[0]} … ${missing[missing.length - 1]}` : missing[0]
  const noun = missing.length === 1 ? 'day' : 'days'
  return `${missing.length} ${noun} of ${monthKey} absent from the API response (${span})`
}

/**
 * First and last day of `monthKey` that carry data. PURE. Shares `hasDayData` with the gate, so the
 * span rendered can never disagree with the span the gate vouched for — the last piece of #77 logic
 * that lived inline in the CLI, where a reverted truthy check or an off-by-one scan went unseen.
 * Returns null when nothing has data (the gate refuses that case before this is reached).
 */
function dataSpan(history, monthKey, daysInMonth) {
  const dayKey = d => `${monthKey}-${String(d).padStart(2, '0')}`
  let first = null
  for (let d = 1; d <= daysInMonth; d++) {
    if (hasDayData(history[dayKey(d)])) { first = d; break }
  }
  if (first === null) return null
  let last = first
  for (let d = daysInMonth; d >= first; d--) {
    if (hasDayData(history[dayKey(d)])) { last = d; break }
  }
  return { firstDataDay: first, lastDataDay: last }
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

// PURE. Filter the full category-ordered id list down to the roster that EXISTED in the
// report month — the ids present in that month's `_data/{month}.json` archive (the #909
// `existedInMonth` set). Drops services added AFTER the month (which would otherwise
// render as blank gray heatmap rows, aiwatch-reports#63), while KEEPING
// score-excluded-but-existed services (bedrock/azureopenai/characterai + the mid-month-
// added ones) — they still have that month's uptime. Criterion is archive membership,
// NOT "has a score". Fail-open: a null/empty roster (missing or corrupt snapshot) returns
// the full list unchanged, so the chart never breaks on a bad snapshot.
function rosterForMonth(categoryOrder, archiveServiceIds) {
  if (!archiveServiceIds || archiveServiceIds.length === 0) return categoryOrder
  const roster = new Set(archiveServiceIds)
  return categoryOrder.filter(id => roster.has(id))
}

// Normalize an archive-like object into a trend month-entry. `daysCollected`
// (when present) drives the partial-month flag; absent → assumed full.
/**
 * aiwatch#993 — resolve a service's report Score/grade from the archive. Prefer the CALENDAR-MONTH
 * value (`monthlyScore`/`monthlyGrade`, computed at build time over the same window as MTTR/downtime)
 * so every score in a monthly report shares one window; fall back to the build-day rolling snapshot
 * (`score`/`grade`) for archives written before #993, which carry neither monthly field. Used by BOTH
 * the trend/Notable-Movers path (toMonthEntry) and the report's ranking table / chart / Summary, so
 * the same month never shows two different scores. NOTE: a 3-month trend spanning the #993 cutover
 * mixes monthly-window points (post-#993 archives) with snapshot points (legacy archives, via the
 * fallback) — unavoidable since old archives cannot be back-filled, and not a bug.
 */
function resolveMonthlyScore(s) {
  if (!s) return { score: null, grade: null }
  // A MODERN archive always writes `monthlyScore` (the worker emits it even when null — a month it
  // deliberately WITHHELD for insufficient signal, #713). So key PRESENCE, not the value, marks a
  // modern archive: honor its value verbatim (number → use it; null → stay withheld, never borrow
  // the build-day snapshot, which would rank the service on data from outside the month). Only a
  // LEGACY archive (no `monthlyScore` key at all) falls back to the snapshot `score`/`grade`.
  if ('monthlyScore' in s) {
    return {
      score: typeof s.monthlyScore === 'number' ? s.monthlyScore : null,
      grade: s.monthlyGrade || null,
    }
  }
  return {
    score: typeof s.score === 'number' ? s.score : null,
    grade: s.grade || null,
  }
}

function toMonthEntry(month, archiveLike) {
  if (!archiveLike || !archiveLike.services) return null
  const services = {}
  for (const [id, s] of Object.entries(archiveLike.services)) {
    const resolved = resolveMonthlyScore(s)
    services[id] = {
      score: resolved.score,
      grade: resolved.grade,
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

/**
 * Median of a numeric array (sorted copy; deterministic). null for an empty array. Scales each
 * mover axis by its own typical magnitude (aiwatch-reports#78).
 */
function medianOf(values) {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
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

// ── Mover exclusion predicates (moved here from generate-report.js, aiwatch-reports#67) ──
// Single source of truth: both the Notable Movers TABLE (generate-report.js) and the trend
// CHART (this file's CLI) must exclude the SAME services, so they live next to
// computeNotableMovers and generate-report.js imports them from here.

// Services whose Score the WORKER WITHHOLDS: they publish no official uptime and have no latency
// probe, so only 2 of the Score's 4 components are measurable and `score.ts` emits `null` at
// `confidence: 'low'` rather than over-state a figure (aiwatch#713). Unrankable, and with no Score
// there is nothing to trend, so they're dropped from the ranking, the Notable Movers table and the
// trend chart alike.
//
// It was called NO_INCIDENT_FEED and justified as "no reliable incident feed (RSS only) — a blank
// incident count is monitoring coverage, not a verified zero". That is false: `worker/src/services.ts`
// gives bedrock the AWS Health public events JSON (aiwatch#677 — one event per incident, real start
// and end timestamps) and azureopenai an Azure RSS feed; both are read and archived, and bedrock's
// June 2026 archive carries a genuine incident. Their incidents are tracked. Their *uptime* is not.
const SCORE_WITHHELD = new Set(['bedrock', 'azureopenai'])

// Services whose status feed is FROZEN at the last reachable fetch: the incident count and uptime
// stop at that cutoff rather than covering the full month. The flag is cause-agnostic (DeepSeek's
// page was bot-walled behind Flashduty, aiwatch#507; Character.AI's was deactivated, aiwatch#689/
// #800) and reader-facing copy must not name a cause — we observe that a feed stopped, never why.
// Unlike SCORE_WITHHELD these DO carry an "official" uptime + an incident history, which is more
// insidious than having none: a partial-month count reads as a verified low number and the frozen
// uptime reads as current. The guard surfaces a caveat every report and stops a frozen zero-count
// from being labelled a "confirmed zero".
//   • deepseek — migrated Atlassian Statuspage → Flashduty (~May 2026). REMOVED here as of June
//     2026: AIWatch now reads the full Flashduty feed via a browser-rendered fetch (aiwatch#618),
//     so DeepSeek (and the new DeepSeek App, aiwatch#619) are no longer frozen. From the June 2026
//     archive onward their incidentSourceStale flag is absent → not stale; the May 2026 archive
//     still carries the flag, so a May regeneration stays correctly stale (flag-driven, below).
// Maintained constant — REMOVE a service here once its feed is reachable again (aiwatch#507).
// Empty today; reserved for a future status-page migration that re-freezes a feed.
const STALE_SOURCE = new Set([])

// aiwatch#591 — is a service's incident source stale this month? PRIMARY signal is the archive's
// per-service `incidentSourceStale` flag (the deployed Worker sets it from ServiceConfig; absent ⇒
// not stale on a post-#591 archive). The STALE_SOURCE constant is the FALLBACK for archives built
// before the Worker emitted the flag. Stale services are excluded from the Score ranking (their
// frozen empty incident window would inflate the Score — DeepSeek ranked #4 live before the fix).
function isStaleSource(s) {
  return !!(s.data.incidentSourceStale ?? STALE_SOURCE.has(s.id))
}

// reports#45 — a service added DURING (or after) the report month lacked full-month coverage, so its
// partial-month Score must not be ranked or featured in Notable Movers against full-month services
// (the report-side equivalent of aiwatch#802's <30d-coverage dashboard gate). Reads the static
// `addedAt` the monthly archive now exposes (aiwatch#809). `addedAt` absent = established service =
// full coverage. Compares YYYY-MM prefixes: addedAt in a PRIOR month → ranked; in the report month
// (or later) → excluded. `period` = the report month 'YYYY-MM'.
function isRecentlyAdded(s, period) {
  const addedAt = s && s.data && s.data.addedAt
  if (!addedAt || !period) return false
  return addedAt.slice(0, 7) >= period.slice(0, 7)
}

// PURE. Build the set of service ids the Notable Movers table / trend chart must exclude
// (services the Score ranking itself drops: SCORE_WITHHELD + stale source + mid-month-added).
// Keyed off `month`'s archive services. Fail-open: a null archive → empty set (the
// computeNotableMovers "score at both ends" guard still filters mid-month / null-score services).
function buildMoverExclude(archiveServices, month) {
  if (!archiveServices) return new Set()
  return new Set(
    Object.entries(archiveServices)
      .map(([id, data]) => ({ id, data }))
      .filter(s => SCORE_WITHHELD.has(s.id) || isStaleSource(s) || isRecentlyAdded(s, month)) // reports#45 — partial-month delta is not a real mover
      .map(s => s.id),
  )
}

// PURE. "Notable Movers" — the decision-grade list. Unlike computeScoreMovers (which ranks
// by Score delta only, for the slope chart's emphasis), this ranks by the LARGEST move across
// Score / MTTR / total-downtime — incident-feed MEASURED metrics — so a service with a FLAT
// score but a big recovery-time regression (e.g. Gemini Score 64→64 but MTTR 2h→22h) still
// surfaces; that's the "should I keep relying on this?" signal a composite score hides.
// `uptime` is intentionally excluded (see toMonthEntry: mixed sources / #586 over-count make it
// misleading and it hijacks the ranking). Each row carries all three deltas + which axis moved
// most (`emphasize`) so the renderer can bold it. Each axis is normalized by its OWN typical
// move this window (median absolute delta among services that moved on it,
// aiwatch-reports#78), so "1.0" means "a typical move for this axis" — NOT a fixed physical
// quantity. The old fixed divisors (/10, /60, /120) let downtime's hundreds-of-hours swings
// win every time (16/16 movers across both windows).
function computeNotableMovers(trend, opts = {}) {
  const { limit = 5, nameFor = id => id, exclude = new Set() } = opts
  const { months, series } = trend
  if (!months || months.length < 2) return []
  const firstMonth = months[0]
  const lastMonth = months[months.length - 1]

  // PASS 1 — collect every candidate's raw deltas. A candidate needs a Score at both window ends
  // so a mid-window-added service isn't a fake mover.
  const candidates = []
  for (const id of Object.keys(series)) {
    if (exclude.has(id)) continue // services the report doesn't rank (no-incident-feed / stale source)
    const pts = series[id].points
    const f = pts.find(p => p.month === firstMonth)
    const l = pts.find(p => p.month === lastMonth)
    if (!f || !l || f.score === null || l.score === null) continue

    // MTTR / downtime are sparse (null in a zero-incident month — common in a partial month like a
    // mid-month-onboarded March), so measure their delta over the months that HAVE data
    // (first-present → last-present), not the strict window endpoints. A single present point →
    // delta null (a value, not a trend). Score always uses the window endpoints.
    candidates.push({ id, f, l, pts, scoreDelta: l.score - f.score, mttr: presentDelta(pts, 'mttr'), downtime: presentDelta(pts, 'downtime') })
  }

  // Per-axis SCALE = median absolute delta among services that actually moved on that axis
  // (aiwatch-reports#78). "1.0" then means "a typical move for this axis", so downtime's
  // hundreds-of-hours swings no longer dwarf a Score change the way the old fixed /10, /60, /120
  // divisors did (they bolded downtime for 16 of 16 movers across both windows). Median (not mean)
  // so one outlier can't set the scale. Non-zero movers only, so the scale is positive by
  // construction and an axis nobody moved on simply contributes 0.
  // CAVEAT: on a sparse axis (only 2-3 movers, possible for MTTR/downtime in a low-incident
  // window) the median rests on a tiny sample, so a small absolute change that is merely large
  // RELATIVE to that median can rank high — a milder mirror of the bug this fixes. Real windows are
  // dense (~28 candidates); revisit with a scale floor or a min-movers gate if it ever bites.
  const absMovers = (pick) => candidates.map(pick).filter(d => d !== null).map(Math.abs).filter(x => x > 0)
  const scoreScale = medianOf(absMovers(c => c.scoreDelta))
  const mttrScale = medianOf(absMovers(c => c.mttr.delta))
  const downtimeScale = medianOf(absMovers(c => c.downtime.delta))
  const norm = (delta, scale) => (delta !== null && scale) ? Math.abs(delta) / scale : 0

  // PASS 2 — normalize and rank.
  const rows = []
  for (const { id, f, l, pts, scoreDelta, mttr, downtime } of candidates) {
    // norm(0, scale) === 0 already, so score needs no per-axis zero-guard; the scale side
    // (absMovers) is what keeps zeros out of the medians.
    const nScore = norm(scoreDelta, scoreScale)
    const nMttr = norm(mttr.delta, mttrScale)
    const nDowntime = norm(downtime.delta, downtimeScale)
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

// PURE. Reshape computeNotableMovers output → generateTrendSvg's { declining, improving } shape
// (aiwatch-reports#67), so the CHART emphasizes the SAME services the table ranks. generateTrendSvg
// colours/labels each line purely by `item.delta` (= SCORE delta), NOT by which array it's in — so
// the split here is organizational (kept for the interface shape), and a flat-Score row (delta 0)
// renders green / labelled "±0" even when the table marks it 🔻 (an MTTR/downtime regressor). That's
// accepted: on a Score-axis plot the line honestly shows the Score didn't move; the table below
// carries the headline metric. Flat rows are bucketed by the table's `declining` flag for tidiness.
function notableMoversForChart(notable) {
  const declining = [], improving = []
  for (const r of notable) {
    const item = { id: r.id, name: r.name, delta: r.score.delta, points: r.score.points }
    const up = r.score.delta > 0 || (r.score.delta === 0 && !r.declining) // flat Score → table's flag
    ;(up ? improving : declining).push(item)
  }
  return { declining, improving }
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

// PURE. De-collide a set of label y-anchors so none overlap: sort by y, greedily push
// any label closer than `minGap` to the previous one down to `prev + minGap`, then
// restore the input order. Returns a new array of adjusted ys (same order/length as
// input). Two labels at the same y separate by exactly `minGap`; already-spaced labels
// are untouched. Used for the trend chart's mover end-labels (aiwatch-reports#65).
// Greedy push-DOWN (never centers): safe because movers cap at 3+3=6, so the worst-case
// 72px spread fits the ~300px plot for realistic scores; only a pathological cluster of
// near-0 decliners could reach the plot bottom.
function spreadLabelYs(ys, minGap) {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  let prev = -Infinity
  for (const o of order) {
    if (o.y < prev + minGap) o.y = prev + minGap
    prev = o.y
  }
  const out = new Array(ys.length)
  for (const o of order) out[o.i] = o.y
  return out
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

  // mover lines (emphasized) + end labels. Labels anchor at the mover's final-score y;
  // two movers finishing at the same Score would collide, so the label y-positions are
  // de-collided (spreadLabelYs) — pushed apart to a minimum gap while the line still
  // ties each label to its series by colour/endpoint (aiwatch-reports#65).
  const moverList = [...movers.declining, ...movers.improving].map(m => {
    const color = m.delta < 0 ? COLORS.down : COLORS.operational
    const drawn = m.points.map((p, i) => ({ p, i })).filter(o => o.p.score !== null)
    const lastDrawn = drawn[drawn.length - 1]
    return {
      color,
      line: polyFor(m.points, color, 2.5, 0.95),
      labelX: lastDrawn ? xFor(lastDrawn.i) + 8 : null,
      labelYNatural: lastDrawn ? yFor(lastDrawn.p.score) + 4 : null,
      text: `${escapeXml(m.name)} ${fmtScoreDelta(m.delta)}`,
    }
  })
  const labeled = moverList.filter(o => o.labelYNatural !== null)
  const spreadYs = spreadLabelYs(labeled.map(o => o.labelYNatural), 12)
  labeled.forEach((o, k) => { o.labelY = spreadYs[k] })
  const moverRows = moverList.map(o => {
    const label = o.labelX !== null
      ? `  <text x="${o.labelX.toFixed(1)}" y="${o.labelY.toFixed(1)}" fill="${o.color}" font-size="11" font-family="ui-monospace,monospace">${o.text}</text>`
      : ''
    return [o.line, label].filter(Boolean).join('\n')
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
  monthsBefore, daysInMonthOf, readDataArchive, rosterForMonth, toMonthEntry, monthEntryFromScoreRows, resolveMonthlyScore,
  uptimeLookbackDays, uptimeLookbackSpan, explainWindow, missingMonthDays, elapsedMonthDays, hasDayData,
  heatmapGate, describeMissing, dataSpan, UPTIME_MAX_LOOKBACK_DAYS,
  buildTrendSeries, computeScoreMovers, computeNotableMovers, formatTrendArrow, fmtScoreDelta, loadTrendEntries,
  generateTrendSvg, spreadLabelYs, nameToId, ID_TO_NAME, TREND_MONTHS,
  // mover exclusion + chart-reshape (aiwatch-reports#67)
  SCORE_WITHHELD, STALE_SOURCE, isStaleSource, isRecentlyAdded, buildMoverExclude, notableMoversForChart,
  medianOf,
}

// ── CLI ──────────────────────────────────────────────────
if (require.main === module) {
  const argv = process.argv.slice(2)
  // Accept the flag in any position so `--allow-partial 2026-03/index.md` works too.
  const allowPartial = argv.includes('--allow-partial')
  const unknown = argv.filter(a => a.startsWith('--') && a !== '--allow-partial')
  if (unknown.length) {
    console.error(`Unknown option(s): ${unknown.join(', ')}`)
    process.exit(1)
  }
  const file = argv.find(a => !a.startsWith('--'))
  if (!file) {
    console.error('Usage: node scripts/generate-charts.js <report.md> [--allow-partial]')
    console.error('Example: node scripts/generate-charts.js 2026-03/index.md')
    console.error('  --allow-partial  render even if the API response misses days of the month')
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

  // 3-month trend chart (sync — prior months from committed _data/). The CURRENT month is
  // built from THIS month's archive snapshot (toMonthEntry) so it carries MTTR + downtime —
  // the Notable-Movers ranking axes — exactly like the report table's current entry; it falls
  // back to the parsed Score table (score/grade only) when the snapshot is absent. Building it
  // from the Score table alone would drop MTTR/downtime-driven movers (a flat-Score service
  // with an MTTR spike), diverging from the table (#67). Written only when ≥2 months are
  // available; the report's TREND_SECTION applies the same gate so the ref never dangles.
  const monthArchive = readDataArchive(monthKey, path.resolve('_data'))
  const currentEntry = monthArchive
    ? toMonthEntry(monthKey, monthArchive)
    : monthEntryFromScoreRows(monthKey, scores)
  const trendEntries = loadTrendEntries(monthKey, currentEntry, { dataDir: path.resolve('_data') })
  if (trendEntries.length >= 2) {
    const trend = buildTrendSeries(trendEntries)
    // aiwatch-reports#67 — emphasize the SAME services as the report's Notable Movers TABLE
    // (Score/MTTR/downtime ranking) rather than a Score-delta-only slope, so the chart and the
    // table can never highlight different services. Uses the SAME exclude as the table, keyed off
    // the current month's archive. Fail-open: a missing/corrupt `_data/{month}.json` → empty
    // exclude (computeNotableMovers' "score at both ends" guard still filters mid-month / null-
    // score services). notableMoversForChart reshapes the table rows → the chart's {declining,
    // improving} shape, split by SCORE delta since generateTrendSvg is a Score-axis plot.
    const exclude = buildMoverExclude(monthArchive && monthArchive.services ? monthArchive.services : null, monthKey)
    const notable = computeNotableMovers(trend, { nameFor: id => ID_TO_NAME[id] || id, exclude })
    const movers = notableMoversForChart(notable)
    const trendSvg = generateTrendSvg(trend, { nameFor: id => ID_TO_NAME[id] || id, movers })
    const trendPath = path.join(outDir, 'trend-chart.svg')
    fs.writeFileSync(trendPath, trendSvg + '\n', 'utf-8')
    console.log(`✓ ${trendPath} (${trendEntries.length} months: ${trend.months.join(', ')})`)
  } else {
    console.log(`• trend-chart.svg skipped — only ${trendEntries.length} month(s) of _data available (need ≥2)`)
  }

  // Uptime heatmap — fetch real data from API
  // One clock for the whole run: the fetch can take 30s, and re-reading `new Date()` afterwards
  // could cross midnight UTC and shift the elapsed-day count under us.
  const today = new Date()
  let lookbackDays
  try {
    lookbackDays = uptimeLookbackDays(monthKey, today)
  } catch (err) {
    // Matches this file's convention (one actionable line, not a stack dump) — reachable from a
    // real path: `2026-13/index.md` parses, and `2027-01/index.md` is simply in the future.
    console.error(`✗ Cannot determine the uptime window: ${err.message}`)
    process.exit(1)
  }
  const API_URL = 'https://aiwatch-worker.p2c2kbf.workers.dev/api/uptime?days=' + lookbackDays
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

      // aiwatch-reports#77 — a day absent from the response means NOT FETCHED or OUTSIDE
      // RETENTION. It never means "monitoring had not started".
      const gate = heatmapGate(history, monthKey, daysInMonth, today, { allowPartial })
      if (gate.reason !== 'complete') {
        const msg = describeMissing(gate.missing, monthKey)
        if (gate.reason === 'zero-coverage') {
          // Do NOT assert "outside retention" here: the same verdict is reached by a transient API
          // failure, a response carrying only adjacent-month days, and a current month whose first
          // daily counter has not been written yet. Two of those are fixed by re-running.
          console.error(`✗ Heatmap has NO data for any elapsed day of ${monthKey}: ${msg}`)
          console.error(`  ${explainWindow(monthKey, today)}`)
          console.error(`  Possible causes: the month is older than the ${UPTIME_MAX_LOOKBACK_DAYS}-day history window, the API returned nothing usable,`)
          console.error(`  or ${monthKey} is the current month and no daily counter exists yet.`)
          console.error(`  --allow-partial buys a narrower chart, never an empty one. Nothing to render.`)
          process.exit(1)
        }
        if (gate.action === 'refuse') {
          console.error(`✗ Heatmap coverage gap: ${msg}`)
          console.error(`  ${explainWindow(monthKey, today)}`)
          console.error(`  If the gap is genuine, re-run with --allow-partial to render a narrower chart on purpose.`)
          process.exit(1)
        }
        console.warn(`⚠ Heatmap coverage gap: ${msg} — rendering a partial chart (--allow-partial)`)
      }

      // The gate above guarantees at least one day has data, so dataSpan cannot return null;
      // fail loudly rather than render a chart from a span we did not compute.
      const span = dataSpan(history, monthKey, daysInMonth)
      if (!span) {
        console.error(`✗ Internal: coverage gate passed but no day of ${monthKey} carries data.`)
        process.exit(1)
      }
      const { firstDataDay, lastDataDay } = span

      // Roster = services that EXISTED in the report month (that month's archive keys),
      // not the current live CATEGORY_ORDER — otherwise services added AFTER the month
      // (e.g. turbopuffer / Twelve Labs for a June report) render as blank gray
      // rows (aiwatch-reports#63). Score-excluded-but-existed services stay (the criterion
      // is archive membership, not "has a score"). Fail-open to the full list if absent.
      const monthArchive = readDataArchive(monthKey, path.resolve('_data'))
      const rosterIds = rosterForMonth(
        CATEGORY_ORDER,
        monthArchive && monthArchive.services ? Object.keys(monthArchive.services) : null,
      )
      const serviceNames = rosterIds.map(id => ID_TO_NAME[id]).filter(Boolean)

      const heatmapSvg = generateUptimeHeatmapSvg(serviceNames, history, daysInMonth, monthKey, firstDataDay, lastDataDay)
      const heatmapPath = path.join(outDir, 'uptime-heatmap.svg')
      fs.writeFileSync(heatmapPath, heatmapSvg + '\n', 'utf-8')
      console.log(`✓ ${heatmapPath}`)
      console.log(`\nDone! Heatmap span: ${monthKey}-${String(firstDataDay).padStart(2, '0')} … ${monthKey}-${String(lastDataDay).padStart(2, '0')} (${lastDataDay - firstDataDay + 1} days)`)
    })
    .catch(err => {
      // This catch spans the whole chain, not just the network call — a write EACCES or a render
      // throw lands here too. Stay neutral rather than sending the reader after the network.
      console.error('✗ Heatmap generation failed:', err.message)
      process.exit(1)
    })
}
