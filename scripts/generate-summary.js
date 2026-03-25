#!/usr/bin/env node
// generate-summary.js — Parse monthly report tables and generate Opening + TL;DR
// Usage: node scripts/generate-summary.js 2026-03/index.md

const fs = require('fs')
const path = require('path')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/generate-summary.js <report.md>')
  process.exit(1)
}

const md = fs.readFileSync(path.resolve(file), 'utf-8')

// ── Table parser ──────────────────────────────────────────
function parseTable(md, heading) {
  const re = new RegExp(`## ${heading}[\\s\\S]*?\\n(\\|.+\\|\\n\\|[-| ]+\\|\\n(?:\\|.+\\|\\n)*)`, 'i')
  const match = md.match(re)
  if (!match) return []
  const lines = match[1].trim().split('\n')
  const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean)
  return lines.slice(2).map(line => {
    const cells = line.split('|').map(s => s.trim()).filter(Boolean)
    const row = {}
    headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
    return row
  })
}

// ── Parse duration string to minutes ──────────────────────
function toMinutes(str) {
  if (!str || str === '—' || str === 'N/A') return 0
  str = str.replace(/^~/, '')
  const h = str.match(/(\d+)h/)
  const m = str.match(/(\d+)m/)
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0)
}

function fmtDuration(mins) {
  if (mins === 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Parse tables ──────────────────────────────────────────
const scores = parseTable(md, 'AIWatch Score')
const incidents = parseTable(md, 'Incident Summary')

if (scores.length === 0 || incidents.length === 0) {
  console.error('Failed to parse tables. Check heading names match.')
  process.exit(1)
}

// ── Analyze Score data ────────────────────────────────────
const ranked = scores.filter(r => r.Score && r.Score !== 'N/A')
const unranked = scores.filter(r => !r.Score || r.Score === 'N/A')
const top = ranked.slice(0, 3)
const bottom = ranked.slice(-3).reverse()
const excellent = ranked.filter(r => parseInt(r.Score) >= 85)
const degrading = ranked.filter(r => parseInt(r.Score) < 55)

// ── Analyze Incident data ─────────────────────────────────
const withIncidents = incidents.filter(r => parseInt(r.Incidents) > 0)
const zeroIncidents = incidents.filter(r => r.Incidents === '0')
const totalDowntimeMins = withIncidents.reduce((sum, r) => sum + toMinutes(r['Total Downtime']), 0)

// Sort by downtime
const byDowntime = [...withIncidents].sort((a, b) => toMinutes(b['Total Downtime']) - toMinutes(a['Total Downtime']))
const mostDowntime = byDowntime[0]
const leastDowntime = byDowntime[byDowntime.length - 1]

// Sort by incident count
const byCount = [...withIncidents].sort((a, b) => parseInt(b.Incidents) - parseInt(a.Incidents))
const mostIncidents = byCount[0]

// Fastest recovery
const byRecovery = [...withIncidents]
  .filter(r => toMinutes(r['Avg Resolution']) > 0)
  .sort((a, b) => toMinutes(a['Avg Resolution']) - toMinutes(b['Avg Resolution']))
const fastestRecovery = byRecovery[0]
const slowestRecovery = byRecovery[byRecovery.length - 1]

// ── Extract month from frontmatter ────────────────────────
const titleMatch = md.match(/^#\s+(\w+ \d{4})/m)
const monthYear = titleMatch ? titleMatch[1] : '[MONTH] [YEAR]'

// ── Determine overall tone ────────────────────────────────
const isVolatile = totalDowntimeMins > 60 || degrading.length >= 2
const isStable = totalDowntimeMins < 30 && degrading.length === 0

// ── Generate Opening Narrative ────────────────────────────
console.log('═══════════════════════════════════════════')
console.log('  OPENING NARRATIVE')
console.log('═══════════════════════════════════════════\n')

if (isStable) {
  console.log(`${monthYear} was a relatively stable month across all monitored services. ${top[0]?.Service} led the rankings with a score of ${top[0]?.Score}/100, while ${zeroIncidents.length} services recorded zero incidents.`)
} else {
  const topNames = top.map(r => r.Service)
  const topStable = topNames.length > 2
    ? topNames.slice(0, -1).join(', ') + ', and ' + topNames[topNames.length - 1]
    : topNames.join(' and ')
  const worstSvc = bottom[0]?.Service
  const worstScore = bottom[0]?.Score
  console.log(`${monthYear} showed a clear divide: ${topStable} remained highly stable, while ${worstSvc} (${worstScore}/100) experienced the most challenges. ${withIncidents.length} out of ${incidents.length} services recorded at least one incident, with a combined downtime of ${fmtDuration(totalDowntimeMins)}.`)
}

// ── Generate TL;DR ────────────────────────────────────────
console.log('\n═══════════════════════════════════════════')
console.log('  TL;DR')
console.log('═══════════════════════════════════════════\n')

// Most reliable
const perfectServices = ranked.filter(r => parseInt(r.Score) === 100)
if (perfectServices.length > 0) {
  console.log(`- **Most reliable**: ${perfectServices.map(r => r.Service).join(', ')} (${perfectServices[0].Score}/100 — zero incidents, perfect uptime)`)
} else {
  console.log(`- **Most reliable**: ${top[0]?.Service} (${top[0]?.Score}/100)`)
}

// Best balance — high score + has incidents (proves active monitoring) + low downtime
const balanceSvc = ranked.find(r => {
  const score = parseInt(r.Score)
  const incRow = incidents.find(i => i.Service === r.Service)
  const hasIncidents = incRow && parseInt(incRow.Incidents) > 0
  return score >= 80 && score < 100 && r.Confidence === 'High' && hasIncidents
})
if (balanceSvc) {
  const incRow = incidents.find(r => r.Service === balanceSvc.Service)
  const downtime = incRow ? incRow['Total Downtime'] : '—'
  console.log(`- **Best balance (stability + ecosystem)**: ${balanceSvc.Service} (${balanceSvc.Score}/100, only ${downtime} downtime)`)
}

// Riskiest
if (bottom[0]) {
  const riskRow = incidents.find(r => r.Service === bottom[0].Service)
  console.log(`- **Riskiest this month**: ${bottom[0].Service} (${bottom[0].Score}/100${riskRow ? `, ${riskRow['Total Downtime']} total downtime` : ''})`)
}

// Most incidents
if (mostIncidents) {
  console.log(`- **Most incidents**: ${mostIncidents.Service} (${mostIncidents.Incidents} incidents, ${mostIncidents['Total Downtime']} downtime)`)
}

console.log('\n**Recommendations**')

// Primary recommendation
const primaryCandidates = ranked.filter(r => parseInt(r.Score) >= 85 && r.Confidence === 'High')
if (primaryCandidates.length > 0) {
  const names = primaryCandidates.slice(0, 2).map(r => r.Service).join(' or ')
  console.log(`- **Primary**: ${names}`)
}

// Fallback
const fallbackCandidates = ranked.filter(r => parseInt(r.Score) >= 80 && parseInt(r.Score) < 95 && r.Confidence === 'High')
if (fallbackCandidates.length > 0) {
  const fb = fallbackCandidates.slice(0, 2)
  const fbText = fb.map(r => {
    const incRow = incidents.find(i => i.Service === r.Service)
    const avg = incRow?.['Avg Resolution']
    return avg && avg !== '—' ? `${r.Service} (${avg} avg resolution)` : r.Service
  }).join(' or ')
  console.log(`- **Fallback**: ${fbText}`)
}

// Recovery stats
if (fastestRecovery) {
  console.log(`\n**Recovery performance**: Fastest — ${fastestRecovery.Service} (${fastestRecovery['Avg Resolution']} avg). Slowest — ${slowestRecovery.Service} (${slowestRecovery['Avg Resolution']} avg).`)
}

// ── Stats summary ─────────────────────────────────────────
console.log('\n═══════════════════════════════════════════')
console.log('  STATS')
console.log('═══════════════════════════════════════════\n')
console.log(`Total services: ${incidents.length}`)
console.log(`Services with incidents: ${withIncidents.length}`)
console.log(`Zero-incident services: ${zeroIncidents.length}`)
console.log(`Combined downtime: ${fmtDuration(totalDowntimeMins)}`)
console.log(`Grade distribution: ${excellent.length} Excellent, ${ranked.filter(r => parseInt(r.Score) >= 70 && parseInt(r.Score) < 85).length} Good, ${ranked.filter(r => parseInt(r.Score) >= 55 && parseInt(r.Score) < 70).length} Fair, ${degrading.length} Degrading`)
console.log(`Unranked (N/A): ${unranked.length}`)
