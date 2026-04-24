const {
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
test('zero incidents with uptime', () => {
  const w = buildWhy({ data: { incidents: 0, uptime: 100, avgResolutionMin: null } })
  eq(w, 'Zero incidents, 100.00% uptime')
})
test('zero incidents no uptime data', () => {
  const w = buildWhy({ data: { incidents: 0, uptime: null, avgResolutionMin: null } })
  eq(w, 'Zero incidents')
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

console.log('\nconfidence')
test('High when uptime + incidents present', () => {
  eq(confidence({ data: { uptime: 99.5, incidents: 3 } }), 'High')
})
test('Medium when uptime null', () => {
  eq(confidence({ data: { uptime: null, incidents: 3 } }), 'Medium')
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
  // Defense: if archive wrongly returns uptime for mistral, still exclude from table
  const services = [
    { id: 'mistral', data: { score: 75, grade: 'good', uptime: 99.5, incidents: 7, avgResolutionMin: 6, avgLatencyMs: 420 } },
  ]
  const rows = buildUptimeTable(services, { mistral: { name: 'Mistral API' } })
  eq(rows, '')
})

console.log('\nbuildLatencyTable')
test('sorts by latency asc (fastest first)', () => {
  const table = buildLatencyTable(sampleServices, sampleMeta)
  // Only content rows (header starts with "| Rank", data rows start with "| N |")
  const dataRows = table.split('\n').filter(l => /^\| \d+ \|/.test(l))
  eq(dataRows.length, 3)
  assert.ok(dataRows[0].includes('Cohere API'), `fastest should be Cohere (230ms): ${dataRows[0]}`)
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

// ── Summary ──────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
