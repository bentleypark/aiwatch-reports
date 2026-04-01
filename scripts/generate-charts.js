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
  together: 'Together AI', perplexity: 'Perplexity', huggingface: 'Hugging Face',
  replicate: 'Replicate', elevenlabs: 'ElevenLabs', xai: 'xAI (Grok)',
  deepseek: 'DeepSeek API', openrouter: 'OpenRouter', bedrock: 'Amazon Bedrock',
  azureopenai: 'Azure OpenAI', pinecone: 'Pinecone', stability: 'Stability AI',
  claudeai: 'claude.ai', chatgpt: 'ChatGPT', characterai: 'Character.AI',
  claudecode: 'Claude Code', copilot: 'GitHub Copilot', cursor: 'Cursor',
  windsurf: 'Windsurf',
}

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
  const width = padding.left + labelWidth + gridWidth + padding.right
  const height = padding.top + serviceNames.length * (cellSize + cellGap) + padding.bottom + 16

  // Day number headers — only visible days
  const dayHeaders = Array.from({ length: visibleDays }, (_, i) => {
    const dayNum = monitoringStartDay + i
    const x = padding.left + labelWidth + i * (cellSize + cellGap)
    const interval = visibleDays <= 15 ? 3 : 5
    const show = i === 0 || dayNum % interval === 1 || i === visibleDays - 1
    return show ? `  <text x="${x + cellSize / 2}" y="${padding.top - 8}" fill="${COLORS.textMuted}" font-size="9" font-family="ui-monospace,monospace" text-anchor="middle">${dayNum}</text>` : ''
  }).filter(Boolean).join('\n')

  // Sort services: full-data services first, then partial-data (by data coverage desc)
  const sortedNames = [...serviceNames].sort((a, b) => {
    const aId = nameToId(a), bId = nameToId(b)
    let aCount = 0, bCount = 0
    for (let i = 0; i < visibleDays; i++) {
      const dayNum = monitoringStartDay + i
      const dateKey = `${monthKey}-${String(dayNum).padStart(2, '0')}`
      if (uptimeHistory[dateKey]?.[aId]) aCount++
      if (uptimeHistory[dateKey]?.[bId]) bCount++
    }
    return bCount - aCount
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

  // Legend — aligned to left padding for consistent visibility
  const legendY = height - 28
  const legendItems = [
    { color: COLORS.operational, label: 'Operational' },
    { color: COLORS.heatDegraded, label: 'Degraded' },
    { color: COLORS.down, label: 'Down' },
    { color: COLORS.noData, label: 'Not Monitored' },
  ]
  const legend = legendItems.map((item, i) => {
    const x = padding.left + i * 110
    return [
      `  <rect x="${x}" y="${legendY}" width="10" height="10" rx="2" fill="${item.color}" opacity="0.85"/>`,
      `  <text x="${x + 14}" y="${legendY + 9}" fill="${COLORS.textMuted}" font-size="10" font-family="ui-monospace,monospace">${item.label}</text>`,
    ].join('\n')
  }).join('\n')
  // Footnote
  const footnote = `  <text x="${padding.left}" y="${height - 6}" fill="${COLORS.textMuted}" font-size="8" font-family="ui-monospace,monospace" opacity="0.7">Gray areas indicate periods before a service was added to AIWatch monitoring.</text>`

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

// ── Exports ──────────────────────────────────────────────
module.exports = { generateScoreBarSvg, generateUptimeHeatmapSvg, scoreColorByGrade }

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
  const incidents = parseTable(md, 'Incident Summary')

  if (scores.length === 0) { console.error('Failed to parse AIWatch Score table. Check "## AIWatch Score" heading exists.'); process.exit(1) }
  if (incidents.length === 0) { console.error('Failed to parse Incident Summary table. Check "## Incident Summary" heading exists.'); process.exit(1) }

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

      const serviceNames = incidents.map(r => r.Service)

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
