// generate-summary.js — Library: table parser + monthly-report analyzer/narrative generators.
// Consumed by generate-report.js (auto-draft narrative injection, and parseTableGroups for the prose
// lexicon) and generate-charts.js (parseTableGroups for the Score tables). NOT a CLI: the former
// standalone `node generate-summary.js <report>.md` path was removed (#52) — it re-parsed the
// rendered markdown, but the Incident
// Summary renders as an HTML <table> that the parser here (markdown pipe tables only) can't read, so
// analyze() ran on mis-parsed rows. generate-report.js feeds analyze() correct rows built directly
// from archive.services (archiveToAnalysisRows), superseding the CLI.

// ── Table parser ──────────────────────────────────────────
// Rows of ONE markdown pipe table (header line, separator line, then rows). Split out so the
// escaped-pipe cell split and the header→key mapping have a single home.
function parseTableText(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean)
  return lines.slice(2).map(line => {
    const cells = line.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(s => s.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
    return row
  })
}

// aiwatch-reports#106 — EVERY markdown pipe table under `## <heading>`, one row-array per table.
// The AIWatch Score section renders TWO tables in any month that carries medium-confidence services
// (buildScoreTable ranks the confidence tiers as separate sequences), and the callers here read the
// report back to build the score chart and the prose lexicon — so a first-table-only read would drop
// the second tier out of both while it sits visibly in the report. Returning GROUPS rather than one
// flat array also lets the chart mirror the tables' own separation instead of re-deriving it from a
// column, which would be wrong for legacy months (their single table can still contain "No uptime"
// rows — see scoreTier in generate-report.js).
//
// Bounded to the section: the next `## ` at the start of a line ends it. The predecessor of this
// function scanned PAST the section end for its first table, which once made a guard on a table-less
// section silently match the next section's table (#49).
//
// `heading` is a PREFIX (the Score heading carries a "— Month Year" suffix) and is escaped, so a
// caller may pass one containing regex metacharacters — `## Official Uptime (Primary Component)` is
// a real heading in this report, and unescaped it would match nothing and return `[]` silently.
// Anchored to a line start so prose mentioning `## AIWatch Score` mid-sentence, or a deeper
// `### AIWatch Score`, is not mistaken for the section.
function parseTableGroups(md, heading) {
  const esc = String(heading).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|\\n)##\\s+${esc}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i')
  const match = String(md).match(re)
  if (!match) return []
  const tables = match[1].match(/^\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*/gm) || []
  return tables.map(parseTableText)
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
// aiwatch-reports#106 — two populations, deliberately separate:
//   `ranked`   — every scored service. The month's CENSUS: grade distribution, `isStable`,
//                `unranked`. A claim like "a relatively stable month across all
//                monitored services" is only true if every service was counted, so nothing may be
//                filtered out of it.
//   `rankable` — the subset the report actually RANKS in its main table: one confidence tier (a
//                no-official-uptime Score is rescaled over 60, so it is not comparable) and present
//                in that table at all. Every pick derived from the SCORE order comes from here, so
//                the draft cannot call a service the month's best or worst on an incomparable number,
//                nor name one the reader will not find in the ranking.
// The INCIDENT-ordered picks (`mostIncidents`, `fastestRecovery`, `slowestRecovery`) are deliberately
// NOT gated: they rank on published incident counts and durations, which every tracked service has on
// the same footing — the incomparability this split exists for is a property of the Score, not of an
// incident count. That is also why held-out services keep every incident-derived figure in the draft.
// Rows with no `Rankable` key (hand-built, or a report parsed back out of markdown) count as
// rankable, so a caller that knows nothing about tiers behaves exactly as before.
function analyze(scores, incidents) {
  const ranked = scores.filter(r => r.Score && r.Score !== 'N/A')
  const rankable = ranked.filter(r => r.Rankable !== false)
  const unranked = scores.filter(r => !r.Score || r.Score === 'N/A')
  const top = rankable.slice(0, 3)
  const bottom = rankable.slice(-3).reverse()
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

  // "Most reliable" — an ordered pick, so rankable-only.
  const perfectServices = rankable.filter(r => parseInt(r.Score) === 100)

  return {
    ranked, rankable, unranked, top, bottom,
    excellent, good, fair, degrading,
    withIncidents, zeroIncidents, totalDowntimeMins,
    mostIncidents: byCount[0] ?? null,
    fastestRecovery: byRecovery[0] ?? null,
    slowestRecovery: byRecovery[byRecovery.length - 1] ?? null,
    perfectServices,
    isVolatile: totalDowntimeMins > 60 || degrading.length >= 2,
    isStable: totalDowntimeMins < 30 && degrading.length === 0,
    totalServices: incidents.length,
  }
}

// ── Text generators ───────────────────────────────────────
function generateOpening(monthYear, a) {
  if (a.isStable) {
    return `${monthYear} was a relatively stable month across all monitored services. ${a.top[0]?.Service} led the rankings with a score of ${a.top[0]?.Score}, while ${a.zeroIncidents.length} services recorded zero incidents.`
  }
  const topNames = a.top.map(r => r.Service)
  const topStable = topNames.length > 2
    ? topNames.slice(0, -1).join(', ') + ', and ' + topNames[topNames.length - 1]
    : topNames.join(' and ')
  const worstSvc = a.bottom[0]
  if (worstSvc && a.top.some(t => t.Service === worstSvc.Service)) {
    return `${monthYear}: ${a.withIncidents.length} out of ${a.totalServices} services recorded at least one incident, with a combined downtime of ${fmtDuration(a.totalDowntimeMins)}. ${topStable} led the reliability rankings.`
  }
  return `${monthYear} showed a clear divide: ${topStable} remained highly stable, while ${worstSvc?.Service} (${worstSvc?.Score}) experienced the most challenges. ${a.withIncidents.length} out of ${a.totalServices} services recorded at least one incident, with a combined downtime of ${fmtDuration(a.totalDowntimeMins)}.`
}

// `momByService` (aiwatch-reports#54 bonus) maps a service display name → { curr, prev }
// incident counts. When present for the "Most incidents" subject, the bullet is
// MoM-framed ("85 incidents … — 133 last month (−48)") so the default draft leads with
// the change a human otherwise adds by hand. Default {} → unchanged snapshot wording.
function generateTldr(a, incidents, momByService = {}) {
  const lines = []

  // Most reliable
  if (a.perfectServices.length > 0) {
    lines.push(`- **Most reliable**: ${a.perfectServices.map(r => r.Service).join(', ')} (${a.perfectServices[0].Score} — zero incidents, perfect uptime)`)
  } else {
    lines.push(`- **Most reliable**: ${a.top[0]?.Service} (${a.top[0]?.Score})`)
  }

  // Riskiest
  if (a.bottom[0]) {
    lines.push(`- **Riskiest this month**: ${a.bottom[0].Service} (${a.bottom[0].Score})`)
  }

  // Most incidents (MoM-framed when a prior-month count is available — #54 bonus)
  if (a.mostIncidents) {
    const mom = momByService[a.mostIncidents.Service]
    let momTail = ''
    if (mom && typeof mom.prev === 'number' && typeof mom.curr === 'number') {
      const d = mom.curr - mom.prev
      const delta = d === 0 ? '±0' : `${d > 0 ? '+' : '−'}${Math.abs(d)}`
      momTail = ` — ${mom.prev} last month (${delta})`
    }
    lines.push(`- **Most incidents**: ${a.mostIncidents.Service} (${a.mostIncidents.Incidents} incidents, ${a.mostIncidents['Total Downtime']} downtime${momTail})`)
  }

  // Recommendations
  lines.push('')
  lines.push('**Recommendations**')
  // Recommendations are ordered picks too — never recommend on an incomparable Score.
  const primary = a.rankable.filter(r => parseInt(r.Score) >= 85 && r.Confidence === 'High')
  if (primary.length > 0) {
    lines.push(`- **Primary**: ${primary.slice(0, 2).map(r => r.Service).join(' or ')}`)
  }
  const fallback = a.rankable.filter(r => parseInt(r.Score) >= 80 && parseInt(r.Score) < 95 && r.Confidence === 'High')
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
module.exports = { parseTableGroups, toMinutes, fmtDuration, analyze, generateOpening, generateTldr, generateStats }
