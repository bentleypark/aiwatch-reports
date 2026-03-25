#!/usr/bin/env node
// generate-summary.js — Parse monthly report tables and generate Opening + TL;DR
// Usage: node scripts/generate-summary.js 2026-03/index.md

const fs = require('fs')
const path = require('path')

// ── Table parser ──────────────────────────────────────────
function parseTable(md, heading) {
  const re = new RegExp(`## ${heading}[\\s\\S]*?\\n(\\|.+\\|\\n\\|[-| ]+\\|\\n(?:\\|.+\\|\\n)*)`, 'i')
  const match = md.match(re)
  if (!match) return []
  const lines = match[1].trim().split('\n')
  const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean)
  return lines.slice(2).map(line => {
    const cells = line.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(s => s.trim())
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
  if (h > 0 && m === 0) return `${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Analysis engine ───────────────────────────────────────
function analyze(scores, incidents) {
  const ranked = scores.filter(r => r.Score && r.Score !== 'N/A')
  const unranked = scores.filter(r => !r.Score || r.Score === 'N/A')
  const top = ranked.slice(0, 3)
  const bottom = ranked.slice(-3).reverse()
  const excellent = ranked.filter(r => parseInt(r.Score) >= 85)
  const good = ranked.filter(r => parseInt(r.Score) >= 70 && parseInt(r.Score) < 85)
  const fair = ranked.filter(r => parseInt(r.Score) >= 55 && parseInt(r.Score) < 70)
  const degrading = ranked.filter(r => parseInt(r.Score) < 55)

  const withIncidents = incidents.filter(r => parseInt(r.Incidents) > 0)
  const zeroIncidents = incidents.filter(r => r.Incidents === '0')
  const totalDowntimeMins = withIncidents.reduce((sum, r) => sum + toMinutes(r['Total Downtime']), 0)

  const byCount = [...withIncidents].sort((a, b) => parseInt(b.Incidents) - parseInt(a.Incidents))
  const byRecovery = [...withIncidents]
    .filter(r => toMinutes(r['Avg Resolution']) > 0)
    .sort((a, b) => toMinutes(a['Avg Resolution']) - toMinutes(b['Avg Resolution']))

  const perfectServices = ranked.filter(r => parseInt(r.Score) === 100)

  // Best balance: score > 90, has incidents, lowest downtime
  const balanceCandidates = ranked
    .filter(r => {
      const score = parseInt(r.Score)
      const incRow = incidents.find(i => i.Service === r.Service)
      const hasInc = incRow && parseInt(incRow.Incidents) > 0
      return score > 90 && score < 100 && r.Confidence === 'High' && hasInc
    })
    .sort((a, b) => {
      const aDown = toMinutes(incidents.find(i => i.Service === a.Service)?.['Total Downtime'] ?? '—')
      const bDown = toMinutes(incidents.find(i => i.Service === b.Service)?.['Total Downtime'] ?? '—')
      return aDown - bDown
    })
  const balanceSvc = balanceCandidates[0] ?? ranked.find(r => parseInt(r.Score) >= 80 && parseInt(r.Score) < 100 && r.Confidence === 'High')

  return {
    ranked, unranked, top, bottom,
    excellent, good, fair, degrading,
    withIncidents, zeroIncidents, totalDowntimeMins,
    mostIncidents: byCount[0] ?? null,
    fastestRecovery: byRecovery[0] ?? null,
    slowestRecovery: byRecovery[byRecovery.length - 1] ?? null,
    perfectServices,
    balanceSvc: balanceSvc ?? null,
    isVolatile: totalDowntimeMins > 60 || degrading.length >= 2,
    isStable: totalDowntimeMins < 30 && degrading.length === 0,
    totalServices: incidents.length,
  }
}

// ── Text generators ───────────────────────────────────────
function generateOpening(monthYear, a) {
  if (a.isStable) {
    return `${monthYear} was a relatively stable month across all monitored services. ${a.top[0]?.Service} led the rankings with a score of ${a.top[0]?.Score}/100, while ${a.zeroIncidents.length} services recorded zero incidents.`
  }
  const topNames = a.top.map(r => r.Service)
  const topStable = topNames.length > 2
    ? topNames.slice(0, -1).join(', ') + ', and ' + topNames[topNames.length - 1]
    : topNames.join(' and ')
  const worstSvc = a.bottom[0]
  if (worstSvc && a.top.some(t => t.Service === worstSvc.Service)) {
    return `${monthYear}: ${a.withIncidents.length} out of ${a.totalServices} services recorded at least one incident, with a combined downtime of ${fmtDuration(a.totalDowntimeMins)}. ${topStable} led the reliability rankings.`
  }
  return `${monthYear} showed a clear divide: ${topStable} remained highly stable, while ${worstSvc?.Service} (${worstSvc?.Score}/100) experienced the most challenges. ${a.withIncidents.length} out of ${a.totalServices} services recorded at least one incident, with a combined downtime of ${fmtDuration(a.totalDowntimeMins)}.`
}

function generateTldr(a, incidents) {
  const lines = []

  // Most reliable
  if (a.perfectServices.length > 0) {
    lines.push(`- **Most reliable**: ${a.perfectServices.map(r => r.Service).join(', ')} (${a.perfectServices[0].Score}/100 — zero incidents, perfect uptime)`)
  } else {
    lines.push(`- **Most reliable**: ${a.top[0]?.Service} (${a.top[0]?.Score}/100)`)
  }

  // Best balance
  if (a.balanceSvc) {
    const incRow = incidents.find(r => r.Service === a.balanceSvc.Service)
    const downtime = incRow ? incRow['Total Downtime'] : '—'
    lines.push(`- **Best balance (stability + ecosystem)**: ${a.balanceSvc.Service} (${a.balanceSvc.Score}/100, only ${downtime} downtime)`)
  }

  // Riskiest
  if (a.bottom[0]) {
    const riskRow = incidents.find(r => r.Service === a.bottom[0].Service)
    lines.push(`- **Riskiest this month**: ${a.bottom[0].Service} (${a.bottom[0].Score}/100${riskRow ? `, ${riskRow['Total Downtime']} total downtime` : ''})`)
  }

  // Most incidents
  if (a.mostIncidents) {
    lines.push(`- **Most incidents**: ${a.mostIncidents.Service} (${a.mostIncidents.Incidents} incidents, ${a.mostIncidents['Total Downtime']} downtime)`)
  }

  // Recommendations
  lines.push('')
  lines.push('**Recommendations**')
  const primary = a.ranked.filter(r => parseInt(r.Score) >= 85 && r.Confidence === 'High')
  if (primary.length > 0) {
    lines.push(`- **Primary**: ${primary.slice(0, 2).map(r => r.Service).join(' or ')}`)
  }
  const fallback = a.ranked.filter(r => parseInt(r.Score) >= 80 && parseInt(r.Score) < 95 && r.Confidence === 'High')
  if (fallback.length > 0) {
    const fbText = fallback.slice(0, 2).map(r => {
      const incRow = incidents.find(i => i.Service === r.Service)
      const avg = incRow?.['Avg Resolution']
      return avg && avg !== '—' ? `${r.Service} (${avg} avg resolution)` : r.Service
    }).join(' or ')
    lines.push(`- **Fallback**: ${fbText}`)
  }

  // Recovery
  if (a.fastestRecovery && a.slowestRecovery) {
    lines.push(`\n**Recovery performance**: Fastest — ${a.fastestRecovery.Service} (${a.fastestRecovery['Avg Resolution']} avg). Slowest — ${a.slowestRecovery.Service} (${a.slowestRecovery['Avg Resolution']} avg).`)
  }

  return lines.join('\n')
}

function generateStats(a) {
  return [
    `Total services: ${a.totalServices}`,
    `Services with incidents: ${a.withIncidents.length}`,
    `Zero-incident services: ${a.zeroIncidents.length}`,
    `Combined downtime: ${fmtDuration(a.totalDowntimeMins)}`,
    `Grade distribution: ${a.excellent.length} Excellent, ${a.good.length} Good, ${a.fair.length} Fair, ${a.degrading.length} Degrading`,
    `Unranked (N/A): ${a.unranked.length}`,
  ].join('\n')
}

// ── Exports for testing ───────────────────────────────────
module.exports = { parseTable, toMinutes, fmtDuration, analyze, generateOpening, generateTldr, generateStats }

// ── CLI execution ─────────────────────────────────────────
if (require.main === module) {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: node scripts/generate-summary.js <report.md>')
    process.exit(1)
  }

  const md = fs.readFileSync(path.resolve(file), 'utf-8')
  const scores = parseTable(md, 'AIWatch Score')
  const incidents = parseTable(md, 'Incident Summary')

  if (scores.length === 0 || incidents.length === 0) {
    console.error('Failed to parse tables. Check heading names match.')
    process.exit(1)
  }

  const titleMatch = md.match(/^#\s+(\w+ \d{4})/m)
  const monthYear = titleMatch ? titleMatch[1] : '[MONTH] [YEAR]'

  const a = analyze(scores, incidents)

  console.log('═══════════════════════════════════════════')
  console.log('  OPENING NARRATIVE')
  console.log('═══════════════════════════════════════════\n')
  console.log(generateOpening(monthYear, a))

  console.log('\n═══════════════════════════════════════════')
  console.log('  TL;DR')
  console.log('═══════════════════════════════════════════\n')
  console.log(generateTldr(a, incidents))

  console.log('\n═══════════════════════════════════════════')
  console.log('  STATS')
  console.log('═══════════════════════════════════════════\n')
  console.log(generateStats(a))
}
