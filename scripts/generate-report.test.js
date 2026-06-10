const {
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
  fmtLeadMin,
  monthName,
  lastDayOfMonth,
  nextMonthName,
  replaceTableBody,
  fillTemplate,
} = require('./generate-report')
const assert = require('assert')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${err.message}`)
  }
}

function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

// ── Formatters ───────────────────────────────────────────
console.log('\nfmtPercent')
test('formats two decimals', () => eq(fmtPercent(99.987), '99.99%'))
test('handles null', () => eq(fmtPercent(null), '—'))
test('handles undefined', () => eq(fmtPercent(undefined), '—'))
test('handles NaN', () => eq(fmtPercent(NaN), '—'))

console.log('\nfmtMs')
test('rounds to integer', () => eq(fmtMs(123.7), '124ms'))
test('handles null', () => eq(fmtMs(null), '—'))

console.log('\nfmtDurationMin')
test('returns em dash for 0', () => eq(fmtDurationMin(0), '—'))
test('returns em dash for null', () => eq(fmtDurationMin(null), '—'))
test('formats minutes only', () => eq(fmtDurationMin(45), '45m'))
test('formats whole hours', () => eq(fmtDurationMin(120), '2h'))
test('formats hours + minutes', () => eq(fmtDurationMin(95), '1h 35m'))

// ── Ranking ──────────────────────────────────────────────
console.log('\ncompetitionRank')
test('unique values get sequential ranks', () => {
  const ranks = competitionRank([{ v: 100 }, { v: 90 }, { v: 80 }], x => x.v)
  eq(ranks[0].rankLabel, '1')
  eq(ranks[1].rankLabel, '2')
  eq(ranks[2].rankLabel, '3')
})
test('tied values get "N=" suffix', () => {
  const ranks = competitionRank([{ v: 100 }, { v: 100 }, { v: 99 }], x => x.v)
  eq(ranks[0].rankLabel, '1=')
  eq(ranks[1].rankLabel, '1=')
  eq(ranks[2].rankLabel, '3') // competition ranking: skip 2, next is 3
})
test('three-way tie', () => {
  const ranks = competitionRank([{ v: 86 }, { v: 86 }, { v: 86 }, { v: 75 }], x => x.v)
  eq(ranks[0].rankLabel, '1=')
  eq(ranks[1].rankLabel, '1=')
  eq(ranks[2].rankLabel, '1=')
  eq(ranks[3].rankLabel, '4')
})

// ── Why text ─────────────────────────────────────────────
console.log('\nbuildWhy')
test('zero incidents with uptime (official service)', () => {
  const w = buildWhy({ data: { incidents: 0, uptime: 100, avgResolutionMin: null } }, 'cohere')
  eq(w, 'Zero incidents, 100.00% uptime')
})
test('zero incidents no uptime data', () => {
  const w = buildWhy({ data: { incidents: 0, uptime: null, avgResolutionMin: null } }, 'cohere')
  eq(w, 'Zero incidents')
})
test('zero incidents, estimate-uptime service → "(no published 30-day uptime)" (#29)', () => {
  // perplexity is in NO_PUBLIC_UPTIME — must NOT assert "Zero incidents, X% uptime"
  const w = buildWhy({ data: { incidents: 0, uptime: 99.5, avgResolutionMin: null } }, 'perplexity')
  eq(w, 'Zero incidents (no published 30-day uptime)')
})
test('many incidents with fast recovery', () => {
  const w = buildWhy({ data: { incidents: 20, uptime: 99.5, avgResolutionMin: 25 } })
  assert.ok(w.includes('20 incidents'), `got: ${w}`)
  assert.ok(w.includes('fast recovery'), `got: ${w}`)
})

// ── Grade + confidence ───────────────────────────────────
console.log('\ngradeLabel')
test('capitalizes grade', () => eq(gradeLabel('excellent'), 'Excellent'))
test('handles null', () => eq(gradeLabel(null), '—'))

console.log('\nconfidence (analyzer signal — still used by generate-summary)')
test('High when uptime + incidents present', () => {
  eq(confidence({ data: { uptime: 99.5, incidents: 3 } }), 'High')
})
test('Medium when uptime null', () => {
  eq(confidence({ data: { uptime: null, incidents: 3 } }), 'Medium')
})

console.log('\nuptimeSourceLabel (#29)')
test('Official for a status-page-read service', () => {
  eq(uptimeSourceLabel('cohere'), 'Official')
})
test('Estimate for a NO_PUBLIC_UPTIME service', () => {
  eq(uptimeSourceLabel('perplexity'), 'Estimate')
  eq(uptimeSourceLabel('bedrock'), 'Estimate')
})

console.log('\nbuildRankingNote (#29)')
test('names the NO_INCIDENT_FEED services excluded from the ranking', () => {
  const services = [
    { id: 'modal', data: { score: 97 } },
    { id: 'bedrock', data: { score: 90 } },
    { id: 'azureopenai', data: { score: 90 } },
  ]
  const meta = { modal: { name: 'Modal' }, bedrock: { name: 'Amazon Bedrock' }, azureopenai: { name: 'Azure OpenAI' } }
  const note = buildRankingNote(services, meta)
  assert.ok(note.includes('1 of 3 services ranked'), `got: ${note}`)
  assert.ok(note.includes('Amazon Bedrock and Azure OpenAI'), `got: ${note}`)
  assert.ok(note.includes('excluded from this ranking'), `got: ${note}`)
})
test('returns empty string when nothing is excluded', () => {
  const services = [{ id: 'modal', data: { score: 97 } }, { id: 'cohere', data: { score: 89 } }]
  eq(buildRankingNote(services, { modal: { name: 'Modal' }, cohere: { name: 'Cohere API' } }), '')
})

// ── Date helpers ─────────────────────────────────────────
console.log('\nmonthName')
test('April', () => eq(monthName('2026-04'), 'April'))
test('December', () => eq(monthName('2026-12'), 'December'))

console.log('\nlastDayOfMonth')
test('Feb 2026 (non-leap)', () => eq(lastDayOfMonth('2026-02'), 28))
test('Apr 2026', () => eq(lastDayOfMonth('2026-04'), 30))
test('Mar 2026', () => eq(lastDayOfMonth('2026-03'), 31))

console.log('\nnextMonthName')
test('April → May', () => {
  const n = nextMonthName('2026-04')
  eq(n.name, 'May')
  eq(n.year, 2026)
})
test('December → January (year rollover)', () => {
  const n = nextMonthName('2026-12')
  eq(n.name, 'January')
  eq(n.year, 2027)
})

// ── Table builders ───────────────────────────────────────
const sampleServices = [
  { id: 'cohere', data: { score: 100, grade: 'excellent', uptime: 100.00, incidents: 0, avgResolutionMin: null, avgLatencyMs: 230 } },
  { id: 'openai', data: { score: 88, grade: 'excellent', uptime: 99.60, incidents: 1, avgResolutionMin: 176, avgLatencyMs: 310 } },
  { id: 'claude', data: { score: 59, grade: 'fair', uptime: 97.80, incidents: 9, avgResolutionMin: 216, avgLatencyMs: 280 } },
]
const sampleMeta = {
  cohere: { name: 'Cohere API' },
  openai: { name: 'OpenAI API' },
  claude: { name: 'Claude API' },
}

console.log('\nbuildScoreTable')
test('renders rows sorted by score desc', () => {
  const table = buildScoreTable(sampleServices, sampleMeta)
  const rows = table.split('\n')
  assert.ok(rows[0].includes('| Rank |'), `header missing: ${rows[0]}`)
  assert.ok(rows[2].includes('Cohere API'), `first row not Cohere: ${rows[2]}`)
  assert.ok(rows[2].includes('100'), `score 100 missing: ${rows[2]}`)
  assert.ok(rows[4].includes('Claude API'), `last row not Claude: ${rows[4]}`)
})
test('header is "Uptime Source" (not "Confidence") and marks the estimate cohort (#29)', () => {
  const services = [
    { id: 'modal', data: { score: 97, grade: 'excellent', uptime: 99.4, incidents: 5, avgResolutionMin: 65 } },
    { id: 'perplexity', data: { score: 68, grade: 'fair', uptime: 99.6, incidents: 1, avgResolutionMin: 240 } },
  ]
  const meta = { modal: { name: 'Modal' }, perplexity: { name: 'Perplexity' } }
  const table = buildScoreTable(services, meta)
  assert.ok(table.includes('| Rank | Service | Score | Grade | Uptime Source | Why |'), 'header must use Uptime Source')
  assert.ok(!table.includes('Confidence'), 'Confidence column must be gone')
  const perplexityRow = table.split('\n').find(r => r.includes('Perplexity'))
  assert.ok(/\| Estimate \|/.test(perplexityRow), `estimate cohort must be marked Estimate: ${perplexityRow}`)
  const modalRow = table.split('\n').find(r => r.includes('Modal'))
  assert.ok(/\| Official \|/.test(modalRow), `status-page service must be Official: ${modalRow}`)
})
test('excludes NO_INCIDENT_FEED services (Bedrock/Azure) from the ranking (#29)', () => {
  const services = [
    { id: 'modal', data: { score: 97, grade: 'excellent', uptime: 99.4, incidents: 5, avgResolutionMin: 65 } },
    { id: 'bedrock', data: { score: 90, grade: 'excellent', uptime: 100, incidents: 0, avgResolutionMin: null } },
    { id: 'azureopenai', data: { score: 90, grade: 'excellent', uptime: 99.9, incidents: 0, avgResolutionMin: null } },
  ]
  const meta = { modal: { name: 'Modal' }, bedrock: { name: 'Amazon Bedrock' }, azureopenai: { name: 'Azure OpenAI' } }
  const table = buildScoreTable(services, meta)
  assert.ok(!table.includes('Amazon Bedrock'), 'Bedrock must not be ranked')
  assert.ok(!table.includes('Azure OpenAI'), 'Azure must not be ranked')
  assert.ok(table.includes('Modal'), 'a ranked service still appears')
})

console.log('\nbuildIncidentTable')
test('excludes services with zero incidents from the table body', () => {
  const { tableRows, zeroIncLine } = buildIncidentTable(sampleServices, sampleMeta)
  assert.ok(!tableRows.includes('Cohere API'), 'zero-incident service should be excluded')
  assert.ok(tableRows.includes('Claude API'), 'non-zero-incident service should appear')
  assert.ok(zeroIncLine.includes('Cohere API'), 'zero-inc line should list Cohere')
  assert.ok(zeroIncLine.startsWith('**Zero incidents (1 services):**'), `got: ${zeroIncLine}`)
})
test('sorts by incident count desc', () => {
  const { tableRows } = buildIncidentTable(sampleServices, sampleMeta)
  const claudeIdx = tableRows.indexOf('Claude API')
  const openaiIdx = tableRows.indexOf('OpenAI API')
  assert.ok(claudeIdx > 0 && openaiIdx > 0, 'both should appear')
  assert.ok(claudeIdx < openaiIdx, 'Claude (9 inc) should appear before OpenAI (1 inc)')
})
test('splits zero-incident services into confirmed vs no-feed (estimate) (#29)', () => {
  const services = [
    { id: 'cohere', data: { score: 89, incidents: 0, uptime: 100, avgResolutionMin: null, totalDowntimeMin: null, longestIncidentMin: null } },
    { id: 'bedrock', data: { score: 90, incidents: 0, uptime: 100, avgResolutionMin: null, totalDowntimeMin: null, longestIncidentMin: null } },
  ]
  const meta = { cohere: { name: 'Cohere API' }, bedrock: { name: 'Amazon Bedrock' } }
  const { zeroIncLine } = buildIncidentTable(services, meta)
  // Official-uptime zero → confirmed; estimate-uptime zero (bedrock) → "No incident feed"
  assert.ok(/\*\*Zero incidents \(1 services\):\*\* Cohere API — confirmed/.test(zeroIncLine), `confirmed line: ${zeroIncLine}`)
  assert.ok(/\*\*No incident feed \(1 services\):\*\* Amazon Bedrock/.test(zeroIncLine), `no-feed line: ${zeroIncLine}`)
})

// aiwatch#507 — DeepSeek status page migrated to Flashduty (unreachable server-side); its feed
// is frozen, so neither a partial nonzero count nor a frozen zero is a verified picture.
test('STALE_SOURCE: caveat renders with a NONZERO count (deepseek 3 partial-month incidents)', () => {
  const services = [
    { id: 'deepseek', data: { score: 82, incidents: 3, uptime: 99.92, avgResolutionMin: 18, totalDowntimeMin: 53, longestIncidentMin: 34 } },
  ]
  const meta = { deepseek: { name: 'DeepSeek API' } }
  const { tableRows, zeroIncLine } = buildIncidentTable(services, meta)
  assert.ok(tableRows.includes('DeepSeek API'), 'still listed in the incident table (data is real, just dated)')
  assert.ok(/\*\*Stale source \(1 service\):\*\* DeepSeek API is /.test(zeroIncLine), `stale line: ${zeroIncLine}`)
  assert.ok(/floor, not a verified picture\./.test(zeroIncLine), 'self-contained caveat')
  assert.ok(!/#\d+/.test(zeroIncLine), 'no reader-facing internal issue number')
})
test('STALE_SOURCE: a frozen ZERO count is NOT labelled "confirmed zero"', () => {
  const services = [
    { id: 'cohere', data: { score: 89, incidents: 0, uptime: 100, avgResolutionMin: null } },
    { id: 'deepseek', data: { score: 82, incidents: 0, uptime: 99.92, avgResolutionMin: null } },
  ]
  const meta = { cohere: { name: 'Cohere API' }, deepseek: { name: 'DeepSeek API' } }
  const { zeroIncLine } = buildIncidentTable(services, meta)
  // deepseek's zero must NOT appear in the confirmed list…
  assert.ok(/\*\*Zero incidents \(1 services\):\*\* Cohere API — confirmed/.test(zeroIncLine), `confirmed: ${zeroIncLine}`)
  assert.ok(!/Zero incidents.*DeepSeek/.test(zeroIncLine), 'deepseek not in confirmed-zero')
  // …it appears in the stale-source caveat instead
  assert.ok(/\*\*Stale source \(1 service\):\*\* DeepSeek API/.test(zeroIncLine), `stale: ${zeroIncLine}`)
})
test('buildStaleSourceCaveat: singular vs plural agreement, empty → ""', () => {
  eq(buildStaleSourceCaveat([]), '')
  const one = buildStaleSourceCaveat(['DeepSeek API'])
  assert.ok(/\*\*Stale source \(1 service\):\*\* DeepSeek API is /.test(one), `singular: ${one}`)
  const two = buildStaleSourceCaveat(['DeepSeek API', 'Foo API'])
  assert.ok(/\*\*Stale source \(2 services\):\*\* DeepSeek API, Foo API are /.test(two), `plural: ${two}`)
})

console.log('\nbuildUptimeTable')
test('excludes services with null uptime', () => {
  const services = [
    ...sampleServices,
    { id: 'gemini', data: { score: 86, grade: 'excellent', uptime: null, incidents: 0, avgResolutionMin: null, avgLatencyMs: 200 } },
  ]
  const meta = { ...sampleMeta, gemini: { name: 'Gemini API' } }
  const rows = buildUptimeTable(services, meta)
  assert.ok(!rows.includes('Gemini API'), 'null-uptime service should be excluded')
  assert.ok(rows.includes('Cohere API'), 'real-uptime service should appear')
})
test('excludes hardcoded NO_PUBLIC_UPTIME even if archive returns a value', () => {
  // Defense: if a LEGACY archive (no officialUptime field) wrongly returns uptime for mistral,
  // still exclude from table
  const services = [
    { id: 'mistral', data: { score: 75, grade: 'good', uptime: 99.5, incidents: 7, avgResolutionMin: 6, avgLatencyMs: 420 } },
  ]
  const rows = buildUptimeTable(services, { mistral: { name: 'Mistral API' } })
  eq(rows, '')
})

// #586 — Official Uptime table is driven by the status-page `officialUptime` field, not `uptime`.
console.log('\nofficialUptimeFor (#586)')
test('new archive: returns officialUptime (status-page), not the daily-counter uptime', () => {
  eq(officialUptimeFor({ id: 'chatgpt', data: { uptime: 72.78, officialUptime: 99.83 } }), 99.83)
})
test('new archive: officialUptime null → omitted (no comparable published metric)', () => {
  eq(officialUptimeFor({ id: 'chatgpt', data: { uptime: 72.78, officialUptime: null } }), null)
})
test('new archive: a number of 0 is honored (not treated as missing)', () => {
  eq(officialUptimeFor({ id: 'someapi', data: { uptime: 50, officialUptime: 0 } }), 0)
})
test('legacy archive (no field): chatgpt falls back to null, never the bad 72.78', () => {
  eq(officialUptimeFor({ id: 'chatgpt', data: { uptime: 72.78 } }), null)
})
test('legacy archive (no field): NO_PUBLIC_UPTIME service → null', () => {
  eq(officialUptimeFor({ id: 'mistral', data: { uptime: 99.5 } }), null)
})
test('legacy archive (no field): normal service → daily-counter uptime', () => {
  eq(officialUptimeFor({ id: 'cohere', data: { uptime: 100 } }), 100)
})
test('new archive: NO_PUBLIC_UPTIME estimate service (bedrock 100) → null (no #29 stray-100 row)', () => {
  eq(officialUptimeFor({ id: 'bedrock', data: { uptime: 100, officialUptime: 100 } }), null)
})
test('new archive: NO_PUBLIC_UPTIME stays excluded even with a value (mistral)', () => {
  eq(officialUptimeFor({ id: 'mistral', data: { uptime: 99.5, officialUptime: 99.5 } }), null)
})
test('chatgpt is NOT in NO_PUBLIC_UPTIME — included via officialUptime despite uptimeSource=estimate', () => {
  // ChatGPT is also `uptimeSource: estimate` upstream, but must STAY in the table (the whole #586 point),
  // so the guard keys off NO_PUBLIC_UPTIME (which omits it not) rather than the estimate flag.
  eq(officialUptimeFor({ id: 'chatgpt', data: { uptime: 72.78, officialUptime: 99.23 } }), 99.23)
})

test('#586 buildUptimeTable: chatgpt included with officialUptime, sorted by it', () => {
  const services = [
    { id: 'openai', data: { uptime: 99.6, officialUptime: 99.60 } },
    { id: 'chatgpt', data: { uptime: 72.78, officialUptime: 99.83 } },
    { id: 'mistral', data: { uptime: 99.5, officialUptime: null } }, // no published metric → omit
  ]
  const meta = { openai: { name: 'OpenAI API' }, chatgpt: { name: 'ChatGPT' }, mistral: { name: 'Mistral API' } }
  const rows = buildUptimeTable(services, meta)
  assert.ok(rows.includes('<tr><td>ChatGPT</td><td>99.83%</td></tr>'), 'ChatGPT shows status-page 99.83%, not 72.78%')
  assert.ok(!rows.includes('72.78'), 'the pessimistic daily-counter value never appears')
  assert.ok(!rows.includes('Mistral API'), 'null-officialUptime service omitted')
  // sorted desc by officialUptime → ChatGPT (99.83) before OpenAI (99.60)
  assert.ok(rows.indexOf('ChatGPT') < rows.indexOf('OpenAI API'), 'sorted by officialUptime desc')
})

console.log('\nbuildLatencyTable')
test('sorts by latency asc (fastest first)', () => {
  const table = buildLatencyTable(sampleServices, sampleMeta)
  // Only content rows (header starts with "| Rank", data rows start with "| N |")
  const dataRows = table.split('\n').filter(l => /^\| \d+ \|/.test(l))
  eq(dataRows.length, 3)
  assert.ok(dataRows[0].includes('Cohere API'), `fastest should be Cohere (230ms): ${dataRows[0]}`)
})
test('emits only the p75 column — no empty p95/Spikes/vs-Last-Month placeholders (#17)', () => {
  const table = buildLatencyTable(sampleServices, sampleMeta)
  const lines = table.split('\n')
  eq(lines[0], '| Rank | Service | p75 (ms) |')
  eq(lines[1], '|---|---|---|')
  // No row may carry the old 6-column placeholder dashes.
  assert.ok(!table.includes('| — | — | — |'), 'must not emit empty placeholder columns')
  // Every data row has exactly 3 cells (4 pipes).
  const dataRows = lines.filter(l => /^\| \d+/.test(l))
  for (const row of dataRows) {
    eq((row.match(/\|/g) || []).length, 4, `row should have 3 columns (4 pipes): ${row}`)
  }
})
test('excludes NO_PROBE services', () => {
  const services = [
    { id: 'bedrock', data: { score: 90, grade: 'excellent', uptime: null, incidents: 0, avgResolutionMin: null, avgLatencyMs: 999 } },
  ]
  const table = buildLatencyTable(services, { bedrock: { name: 'Amazon Bedrock' } })
  assert.ok(!table.includes('Amazon Bedrock'), 'bedrock should be excluded')
})
test('uses competition ranking for ties (not sequential)', () => {
  // Two services tied at 230ms must both render with "N=" suffix; third slot skips to 3.
  const services = [
    { id: 'a', data: { avgLatencyMs: 230 } },
    { id: 'b', data: { avgLatencyMs: 230 } },
    { id: 'c', data: { avgLatencyMs: 310 } },
  ]
  const table = buildLatencyTable(services, { a: { name: 'A' }, b: { name: 'B' }, c: { name: 'C' } })
  const dataRows = table.split('\n').filter(l => l.startsWith('| 1') || l.startsWith('| 2') || l.startsWith('| 3'))
  // With competition ranking and ties at 230ms: "1=", "1=", "3"
  assert.ok(dataRows[0].trim().startsWith('| 1='), `first tied row should be "1=": ${dataRows[0]}`)
  assert.ok(dataRows[1].trim().startsWith('| 1='), `second tied row should be "1=": ${dataRows[1]}`)
  assert.ok(dataRows[2].trim().startsWith('| 3'), `third row should skip to "3": ${dataRows[2]}`)
})

// ── Template filling ─────────────────────────────────────
console.log('\nreplaceTableBody (markdown)')
test('replaces Rank markdown table body', () => {
  const template = `## Foo\n\n| Rank | X |\n|---|---|\n| 1 | |\n\nEnd`
  const out = replaceTableBody(template, 'Foo', '| Rank | X |\n|---|---|\n| 1 | new |')
  assert.ok(out.includes('| 1 | new |'), `got: ${out}`)
})

console.log('\nreplaceTableBody (HTML tbody)')
test('replaces HTML tbody content', () => {
  const template = `## Foo\n\n<table>\n<tbody>\n<tr><td></td></tr>\n</tbody>\n</table>\n`
  const out = replaceTableBody(template, 'Foo', '<tr><td>X</td></tr>')
  assert.ok(out.includes('<tr><td>X</td></tr>'), `got: ${out}`)
  assert.ok(!out.includes('<tr><td></td></tr>'), 'old empty row should be gone')
})
test('section boundary prevents cross-section bleed', () => {
  // Regression: early versions of replaceTableBody walked past ## to the next
  // section's <tbody>, so a markdown-table replacement for "AIWatch Score"
  // silently mutated the HTML tbody in "Incident Summary" instead.
  const template = [
    '## AIWatch Score',
    '',
    '| Rank | X |',
    '|---|---|',
    '| 1 | |',
    '',
    '## Incident Summary',
    '',
    '<tbody>',
    '<tr><td>should not be touched</td></tr>',
    '</tbody>',
  ].join('\n')
  const out = replaceTableBody(template, 'AIWatch Score', '| Rank | X |\n|---|---|\n| 1 | replaced |')
  assert.ok(out.includes('| 1 | replaced |'), `score row should be replaced: ${out}`)
  assert.ok(out.includes('should not be touched'), 'adjacent section tbody must remain untouched')
})

console.log('\nfillTemplate')
test('flips published flag to false', () => {
  const tmpl = `---\npublished: true\n---\n\n[MON] [YEAR]`
  const archive = { services: {}, daysCollected: 0 }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(out.includes('published: false'), `got: ${out}`)
  assert.ok(!out.match(/^published: true$/m), 'true flag should be replaced')
})
test('substitutes header placeholders', () => {
  const tmpl = `[MON] [YEAR] / [YYYY-MM] / [LAST_DAY]`
  const archive = { services: {}, daysCollected: 0 }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(out.includes('April 2026'), `got: ${out}`)
  assert.ok(out.includes('2026-04'), `YYYY-MM missing: ${out}`)
  assert.ok(out.includes('30'), `LAST_DAY missing: ${out}`)
})
test('PUBLISH_MONTH is deterministic (month after the report period), not today', () => {
  // Re-runs on any day must stamp the same "Published: May" for an April report.
  // Deriving from today's date would misleadingly claim "Published: June" on a June catch-up.
  const tmpl = `**Published**: [PUBLISH_MONTH] [YEAR]`
  const archive = { services: {}, daysCollected: 0 }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(out.includes('**Published**: May 2026'), `expected "May 2026", got: ${out}`)
})
test('NEXT_MONTH resolves year rollover correctly', () => {
  const tmpl = `**Next report**: [NEXT_MONTH] [YEAR]`
  const archive = { services: {}, daysCollected: 0 }
  const out = fillTemplate(tmpl, '2026-12', archive, {})
  assert.ok(out.includes('January'), `expected "January" after December: ${out}`)
})

// ── Security section (refs aiwatch#290 / aiwatch#291) ───────────────
console.log('\nbuildBySourceTable')
test('renders both sources when both fired', () => {
  const out = buildBySourceTable({ osv: 5, hackernews: 3 })
  assert.ok(out.includes('OSV.dev | 5'), `osv row: ${out}`)
  assert.ok(out.includes('Hacker News | 3'), `hn row: ${out}`)
})
test('hides zero-count rows so the table stays tight', () => {
  const out = buildBySourceTable({ osv: 5, hackernews: 0 })
  assert.ok(out.includes('OSV.dev | 5'))
  assert.ok(!out.includes('Hacker News'), `HN row should be hidden when count=0: ${out}`)
})
test('returns empty string when no source has alerts', () => {
  eq(buildBySourceTable({ osv: 0, hackernews: 0 }), '')
})

console.log('\nbuildBySeverityTable')
test('always shows all four severity buckets including zeros', () => {
  const out = buildBySeverityTable({ critical: 0, high: 2, medium: 5, low: 1 })
  assert.ok(out.includes('Critical | High | Medium | Low'), `header: ${out}`)
  assert.ok(out.includes('0 | 2 | 5 | 1'), `row: ${out}`)
})
test('returns empty string when all severities are zero', () => {
  eq(buildBySeverityTable({ critical: 0, high: 0, medium: 0, low: 0 }), '')
})
test('handles missing severity keys (treated as zero)', () => {
  const out = buildBySeverityTable({ high: 3 })
  assert.ok(out.includes('0 | 3 | 0 | 0'), `row: ${out}`)
})

console.log('\nbuildByServiceTable')
test('sorts by count desc and caps at 5 by default', () => {
  const counts = { a: 1, b: 5, c: 3, d: 7, e: 2, f: 6, g: 4 }
  const out = buildByServiceTable(counts)
  // Should include top 5: d(7), f(6), b(5), g(4), c(3)
  assert.ok(out.indexOf('d | 7') < out.indexOf('f | 6'), 'highest count first')
  assert.ok(out.indexOf('f | 6') < out.indexOf('c | 3'), 'descending throughout')
  assert.ok(!out.includes('a | 1'), 'should drop entries beyond limit')
  assert.ok(!out.includes('e | 2'), 'should drop entries beyond limit')
})
test('returns empty string when byService has only zero-count entries', () => {
  eq(buildByServiceTable({ a: 0, b: 0 }), '')
})
test('returns empty string for missing byService input', () => {
  eq(buildByServiceTable(undefined), '')
})

console.log('\nfmtIso edge cases')
test('returns em dash on null/undefined', () => {
  const { fmtIso } = require('./generate-report')
  eq(fmtIso(null), '—')
  eq(fmtIso(undefined), '—')
})
test('returns em dash for non-string objects (defensive against schema drift)', () => {
  const { fmtIso } = require('./generate-report')
  // Without sanitization, String({}) leaks "[object Object]" into a markdown table cell.
  eq(fmtIso({}), '—')
})
test('returns em dash for malformed dates so unsanitized text never hits a table cell', () => {
  const { fmtIso } = require('./generate-report')
  eq(fmtIso('not-a-date'), '—')
  eq(fmtIso('2026-04'), '—')   // partial date — no day
  eq(fmtIso('2026'), '—')      // year only
})

console.log('\nbuildTimelineDetails')
test('renders all stages in order with severity + fix version', () => {
  const out = buildTimelineDetails([
    { stage: 'detected', at: '2026-04-15T10:00:00Z', severity: 'high' },
    { stage: 'severity_changed', at: '2026-04-18T12:00:00Z', severity: 'critical' },
    { stage: 'fix_released', at: '2026-04-22T08:00:00Z', severity: 'critical', fixedVersion: '1.42.0' },
  ])
  assert.ok(out.includes('<details'), `wraps in details: ${out}`)
  assert.ok(out.includes('detected | 2026-04-15 | high | —'), `detected row: ${out}`)
  assert.ok(out.includes('fix_released | 2026-04-22 | critical | 1.42.0'), `fix row: ${out}`)
})
test('returns empty string when timeline is empty', () => {
  eq(buildTimelineDetails([]), '')
})
test('returns empty string when timeline is undefined', () => {
  eq(buildTimelineDetails(undefined), '')
})
test('renders em dash when severity or fix version is missing', () => {
  const out = buildTimelineDetails([{ stage: 'detected', at: '2026-04-15' }])
  assert.ok(out.includes('detected | 2026-04-15 | — | —'), `missing fields: ${out}`)
})
test('renders em dash for missing stage so undefined never appears in a table cell', () => {
  const out = buildTimelineDetails([{ at: '2026-04-15' }])
  assert.ok(!out.includes('undefined'), `stage fallback: ${out}`)
  assert.ok(out.includes('— | 2026-04-15 | — | —'), `stage = em dash: ${out}`)
})

console.log('\nbuildTopFindings')
test('renders OSV finding with timeline expansion', () => {
  const out = buildTopFindings([{
    title: 'GHSA-1234 langchain SSRF', url: 'https://example.com/x',
    source: 'osv', severity: 'high', service: 'langchain',
    detectedAt: '2026-04-10T12:00:00Z',
    timeline: [{ stage: 'detected', at: '2026-04-10T12:00:00Z', severity: 'high' }],
  }])
  assert.ok(out.includes('### Top Findings'), `top heading: ${out}`)
  assert.ok(out.includes('1. [GHSA-1234 langchain SSRF](https://example.com/x)'), `link title: ${out}`)
  assert.ok(out.includes('`high`'), `severity badge: ${out}`)
  assert.ok(out.includes('**Affected:** langchain'), `affected: ${out}`)
  assert.ok(out.includes('<details'), `timeline details: ${out}`)
})
test('omits timeline section for HN findings even if timeline field set (defensive)', () => {
  const out = buildTopFindings([{
    title: 'HN post', url: 'https://news.ycombinator.com/item?id=1',
    source: 'hackernews', severity: 'medium', detectedAt: '2026-04-12',
    timeline: [{ stage: 'detected', at: '2026-04-12' }], // shouldn't happen but be safe
  }])
  assert.ok(!out.includes('<details'), `HN must never render timeline: ${out}`)
})
test('renders unrated badge when severity missing', () => {
  const out = buildTopFindings([{
    title: 'foo', url: 'https://example.com',
    source: 'osv', detectedAt: '2026-04-10',
  }])
  assert.ok(out.includes('`unrated`'), `unrated fallback: ${out}`)
})
test('omits affected line when service missing', () => {
  const out = buildTopFindings([{
    title: 'foo', url: 'https://example.com',
    source: 'hackernews', detectedAt: '2026-04-10',
  }])
  assert.ok(!out.includes('**Affected:**'), `affected omitted when service is null: ${out}`)
})
test('returns empty string when findings is empty array', () => {
  eq(buildTopFindings([]), '')
})
test('renders a 15-item input as-is — the worker pre-caps at 10 and pre-sorts; generator does not duplicate', () => {
  // Documents the contract: this function trusts the upstream cap + sort. If a future
  // refactor adds slicing/sorting here it would silently drop the worker's authoritative ordering.
  const findings = Array.from({ length: 15 }, (_, i) => ({
    title: `f${i}`, url: `https://example.com/${i}`,
    source: 'osv', severity: 'low', service: 'svc', detectedAt: '2026-04-10',
  }))
  const out = buildTopFindings(findings)
  // All 15 numbered headings should be present
  for (let i = 1; i <= 15; i++) {
    assert.ok(out.includes(`#### ${i}.`), `index ${i} should appear: missing in ${out.slice(0, 100)}…`)
  }
})

console.log('\nbuildSecuritySection')
test('returns empty string when security is null', () => {
  eq(buildSecuritySection(null), '')
})
test('returns empty string when totalAlerts is 0', () => {
  eq(buildSecuritySection({
    totalAlerts: 0, bySource: { osv: 0, hackernews: 0 },
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, byService: {}, topFindings: [],
  }), '')
})
test('warns + omits when totalAlerts is missing on a non-empty archive (malformed input)', () => {
  const origWarn = console.warn
  const warnings = []
  console.warn = (...args) => { warnings.push(args.join(' ')) }
  try {
    const out = buildSecuritySection({
      // totalAlerts deliberately omitted; other fields populated
      bySource: { osv: 1, hackernews: 0 }, bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
      byService: { foo: 1 }, topFindings: [{ title: 't', url: 'u', source: 'osv', detectedAt: '2026-04-01' }],
    })
    eq(out, '')
    assert.ok(warnings.some(w => w.includes('totalAlerts missing')), `warning emitted: ${JSON.stringify(warnings)}`)
  } finally {
    console.warn = origWarn
  }
})
test('renders full section when totalAlerts > 0', () => {
  const out = buildSecuritySection({
    totalAlerts: 8,
    bySource: { osv: 5, hackernews: 3 },
    bySeverity: { critical: 1, high: 2, medium: 4, low: 1 },
    byService: { 'OpenAI Python SDK': 3, 'langchain': 2 },
    topFindings: [{
      title: 'GHSA-x foo', url: 'https://osv.dev/GHSA-x', source: 'osv',
      severity: 'critical', service: 'openai', detectedAt: '2026-04-01',
      timeline: [{ stage: 'detected', at: '2026-04-01', severity: 'critical' }],
    }],
  })
  assert.ok(out.startsWith('## Security Alerts'), `heading first: ${out.slice(0, 50)}`)
  assert.ok(out.includes('**Total alerts:** 8'), `total: ${out}`)
  assert.ok(out.includes('OSV.dev | 5'), `bySource rendered`)
  assert.ok(out.includes('Critical | High | Medium | Low'), `bySeverity rendered`)
  assert.ok(out.includes('OpenAI Python SDK | 3'), `byService rendered`)
  assert.ok(out.includes('### Top Findings'), `top findings rendered`)
  assert.ok(out.endsWith('---\n'), `terminating separator: ${JSON.stringify(out.slice(-10))}`)
})
test('omits subsections that have no data but still renders the heading + total', () => {
  const out = buildSecuritySection({
    totalAlerts: 2,
    bySource: { osv: 2, hackernews: 0 }, // only OSV
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, // no severities tagged
    byService: {}, // no service attribution
    topFindings: [], // no top findings
  })
  assert.ok(out.includes('**Total alerts:** 2'))
  assert.ok(out.includes('OSV.dev | 2'))
  // Note: the intro `> Note:` text mentions "Hacker News" as a data source — that's expected.
  // Test the absence of the table-row form ("Hacker News | <n>") instead.
  assert.ok(!/Hacker News \| \d/.test(out), 'HN table row should be hidden when count=0')
  assert.ok(!out.includes('**By severity**'), 'severity section omitted when all zero')
  assert.ok(!out.includes('**Most affected services**'), 'services section omitted when empty')
  assert.ok(!out.includes('### Top Findings'), 'top findings omitted when empty')
})

// ── buildDetectionSection (#28) ─────────────────────────────────────
console.log('\nfmtLeadMin')
test('formats ms → whole minutes', () => eq(fmtLeadMin(900000), '15m'))
test('handles null', () => eq(fmtLeadMin(null), '—'))

console.log('\nbuildDetectionSection (#28)')
const detMeta = { deepgram: { name: 'Deepgram' }, mistral: { name: 'Mistral API' }, gemini: { name: 'Gemini API' } }
test('omits the whole section when no degradation and no detectionLead', () => {
  eq(buildDetectionSection({}, detMeta), '')
  eq(buildDetectionSection({ degradation: { total: 0 }, detectionLead: { topExamples: [] } }, detMeta), '')
  eq(buildDetectionSection({ degradation: null, detectionLead: null }, detMeta), '')
})
test('renders RTT Degradation from archive.degradation', () => {
  const out = buildDetectionSection({
    degradation: { total: 12, noStatusTotal: 8, byService: { deepgram: 5, mistral: 4 }, noStatusByService: { deepgram: 4, mistral: 3 } },
  }, detMeta)
  assert.ok(out.startsWith('## Detection & RTT Degradation'), `heading first: ${out.slice(0, 40)}`)
  assert.ok(out.includes('### Detection Latency'), 'keeps the static Detection Latency blurb')
  assert.ok(/flagged \*\*12\*\* latency degradations/.test(out), `total: ${out}`)
  assert.ok(/\*\*8\*\* were \*\*not reflected/.test(out), 'noStatus total rendered')
  assert.ok(/\| Deepgram \| 5 \| 4 \|/.test(out), 'degradation row rendered with display name')
  assert.ok(!out.includes('### Early RTT Detections'), 'no Early RTT subsection without leads')
  assert.ok(out.trimEnd().endsWith('---'), 'section ends with its own trailing separator')
})
test('renders Early RTT Detections + Official Update = detectedAt + leadMs', () => {
  const out = buildDetectionSection({
    detectionLead: { count: 6, avgLeadMs: 480000, topExamples: [
      { svcId: 'mistral', incId: '01ABC', leadMs: 900000, detectedAt: '2026-04-12T14:30:00Z' },
    ] },
  }, detMeta)
  assert.ok(out.includes('### Early RTT Detections'), 'Early RTT subsection rendered')
  assert.ok(/\| 01ABC \| Mistral API \| 2026-04-12 14:30 UTC \| 2026-04-12 14:45 UTC \| 15m \|/.test(out), `row: ${out}`)
  assert.ok(/\*\*Average early detection\*\*: 8m \(across 6 events\)/.test(out), 'average shown when count >= 5')
  assert.ok(!out.includes('### RTT Degradation Detection'), 'no degradation subsection without degradation data')
})
test('drops the Average line below the sample-size gate (count < 5)', () => {
  const out = buildDetectionSection({
    detectionLead: { count: 3, avgLeadMs: 480000, topExamples: [
      { svcId: 'gemini', incId: '01DEF', leadMs: 300000, detectedAt: '2026-04-18T09:05:00Z' },
    ] },
  }, detMeta)
  assert.ok(out.includes('### Early RTT Detections'), 'still shows per-event rows')
  assert.ok(!out.includes('**Average early detection**'), 'no averaged figure below MIN_LEAD_SAMPLE_SIZE')
})

// ── fillTemplate × security ─────────────────────────────────────────
console.log('\nfillTemplate × security')
test('inserts the security block when archive.security has data', () => {
  const tmpl = `intro\n\n<!-- SECURITY_SECTION -->\n\n## Notable Incidents\noutro`
  const archive = {
    services: {}, daysCollected: 0,
    security: {
      totalAlerts: 1,
      bySource: { osv: 1, hackernews: 0 },
      bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
      byService: { langchain: 1 },
      topFindings: [{
        title: 'foo', url: 'https://example.com', source: 'osv',
        severity: 'high', service: 'langchain', detectedAt: '2026-04-10',
      }],
    },
  }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(out.includes('## Security Alerts'), `heading: ${out}`)
  assert.ok(out.includes('## Notable Incidents'), 'notable incidents preserved')
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'), 'placeholder removed')
})
test('strips the placeholder cleanly when archive.security is null', () => {
  const tmpl = `intro\n\n<!-- SECURITY_SECTION -->\n\n## Notable Incidents\noutro`
  const archive = { services: {}, daysCollected: 0, security: null }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'), 'placeholder removed')
  assert.ok(!out.includes('## Security Alerts'), 'no heading injected')
  assert.ok(!/\n---\n+\n---\n/.test(out), 'no double horizontal rules introduced')
})
test('strips the placeholder cleanly when archive.security is missing entirely', () => {
  const tmpl = `intro\n\n<!-- SECURITY_SECTION -->\n\n## Notable Incidents\noutro`
  const archive = { services: {}, daysCollected: 0 } // no security key
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'))
  assert.ok(!out.includes('## Security Alerts'))
})

// ── injectAutoDraft (refs aiwatch-reports#4) ─────────────────────────
//
// Contract: replaces the Key Insight opening-narrative comment with the
// generated opening; fences the TL;DR with BEGIN/END markers inside `## Summary`
// without touching the placeholder bullets that the operator will fill.

const { injectAutoDraft, archiveToAnalysisRows, applyAutoDraft, SUMMARY_OPEN_MARKER, SUMMARY_CLOSE_MARKER } = require('./generate-report')

console.log('\narchiveToAnalysisRows')

test('emits one incidents row per service (including zero-incident services)', () => {
  // Critical to NOT use the rendered Incident Summary table as the source: that
  // table only contains incident-bearing services. Feeding the analyzer from
  // the table would collapse `totalServices` and `zeroIncidents` to the bearing
  // subset and the Opening would say "0 services recorded zero incidents" on
  // an actually-calm month. archiveToAnalysisRows must surface ALL services.
  const archive = {
    services: {
      claude:  { score: 90, grade: 'excellent', incidents: 2, totalDowntimeMin: 30, avgResolutionMin: 15, uptime: 99.9 },
      openai:  { score: 80, grade: 'good', incidents: 0, totalDowntimeMin: 0, avgResolutionMin: 0, uptime: 100 },
      gemini:  { score: 70, grade: 'fair', incidents: 0, totalDowntimeMin: 0, avgResolutionMin: 0, uptime: 100 },
    },
  }
  const meta = { claude: { name: 'Claude' }, openai: { name: 'OpenAI' }, gemini: { name: 'Gemini' } }
  const { scores, incidents } = archiveToAnalysisRows(archive, meta)
  assert.strictEqual(incidents.length, 3, 'all 3 services in incidents rows')
  assert.strictEqual(scores.length, 3, 'all 3 services in score rows')
  const zeroes = incidents.filter(r => r.Incidents === '0')
  assert.strictEqual(zeroes.length, 2, `2 zero-incident services expected, got ${zeroes.length}`)
})

test('scores are sorted descending (so analyzer.top / bottom slicing works)', () => {
  const archive = {
    services: {
      a: { score: 55, grade: 'fair', incidents: 5 },
      b: { score: 95, grade: 'excellent', incidents: 0 },
      c: { score: 75, grade: 'good', incidents: 1 },
    },
  }
  const { scores } = archiveToAnalysisRows(archive, {})
  assert.deepStrictEqual(scores.map(s => s.Score), ['95', '75', '55'])
})

test('omits services without a score from scores rows but keeps them in incidents', () => {
  // Estimate-only services have `score: null` — they should not anchor rankings,
  // but their incident count (typically 0 by definition) still feeds totals.
  const archive = {
    services: {
      bedrock:    { score: null, incidents: 0 },
      azureoai:   { score: null, incidents: 0 },
      claude:     { score: 90, incidents: 1, totalDowntimeMin: 5, avgResolutionMin: 5 },
    },
  }
  const { scores, incidents } = archiveToAnalysisRows(archive, {})
  assert.strictEqual(scores.length, 1, 'only scored service appears in scores')
  assert.strictEqual(scores[0].Service, 'claude')
  assert.strictEqual(incidents.length, 3, 'all 3 services contribute to total / zero counts')
})

test('row shape matches generate-summary.analyze() expectations exactly', () => {
  // Coupling check — if generate-summary's analyze adds a new column read in the
  // future (e.g. r['Longest']), this test won't catch it, but at least we pin
  // the columns that today's analyze() reads: Service, Score, Confidence,
  // Incidents, Total Downtime, Avg Resolution.
  const archive = { services: { claude: { score: 100, grade: 'excellent', incidents: 0, uptime: 100 } } }
  const { scores, incidents } = archiveToAnalysisRows(archive, { claude: { name: 'Claude' } })
  const scoreKeys = Object.keys(scores[0]).sort()
  const incKeys = Object.keys(incidents[0]).sort()
  assert.deepStrictEqual(scoreKeys, ['Confidence', 'Grade', 'Score', 'Service'])
  assert.deepStrictEqual(incKeys, ['Avg Resolution', 'Incidents', 'Service', 'Total Downtime'])
})

console.log('\ninjectAutoDraft')

const SAMPLE_FILLED = [
  '---',
  'published: false',
  '---',
  '',
  '## Summary',
  '',
  '- **Most reliable**:',
  '- **Riskiest this month**:',
  '',
  '## Recommendations',
  '',
  'placeholder',
  '',
  '## Key Insight',
  '',
  '<!-- Opening narrative: 1 sentence summarizing the month, then 3 patterns -->',
  '',
  '- **Pattern 1**:',
  '',
  '## Incident Summary',
  '',
  'unrelated section the regex must not splice into',
].join('\n')

test('Opening replaces the Key Insight placeholder comment exactly once', () => {
  const out = injectAutoDraft(SAMPLE_FILLED, 'OPENING_TEXT_HERE', '- **TLDR bullet**')
  assert.ok(out.includes('OPENING_TEXT_HERE'), 'opening text injected')
  assert.ok(!out.includes('<!-- Opening narrative: 1 sentence summarizing the month, then 3 patterns -->'),
    'original placeholder comment removed')
  // Opening must land inside Key Insight, not Summary.
  const summaryIdx = out.indexOf('## Summary')
  const recsIdx = out.indexOf('## Recommendations')
  const openingIdx = out.indexOf('OPENING_TEXT_HERE')
  assert.ok(openingIdx > recsIdx, `opening must follow Recommendations; got idx=${openingIdx} vs recs=${recsIdx}`)
  assert.ok(openingIdx < out.indexOf('## Incident Summary'), 'opening must precede Incident Summary')
  assert.ok(openingIdx > summaryIdx, 'opening must be after Summary heading')
})

test('TL;DR fence lands inside `## Summary` only', () => {
  const tldr = '- **Most reliable**: ClaudeAI (100/100 — perfect uptime)'
  const out = injectAutoDraft(SAMPLE_FILLED, 'opening', tldr)
  assert.ok(out.includes(SUMMARY_OPEN_MARKER), 'open marker present')
  assert.ok(out.includes(SUMMARY_CLOSE_MARKER), 'close marker present')
  assert.ok(out.includes(tldr), 'tldr body present')
  // Both markers must sit strictly between `## Summary` and `## Recommendations`.
  const summaryIdx = out.indexOf('## Summary')
  const recsIdx = out.indexOf('## Recommendations')
  const openIdx = out.indexOf(SUMMARY_OPEN_MARKER)
  const closeIdx = out.indexOf(SUMMARY_CLOSE_MARKER)
  assert.ok(openIdx > summaryIdx && openIdx < recsIdx, `open marker position: ${openIdx} (summary=${summaryIdx}, recs=${recsIdx})`)
  assert.ok(closeIdx > openIdx && closeIdx < recsIdx, `close marker position: ${closeIdx}`)
})

test('does NOT touch sections whose heading contains "Summary" but is not `## Summary`', () => {
  // `## Incident Summary` shares the substring; the regex must use the line anchor `^...$`
  // to skip it. Inject + verify Incident Summary block is byte-identical to input.
  const out = injectAutoDraft(SAMPLE_FILLED, 'opening', 'tldr')
  const incBlock = out.slice(out.indexOf('## Incident Summary'))
  assert.ok(incBlock.startsWith('## Incident Summary\n\nunrelated section'),
    `Incident Summary block was mutated. Got: ${incBlock.slice(0, 80)}`)
  // Sanity: only ONE auto-draft fence in the whole document
  const openCount = (out.match(new RegExp(SUMMARY_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  assert.strictEqual(openCount, 1, `expected 1 open marker, got ${openCount}`)
})

test('placeholder bullets inside `## Summary` are preserved (operator fills them)', () => {
  const out = injectAutoDraft(SAMPLE_FILLED, 'opening', 'tldr')
  assert.ok(out.includes('- **Most reliable**:'), 'placeholder #1 retained')
  assert.ok(out.includes('- **Riskiest this month**:'), 'placeholder #2 retained')
})

test('multi-line TL;DR with nested markdown survives interpolation unchanged', () => {
  const tldr = [
    '- **Most reliable**: ClaudeAI (100/100)',
    '- **Riskiest this month**: Gemini (61/100, 5h downtime)',
    '',
    '**Recommendations**',
    '- **Primary**: ClaudeAI or OpenAI',
    '',
    '**Recovery performance**: Fastest — Cohere (12m avg). Slowest — Gemini (5h avg).',
  ].join('\n')
  const out = injectAutoDraft(SAMPLE_FILLED, 'opening', tldr)
  // Every non-blank line of tldr must appear between the markers in order.
  const between = out.slice(out.indexOf(SUMMARY_OPEN_MARKER), out.indexOf(SUMMARY_CLOSE_MARKER))
  for (const line of tldr.split('\n')) {
    if (line === '') continue
    assert.ok(between.includes(line), `TL;DR line lost: "${line}"`)
  }
})

test('double-inject is idempotent — exactly ONE Summary fence and the first injection wins', () => {
  // Workflow uses force-with-lease + branch reset (generate-report.yml) so a
  // double-call shouldn't happen in CI. But an operator re-running the script
  // locally on an already-injected PR branch must not stack two AUTO-DRAFT
  // fences inside `## Summary` — that would publish a confusing diff. The
  // injectAutoDraft idempotency guard (presence check on SUMMARY_OPEN_MARKER)
  // makes the second call a no-op for both halves: Opening's placeholder
  // comment is gone after first call (regex misses), and the marker presence
  // check short-circuits the Summary fence insert.
  const once = injectAutoDraft(SAMPLE_FILLED, 'first-opening', 'first-tldr')
  const twice = injectAutoDraft(once, 'second-opening', 'second-tldr')

  // First Opening survives (placeholder already consumed → second is a no-op).
  assert.ok(twice.includes('first-opening'), 'first opening preserved')
  assert.ok(!twice.includes('second-opening'), 'second opening did NOT overwrite')

  // First TL;DR body survives; second was rejected by the marker guard.
  assert.ok(twice.includes('first-tldr'), 'first tldr preserved')
  assert.ok(!twice.includes('second-tldr'), 'second tldr did NOT replace or stack')

  // Exactly one fence — not zero, not two.
  const markerRe = new RegExp(SUMMARY_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
  const openCount = (twice.match(markerRe) || []).length
  assert.strictEqual(openCount, 1, `expected exactly 1 SUMMARY_OPEN_MARKER after double-inject, got ${openCount}`)
})

// ── applyAutoDraft (failure-isolation contract) ──────────────────────
//
// Pins the "narrative-generation failure never blocks the deterministic data
// pipeline" promise documented in generate-report.js. The catch arm exists in
// case generate-summary's analyze() ever becomes strict and throws; today the
// analyzer is lenient, so the catch is dead code. These tests lock the
// non-throwing contract in place so a future analyzer rewrite that adds
// validation doesn't silently fail the workflow.

console.log('\napplyAutoDraft')

const SAMPLE_ARCHIVE = {
  services: {
    claude: { score: 92, grade: 'excellent', incidents: 1, totalDowntimeMin: 20, avgResolutionMin: 20, uptime: 99.95 },
    openai: { score: 80, grade: 'good', incidents: 0, totalDowntimeMin: 0, avgResolutionMin: 0, uptime: 100 },
    gemini: { score: 55, grade: 'fair', incidents: 5, totalDowntimeMin: 300, avgResolutionMin: 60, uptime: 98.5 },
  },
}
const SAMPLE_META = {
  claude: { name: 'Claude' }, openai: { name: 'OpenAI' }, gemini: { name: 'Gemini' },
}

test('happy path — applies opening + fence on a normal archive', () => {
  const out = applyAutoDraft(SAMPLE_FILLED, SAMPLE_ARCHIVE, SAMPLE_META, '2026-04')
  assert.ok(out !== SAMPLE_FILLED, 'output must differ from input on happy path')
  assert.ok(out.includes(SUMMARY_OPEN_MARKER), 'fence injected')
  assert.ok(!out.includes('<!-- Opening narrative: 1 sentence summarizing'), 'opening placeholder consumed')
})

test('returns filled unchanged when archive.services is empty (skip guard)', () => {
  const out = applyAutoDraft(SAMPLE_FILLED, { services: {} }, {}, '2026-04')
  assert.strictEqual(out, SAMPLE_FILLED, 'no-op when nothing to summarize')
})

test('returns filled unchanged when archive has no services key', () => {
  const out = applyAutoDraft(SAMPLE_FILLED, {}, {}, '2026-04')
  assert.strictEqual(out, SAMPLE_FILLED, 'no-op when archive.services missing')
})

test('returns filled unchanged when archive.services is null (defensive read)', () => {
  const out = applyAutoDraft(SAMPLE_FILLED, { services: null }, {}, '2026-04')
  assert.strictEqual(out, SAMPLE_FILLED, 'no-op when archive.services is null')
})

test('catches analyzer throw and returns filled unchanged (failure isolation)', () => {
  // Stub a throwing analyzer. Today analyze() is lenient by construction; this
  // test locks the contract so a future strict-validating rewrite doesn't quietly
  // start failing the workflow step.
  const throwingStub = {
    analyze() { throw new Error('synthetic analyzer failure') },
    generateOpening() { throw new Error('should not be called') },
    generateTldr() { throw new Error('should not be called') },
  }
  const out = applyAutoDraft(SAMPLE_FILLED, SAMPLE_ARCHIVE, SAMPLE_META, '2026-04', throwingStub)
  assert.strictEqual(out, SAMPLE_FILLED, 'analyzer throw must not corrupt the deterministic draft')
})

test('catches generateOpening throw and returns filled unchanged', () => {
  const stub = {
    analyze() { return { /* shape unused by stub */ } },
    generateOpening() { throw new Error('opening failure') },
    generateTldr() { return 'tldr' },
  }
  const out = applyAutoDraft(SAMPLE_FILLED, SAMPLE_ARCHIVE, SAMPLE_META, '2026-04', stub)
  assert.strictEqual(out, SAMPLE_FILLED)
})

// ── Integration: real 2026-04 archive end-to-end ─────────────────────
//
// Catches worker-side schema drift (MonthlyServiceData column changes) at the
// consumer level without depending on a live `/api/report` fetch. `_data/2026-04.json`
// is a long-lived snapshot committed for exactly this reason (see _data/README.md).
// The assertions are specific enough that a column rename or null-handling change
// would surface as a numerical mismatch rather than a vague flake.

console.log('\nintegration: 2026-04 archive end-to-end')

const fs = require('fs')
const path = require('path')

test('archiveToAnalysisRows on the real April snapshot yields expected counts', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  const { scores, incidents } = archiveToAnalysisRows(archive, {})
  // 31 total services in the April archive (per its own `Object.keys(services).length`)
  assert.strictEqual(incidents.length, 31, `expected 31 services in incidents rows, got ${incidents.length}`)
  // 7 services recorded zero incidents that month
  const zeroes = incidents.filter(r => r.Incidents === '0').length
  assert.strictEqual(zeroes, 7, `expected 7 zero-incident services in April, got ${zeroes}`)
  // Score column passes through as a numeric string the analyzer can parseInt
  for (const s of scores) assert.ok(/^\d+$/.test(s.Score), `non-integer Score leaked: ${s.Score}`)
})

test('full pipeline against real April archive — Opening reflects 24 of 31, no "undefined" leakage', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
  const meta = {}
  for (const id of Object.keys(archive.services)) meta[id] = { name: id }
  const { fillTemplate } = require('./generate-report')
  const filled = fillTemplate(tmpl, '2026-04', archive, meta)
  const out = applyAutoDraft(filled, archive, meta, '2026-04')

  // Fence sits inside `## Summary` (the regex correctly skips `## Incident Summary`).
  const sumIdx = out.indexOf('## Summary')
  const recsIdx = out.indexOf('## Recommendations')
  const incSumIdx = out.indexOf('## Incident Summary')
  const fenceIdx = out.indexOf(SUMMARY_OPEN_MARKER)
  assert.ok(fenceIdx > sumIdx && fenceIdx < recsIdx, `fence must be inside ## Summary; got ${fenceIdx}`)
  assert.ok(fenceIdx < incSumIdx, 'fence must precede ## Incident Summary')

  // Sanity on the analyzer output landing in the document.
  assert.ok(/24 out of 31/.test(out), 'opening should mention "24 out of 31 services recorded ... incident"')

  // The load-bearing failure mode the integration test exists for — Critical Gap #2
  // (regress the skip guard or break archive shape → analyzer emits "undefined"
  // literals into the published narrative). Pin its absence.
  const fenceBlock = out.slice(out.indexOf(SUMMARY_OPEN_MARKER), out.indexOf(SUMMARY_CLOSE_MARKER) + SUMMARY_CLOSE_MARKER.length)
  assert.ok(!/undefined/.test(fenceBlock), `auto-draft must not contain literal "undefined"; got: ${fenceBlock.slice(0, 300)}`)

  // #27 — the Security Alerts section auto-renders from archive.security via the
  // SECURITY_SECTION marker. (Previously the template shipped a hand-authored block and
  // NO marker, so buildSecuritySection never fired and every month was filled by hand.)
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'),
    'fillTemplate should consume the SECURITY_SECTION marker')
  assert.ok(!out.includes('Do not hand-author'),
    'the marker explainer comment must not leak into the rendered report')
  assert.ok(out.includes('## Security Alerts'),
    'April archive has detections → the Security Alerts section must render')
  assert.ok(new RegExp(`\\*\\*Total alerts:\\*\\* ${archive.security.totalAlerts}\\b`).test(out),
    'rendered Total alerts must match archive.security.totalAlerts')
  assert.ok(!/---\s*\n\s*---/.test(out),
    'no double horizontal rule around the auto-rendered security section')
})

test('security section omitted with no double `---` when archive.security is null — real template', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  archive.security = null
  const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
  const meta = {}
  for (const id of Object.keys(archive.services)) meta[id] = { name: id }
  const { fillTemplate } = require('./generate-report')
  const out = fillTemplate(tmpl, '2026-04', archive, meta)
  assert.ok(!out.includes('## Security Alerts'), 'no Security section when archive.security is null')
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'), 'marker removed on omission')
  assert.ok(!out.includes('Do not hand-author'), 'explainer comment removed on omission')
  assert.ok(!/---\s*\n\s*---/.test(out), 'the marker + its separator collapse without leaving a double rule')
})

// ── fillTemplate × detection (#28) ──────────────────────────────────
console.log('\nfillTemplate × detection')
test('real template: Detection section omitted (no double rule) when archive has no detection data', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  // 2026-04 has neither degradation nor detectionLead — the common ≤2026-05 case.
  const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
  const meta = {}
  for (const id of Object.keys(archive.services)) meta[id] = { name: id }
  const out = fillTemplate(tmpl, '2026-04', archive, meta)
  assert.ok(!out.includes('## Detection & RTT Degradation'), 'no Detection section without data')
  assert.ok(!out.includes('<!-- DETECTION_SECTION -->'), 'marker consumed on omission')
  assert.ok(!out.includes('buildDetectionSection)'), 'explainer comment removed on omission')
  assert.ok(!/---\s*\n\s*---/.test(out), 'no double horizontal rule after omission')
  assert.ok(/## API Response[\s\S]*?\n---\n[\s\S]*?## Incident Summary/.test(out), 'API Response → Incident Summary stay separated by one rule')
})
test('real template: Detection section renders when degradation/detectionLead present', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  archive.degradation = { total: 12, noStatusTotal: 8, byService: { deepgram: 5 }, noStatusByService: { deepgram: 4 } }
  archive.detectionLead = { count: 6, avgLeadMs: 480000, topExamples: [{ svcId: 'mistral', incId: '01ABC', leadMs: 900000, detectedAt: '2026-04-12T14:30:00Z' }] }
  const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
  const meta = {}
  for (const id of Object.keys(archive.services)) meta[id] = { name: id }
  const out = fillTemplate(tmpl, '2026-04', archive, meta)
  assert.ok(out.includes('## Detection & RTT Degradation'), 'section renders')
  assert.ok(!out.includes('<!-- DETECTION_SECTION -->'), 'marker consumed')
  assert.ok(!out.includes('buildDetectionSection)'), 'explainer not leaked')
  assert.ok(!/---\s*\n\s*---/.test(out.slice(out.indexOf('## API Response'), out.indexOf('## Incident Summary'))), 'no double rule around the section')
})

// ── injectNarrativeDraft (refs aiwatch-reports#4 Phase 3 / aiwatch#426) ──
//
// Renders archive.narrative (AI retrospective draft baked in by the Worker)
// into the Notable Incidents + Observations sections as fenced auto-draft
// blocks. Must be forward-compatible: archives without `narrative` keep their
// placeholders untouched.

const {
  injectNarrativeDraft,
  buildNotableIncidentsDraft,
  buildObservationsDraft,
  NOTABLE_OPEN_MARKER,
  NOTABLE_CLOSE_MARKER,
  OBSERVATIONS_OPEN_MARKER,
  OBSERVATIONS_CLOSE_MARKER,
} = require('./generate-report')

console.log('\ninjectNarrativeDraft')

const NARRATIVE_FILLED = [
  '## Incident Summary',
  '',
  '<tbody></tbody>',
  '',
  '## Notable Incidents',
  '',
  '<!-- Top 5-6 notable incidents -->',
  '',
  '### 1. [Title]',
  '',
  '## Observations',
  '',
  'Actionable takeaways per service.',
  '',
  '- **If you build on [Service]**:',
  '',
  '## Security Alerts',
].join('\n')

const SAMPLE_NARRATIVE = {
  model: 'gemma',
  generatedAt: '2026-06-01T00:05:00Z',
  notableIncidents: [
    { service: 'Gemini API', title: 'Vertex API key issue', affected: 'Gemini API — EU', durationLabel: '10 days', narrative: 'A key-rotation bug degraded Vertex auth.' },
    { service: 'Deepgram', title: 'Voice agent degradation', affected: 'Deepgram streaming', durationLabel: '74h', narrative: 'Streaming endpoints saw elevated latency.' },
  ],
  observations: [
    'Prefer Claude for latency-sensitive workloads this month.',
    'Treat Deepgram streaming as fallback-only until the fix is confirmed.',
  ],
}

test('returns filled unchanged when narrative is null/undefined (forward-compat)', () => {
  eq(injectNarrativeDraft(NARRATIVE_FILLED, null), NARRATIVE_FILLED)
  eq(injectNarrativeDraft(NARRATIVE_FILLED, undefined), NARRATIVE_FILLED)
})

test('returns filled unchanged when narrative is not an object (malformed)', () => {
  eq(injectNarrativeDraft(NARRATIVE_FILLED, 'oops'), NARRATIVE_FILLED)
  eq(injectNarrativeDraft(NARRATIVE_FILLED, 42), NARRATIVE_FILLED)
})

test('injects Notable Incidents block after the heading with each incident as a ### entry', () => {
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  assert.ok(out.includes(NOTABLE_OPEN_MARKER), 'notable open marker present')
  assert.ok(out.includes(NOTABLE_CLOSE_MARKER), 'notable close marker present')
  // Both incidents rendered, with their fields.
  assert.ok(out.includes('### 1. Vertex API key issue'), 'incident 1 heading')
  assert.ok(out.includes('### 2. Voice agent degradation'), 'incident 2 heading')
  assert.ok(out.includes('**Affected**: Gemini API — EU'))
  assert.ok(out.includes('**Duration**: 10 days'))
  assert.ok(out.includes('A key-rotation bug degraded Vertex auth.'))
  // Block sits inside ## Notable Incidents — before ## Observations.
  const notableIdx = out.indexOf(NOTABLE_OPEN_MARKER)
  const obsHeadingIdx = out.indexOf('## Observations')
  const notableHeadingIdx = out.indexOf('## Notable Incidents')
  assert.ok(notableIdx > notableHeadingIdx && notableIdx < obsHeadingIdx, 'block is inside Notable Incidents section')
})

test('injects Observations block after the heading with each observation as a bullet', () => {
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  assert.ok(out.includes(OBSERVATIONS_OPEN_MARKER), 'observations open marker present')
  assert.ok(out.includes(OBSERVATIONS_CLOSE_MARKER), 'observations close marker present')
  assert.ok(out.includes('- Prefer Claude for latency-sensitive workloads this month.'))
  assert.ok(out.includes('- Treat Deepgram streaming as fallback-only until the fix is confirmed.'))
})

test('does not touch ## Incident Summary (substring overlap with "Incidents")', () => {
  // `^## Notable Incidents$` line-anchored — must NOT splice into `## Incident Summary`.
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  const incSummaryBlock = out.slice(out.indexOf('## Incident Summary'), out.indexOf('## Notable Incidents'))
  assert.ok(!incSummaryBlock.includes(NOTABLE_OPEN_MARKER), 'Incident Summary section untouched')
})

test('preserves the template placeholders below each injected block (operator fills them)', () => {
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  assert.ok(out.includes('### 1. [Title]'), 'Notable Incidents placeholder retained')
  assert.ok(out.includes('- **If you build on [Service]**:'), 'Observations placeholder retained')
})

test('model label appears in the draft attribution line', () => {
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  assert.ok(out.includes('(gemma)'), 'gemma model attribution shown')
})

test('injects only Observations when notableIncidents is empty', () => {
  const obsOnly = { model: 'sonnet', notableIncidents: [], observations: ['Use X.'] }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, obsOnly)
  assert.ok(!out.includes(NOTABLE_OPEN_MARKER), 'no notable block when incidents empty')
  assert.ok(out.includes(OBSERVATIONS_OPEN_MARKER), 'observations block present')
})

test('injects only Notable Incidents when observations is empty', () => {
  const incOnly = { model: 'gemma', notableIncidents: SAMPLE_NARRATIVE.notableIncidents, observations: [] }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, incOnly)
  assert.ok(out.includes(NOTABLE_OPEN_MARKER), 'notable block present')
  assert.ok(!out.includes(OBSERVATIONS_OPEN_MARKER), 'no observations block when empty')
})

test('handles non-array notableIncidents / observations without crashing', () => {
  const bad = { model: 'gemma', notableIncidents: 'nope', observations: null }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, bad)
  eq(out, NARRATIVE_FILLED, 'malformed arrays → no-op')
})

test('skips malformed incident elements rather than emitting the string "undefined"', () => {
  // The Worker's parseMonthlyNarrative validates rows, but a KV round-trip +
  // manual workflow_dispatch makes a hand-edited / partial archive reachable.
  // Rows missing the load-bearing title / narrative fields must be dropped, not
  // rendered as "### 1. undefined".
  const mixed = {
    model: 'gemma',
    notableIncidents: [
      {},                                                            // all missing → skip
      { title: 'Has title only' },                                   // missing narrative → skip
      { service: 'X', title: 'Good one', narrative: 'Real prose.' },  // valid
    ],
    observations: [],
  }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, mixed)
  assert.ok(out.includes(NOTABLE_OPEN_MARKER), 'block injected (one valid row remains)')
  assert.ok(out.includes('### 1. Good one'), 'valid row rendered')
  assert.ok(!out.includes('undefined'), 'no literal "undefined" leaked into the report')
  // Soft fields absent on the valid row → em-dash fallback, not "undefined".
  assert.ok(out.includes('**Affected**: —'), 'missing affected falls back to em-dash')
  assert.ok(out.includes('**Duration**: —'), 'missing durationLabel falls back to em-dash')
})

test('skips the Notable Incidents section entirely when every incident row is malformed', () => {
  const allBad = { model: 'gemma', notableIncidents: [{}, { title: 'no narrative' }], observations: [] }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, allBad)
  assert.ok(!out.includes(NOTABLE_OPEN_MARKER), 'no fence when zero valid rows')
  assert.ok(!out.includes('undefined'), 'no "undefined" leak')
  eq(out, NARRATIVE_FILLED, 'whole-doc no-op when nothing valid')
})

test('filters non-string / empty observations rather than rendering "- null" / "- 42"', () => {
  const noisy = { model: 'sonnet', notableIncidents: [], observations: ['real bullet', null, 42, '', '  '] }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, noisy)
  assert.ok(out.includes('- real bullet'), 'valid observation rendered')
  assert.ok(!out.includes('- null') && !out.includes('- 42'), 'non-string observations dropped')
})

test('idempotent — a second injection does not stack a duplicate fence', () => {
  const once = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  const twice = injectNarrativeDraft(once, SAMPLE_NARRATIVE)
  const notableMarkers = (twice.match(new RegExp(NOTABLE_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  const obsMarkers = (twice.match(new RegExp(OBSERVATIONS_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  eq(notableMarkers, 1, 'exactly one Notable Incidents fence after double-inject')
  eq(obsMarkers, 1, 'exactly one Observations fence after double-inject')
})

test('buildNotableIncidentsDraft / buildObservationsDraft are fenced + carry the model label', () => {
  const nb = buildNotableIncidentsDraft(SAMPLE_NARRATIVE.notableIncidents, 'sonnet')
  assert.ok(nb.startsWith(NOTABLE_OPEN_MARKER) && nb.endsWith(NOTABLE_CLOSE_MARKER), 'notable draft fenced')
  assert.ok(nb.includes('(sonnet)'))
  const ob = buildObservationsDraft(SAMPLE_NARRATIVE.observations, 'sonnet')
  assert.ok(ob.startsWith(OBSERVATIONS_OPEN_MARKER) && ob.endsWith(OBSERVATIONS_CLOSE_MARKER), 'observations draft fenced')
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
