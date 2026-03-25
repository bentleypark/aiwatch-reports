const { parseTable, toMinutes, fmtDuration, analyze, generateOpening, generateTldr, generateStats } = require('./generate-summary')
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

function deepEq(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg)
}

// ── toMinutes ─────────────────────────────────────────────
console.log('\ntoMinutes')

test('parses hours and minutes', () => {
  eq(toMinutes('2h 30m'), 150)
})

test('parses minutes only', () => {
  eq(toMinutes('45m'), 45)
})

test('parses hours only', () => {
  eq(toMinutes('3h'), 180)
})

test('handles ~ prefix', () => {
  eq(toMinutes('~18m'), 18)
})

test('handles ~Xh Ym', () => {
  eq(toMinutes('~2h 6m'), 126)
})

test('returns 0 for —', () => {
  eq(toMinutes('—'), 0)
})

test('returns 0 for N/A', () => {
  eq(toMinutes('N/A'), 0)
})

test('returns 0 for empty string', () => {
  eq(toMinutes(''), 0)
})

test('returns 0 for null', () => {
  eq(toMinutes(null), 0)
})

// ── fmtDuration ───────────────────────────────────────────
console.log('\nfmtDuration')

test('formats 0 as 0m', () => {
  eq(fmtDuration(0), '0m')
})

test('formats minutes only', () => {
  eq(fmtDuration(45), '45m')
})

test('formats hours and minutes', () => {
  eq(fmtDuration(150), '2h 30m')
})

test('formats exact hours without trailing 0m', () => {
  eq(fmtDuration(120), '2h')
})

// ── parseTable ────────────────────────────────────────────
console.log('\nparseTable')

test('parses a markdown table under heading', () => {
  const md = `## My Section\n\nSome text\n\n| Name | Value |\n|---|---|\n| A | 1 |\n| B | 2 |\n`
  const rows = parseTable(md, 'My Section')
  eq(rows.length, 2)
  eq(rows[0].Name, 'A')
  eq(rows[0].Value, '1')
  eq(rows[1].Name, 'B')
})

test('returns empty for missing heading', () => {
  const md = `## Other\n\n| X | Y |\n|---|---|\n| 1 | 2 |\n`
  eq(parseTable(md, 'Missing').length, 0)
})

test('handles table with extra whitespace', () => {
  const md = `## Score Table\n\n|  Service  |  Score  |\n|---|---|\n|  OpenAI  |  86  |\n`
  const rows = parseTable(md, 'Score Table')
  eq(rows[0].Service, 'OpenAI')
  eq(rows[0].Score, '86')
})

// ── analyze ───────────────────────────────────────────────
console.log('\nanalyze')

const MOCK_SCORES = [
  { Rank: '1', Service: 'ServiceA', Score: '100', Grade: 'Excellent', Confidence: 'High', Why: '' },
  { Rank: '2', Service: 'ServiceB', Score: '93', Grade: 'Excellent', Confidence: 'High', Why: '' },
  { Rank: '3', Service: 'ServiceC', Score: '75', Grade: 'Good', Confidence: 'High', Why: '' },
  { Rank: '4', Service: 'ServiceD', Score: '52', Grade: 'Degrading', Confidence: 'High', Why: '' },
  { Rank: '—', Service: 'ServiceE', Score: 'N/A', Grade: '—', Confidence: 'Low', Why: '' },
]

const MOCK_INCIDENTS = [
  { Service: 'ServiceA', Incidents: '0', 'Total Downtime': '—', 'Longest Incident': '—', 'Avg Resolution': '—' },
  { Service: 'ServiceB', Incidents: '2', 'Total Downtime': '1h 0m', 'Longest Incident': '40m', 'Avg Resolution': '~30m' },
  { Service: 'ServiceC', Incidents: '5', 'Total Downtime': '8h 20m', 'Longest Incident': '3h 0m', 'Avg Resolution': '~1h 40m' },
  { Service: 'ServiceD', Incidents: '10', 'Total Downtime': '20h 0m', 'Longest Incident': '5h 0m', 'Avg Resolution': '~2h 0m' },
  { Service: 'ServiceE', Incidents: '0', 'Total Downtime': '—', 'Longest Incident': '—', 'Avg Resolution': '—' },
]

test('identifies ranked vs unranked', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.ranked.length, 4)
  eq(a.unranked.length, 1)
})

test('identifies top 3 and bottom 3', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.top[0].Service, 'ServiceA')
  eq(a.bottom[0].Service, 'ServiceD')
})

test('counts grade distribution', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.excellent.length, 2)
  eq(a.good.length, 1)
  eq(a.degrading.length, 1)
})

test('calculates total downtime', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  // 60 + 500 + 1200 = 1760 minutes
  eq(a.totalDowntimeMins, 1760)
})

test('identifies services with/without incidents', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.withIncidents.length, 3)
  eq(a.zeroIncidents.length, 2)
})

test('finds most incidents', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.mostIncidents.Service, 'ServiceD')
})

test('finds fastest and slowest recovery', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.fastestRecovery.Service, 'ServiceB')
  eq(a.slowestRecovery.Service, 'ServiceD')
})

test('identifies perfect score services', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.perfectServices.length, 1)
  eq(a.perfectServices[0].Service, 'ServiceA')
})

test('selects best balance (score > 90, has incidents, lowest downtime)', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.balanceSvc.Service, 'ServiceB')
})

test('detects volatile month', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  eq(a.isVolatile, true)
  eq(a.isStable, false)
})

test('detects stable month', () => {
  const stableScores = [
    { Rank: '1', Service: 'A', Score: '100', Grade: 'Excellent', Confidence: 'High', Why: '' },
    { Rank: '2', Service: 'B', Score: '95', Grade: 'Excellent', Confidence: 'High', Why: '' },
  ]
  const stableInc = [
    { Service: 'A', Incidents: '0', 'Total Downtime': '—', 'Longest Incident': '—', 'Avg Resolution': '—' },
    { Service: 'B', Incidents: '1', 'Total Downtime': '15m', 'Longest Incident': '15m', 'Avg Resolution': '15m' },
  ]
  const a = analyze(stableScores, stableInc)
  eq(a.isStable, true)
  eq(a.isVolatile, false)
})

// ── generateOpening ───────────────────────────────────────
console.log('\ngenerateOpening')

test('generates volatile opening', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  const text = generateOpening('March 2026', a)
  assert(text.includes('March 2026'), 'should include month')
  assert(text.includes('ServiceA'), 'should include top service')
  assert(text.includes('ServiceD'), 'should include worst service')
  assert(text.includes('52/100'), 'should include worst score')
  assert(text.includes('29h 20m') || text.includes('combined downtime'), 'should include combined downtime')
})

test('generates stable opening', () => {
  const stableScores = [
    { Rank: '1', Service: 'Alpha', Score: '100', Grade: 'Excellent', Confidence: 'High', Why: '' },
  ]
  const stableInc = [
    { Service: 'Alpha', Incidents: '0', 'Total Downtime': '—', 'Longest Incident': '—', 'Avg Resolution': '—' },
  ]
  const a = analyze(stableScores, stableInc)
  const text = generateOpening('April 2026', a)
  assert(text.includes('stable month'), 'should mention stable')
  assert(text.includes('Alpha'), 'should include top service')
})

// ── generateTldr ──────────────────────────────────────────
console.log('\ngenerateTldr')

test('includes all required sections', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  const text = generateTldr(a, MOCK_INCIDENTS)
  assert(text.includes('Most reliable'), 'should have most reliable')
  assert(text.includes('Best balance'), 'should have best balance')
  assert(text.includes('Riskiest'), 'should have riskiest')
  assert(text.includes('Most incidents'), 'should have most incidents')
  assert(text.includes('Recommendations'), 'should have recommendations')
  assert(text.includes('Recovery performance'), 'should have recovery')
})

test('most reliable shows perfect services', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  const text = generateTldr(a, MOCK_INCIDENTS)
  assert(text.includes('ServiceA (100/100'), 'should show perfect score service')
})

// ── generateStats ─────────────────────────────────────────
console.log('\ngenerateStats')

test('includes all stat lines', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  const text = generateStats(a)
  assert(text.includes('Total services: 5'), 'total services')
  assert(text.includes('Services with incidents: 3'), 'with incidents')
  assert(text.includes('Zero-incident services: 2'), 'zero incidents')
  assert(text.includes('2 Excellent'), 'excellent count')
  assert(text.includes('1 Good'), 'good count')
  assert(text.includes('1 Degrading'), 'degrading count')
  assert(text.includes('Unranked (N/A): 1'), 'unranked count')
})

// ── Results ───────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
