const { parseTableGroups, toMinutes, fmtDuration, analyze, generateOpening, generateTldr, generateStats } = require('./generate-summary')
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

// ── parseTableGroups ──────────────────────────────────────
console.log('\nparseTableGroups')

test('parses a markdown table under heading', () => {
  const md = `## My Section\n\nSome text\n\n| Name | Value |\n|---|---|\n| A | 1 |\n| B | 2 |\n`
  const groups = parseTableGroups(md, 'My Section')
  eq(groups.length, 1)
  const rows = groups[0]
  eq(rows.length, 2)
  eq(rows[0].Name, 'A')
  eq(rows[0].Value, '1')
  eq(rows[1].Name, 'B')
})

test('returns empty for missing heading', () => {
  const md = `## Other\n\n| X | Y |\n|---|---|\n| 1 | 2 |\n`
  eq(parseTableGroups(md, 'Missing').length, 0)
})

test('handles table with extra whitespace', () => {
  const md = `## Score Table\n\n|  Service  |  Score  |\n|---|---|\n|  OpenAI  |  86  |\n`
  const rows = parseTableGroups(md, 'Score Table')[0]
  eq(rows[0].Service, 'OpenAI')
  eq(rows[0].Score, '86')
})

// aiwatch-reports#106 — the Score section renders one table per confidence tier.
test('returns one group per table when a section holds several', () => {
  const md = `## AIWatch Score — July 2026\n\n| Rank | Service |\n|---|---|\n| 1 | Windsurf |\n\n`
    + `**No Official Uptime**\n\n*caption*\n\n| Rank | Service |\n|---|---|\n| 1 | Gemini API |\n| 2 | Deepgram |\n`
  const groups = parseTableGroups(md, 'AIWatch Score')
  eq(groups.length, 2)
  eq(groups[0].length, 1)
  eq(groups[0][0].Service, 'Windsurf')
  eq(groups[1].length, 2)
  eq(groups[1][0].Service, 'Gemini API')
})

test('a heading containing regex metacharacters is matched literally', () => {
  // `## Official Uptime (Primary Component)` is a real heading in this report; unescaped, the parens
  // would compile to a group and the section would silently read as absent.
  const md = '## Official Uptime (Primary Component)\n\n| Service | Uptime |\n|---|---|\n| Groq Cloud | 100% |\n'
  eq(parseTableGroups(md, 'Official Uptime (Primary Component)')[0][0].Service, 'Groq Cloud')
})

test('only a line-leading ## is a heading', () => {
  const prose = 'see ## AIWatch Score below\n\n| Rank | Service |\n|---|---|\n| 1 | Windsurf |\n'
  eq(parseTableGroups(prose, 'AIWatch Score').length, 0, 'a mid-sentence mention is not the section')
  const deeper = '### AIWatch Score\n\n| Rank | Service |\n|---|---|\n| 1 | Windsurf |\n'
  eq(parseTableGroups(deeper, 'AIWatch Score').length, 0, 'a ### subsection is not the ## section')
})

test('stops at the next ## heading instead of reaching into the following section', () => {
  // The predecessor scanned past a table-less section and matched the NEXT section's table (#49).
  const md = `## AIWatch Score — July 2026\n\nprose only, no table\n\n## 30-Day Uptime\n\n| Service | Uptime |\n|---|---|\n| Claude API | 99.1% |\n`
  eq(parseTableGroups(md, 'AIWatch Score').length, 0)
  eq(parseTableGroups(md, '30-Day Uptime')[0][0].Service, 'Claude API')
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

// aiwatch-reports#106 — a held-out service placed FIRST, with a perfect Score and an incident row, so
// it is the candidate every Score-ordered pick would otherwise choose. One test per consumer: each
// of these reverting to `ranked` is a separate one-word mutation, and before this test only `bottom`
// would have caught any of them.
// THREE held-out rows, one per band, because each consumer filters on a different range and a row
// outside a consumer's band cannot exercise it: 100 for `perfectServices`, 96 for `balanceCandidates`
// (> 90 && < 100, with the lowest downtime of any candidate so it would win), 88 for `fallback`
// (>= 80 && < 95) and `balanceSvc`'s `??` arm (>= 80 && < 100).
const HELD_OUT_NAMES = ['NoUptimeSvc', 'NoUptimeBal', 'NoUptimeMid']
const HELD_OUT_FIRST = [
  { Rank: '1', Service: 'NoUptimeSvc', Score: '100', Grade: 'Excellent', Confidence: 'High', Rankable: false, Why: '' },
  { Rank: '2', Service: 'NoUptimeBal', Score: '96', Grade: 'Excellent', Confidence: 'High', Rankable: false, Why: '' },
  { Rank: '3', Service: 'NoUptimeMid', Score: '88', Grade: 'Excellent', Confidence: 'High', Rankable: false, Why: '' },
  ...MOCK_SCORES,
]
const HELD_OUT_INCIDENTS = [
  { Service: 'NoUptimeSvc', Incidents: '1', 'Total Downtime': '5m', 'Longest Incident': '5m', 'Avg Resolution': '~5m' },
  { Service: 'NoUptimeBal', Incidents: '1', 'Total Downtime': '1m', 'Longest Incident': '1m', 'Avg Resolution': '~1m' },
  { Service: 'NoUptimeMid', Incidents: '1', 'Total Downtime': '10m', 'Longest Incident': '10m', 'Avg Resolution': '~10m' },
  ...MOCK_INCIDENTS,
]

test('a Rankable:false service leads no Score-ordered pick', () => {
  const a = analyze(HELD_OUT_FIRST, HELD_OUT_INCIDENTS)
  eq(a.top[0].Service, 'ServiceA', 'top — feeds "X led the rankings"')
  for (const n of HELD_OUT_NAMES) {
    eq(a.perfectServices.some(r => r.Service === n), false, `perfectServices — feeds "Most reliable" (${n})`)
    eq(a.balanceSvc?.Service === n, false, `balanceSvc — feeds "Best balance" (${n})`)
    assert.ok(!a.bottom.some(r => r.Service === n), `bottom — feeds "Riskiest" (${n})`)
    assert.ok(!a.top.some(r => r.Service === n), `top (${n})`)
  }
})

test('…but it is still counted in every census figure', () => {
  const a = analyze(HELD_OUT_FIRST, HELD_OUT_INCIDENTS)
  eq(a.ranked.length, 7, 'the month had 7 scored services and the census must say so')
  eq(a.excellent.length, 5, 'a 100 is an Excellent month whether or not it can be ranked')
  eq(a.rankable.length, 4)
})

test('balanceSvc\'s fallback arm skips a held-out service too', () => {
  // `balanceCandidates` is empty when no service scores >90 AND has an incident, so the `??` arm
  // runs — a separate reversion site from the primary list, and previously unreachable in any test.
  const noBalanceCandidate = HELD_OUT_FIRST.map(r => (['ServiceA', 'ServiceB'].includes(r.Service) ? { ...r, Score: '84' } : r))
  const a = analyze(noBalanceCandidate, HELD_OUT_INCIDENTS)
  eq(a.balanceSvc?.Service, 'ServiceA', `the ?? arm must pick a rankable service, got ${a.balanceSvc?.Service}`)
})

test('the TL;DR recommends nobody on an incomparable Score', () => {
  const a = analyze(HELD_OUT_FIRST, HELD_OUT_INCIDENTS)
  const lines = generateTldr(a, HELD_OUT_INCIDENTS).split('\n')
  const scoreOrdered = lines.filter(l => /Most reliable|Best balance|Riskiest|Primary|Fallback/.test(l))
  eq(scoreOrdered.length, 5, 'all five Score-ordered lines are present to be checked')
  for (const l of scoreOrdered) for (const n of HELD_OUT_NAMES) assert.ok(!l.includes(n), `${n} in: ${l}`)
})

test('…while the INCIDENT-ordered picks still name it, deliberately', () => {
  // The other direction of the same decision: incident counts and durations are on one footing for
  // every tracked service, so gating them too would drop real findings for no gain. Pinned, or the
  // "deliberately not gated" comment in analyze() is just an assertion nobody checks.
  const a = analyze(HELD_OUT_FIRST, HELD_OUT_INCIDENTS)
  const recovery = generateTldr(a, HELD_OUT_INCIDENTS).split('\n').find(l => l.includes('Recovery performance'))
  assert.ok(HELD_OUT_NAMES.some(n => recovery.includes(n)), recovery)
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
  assert(text.includes('ServiceD (52)'), 'should include worst score')
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
  assert(text.includes('ServiceA (100'), 'should show perfect score service')
})

test('does not pair a Score with total downtime in an auto-draft bullet (#119)', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  const lines = generateTldr(a, MOCK_INCIDENTS).split('\n')
  eq(lines.find(line => line.includes('Best balance')), '- **Best balance (stability + ecosystem)**: ServiceB (93)')
  eq(lines.find(line => line.includes('Riskiest this month')), '- **Riskiest this month**: ServiceD (52)')
  assert.ok(lines.find(line => line.includes('Most incidents')).includes('20h 0m downtime'),
    'incident-only framing retains its downtime evidence')
})

test('MoM-frames the Most-incidents bullet when a prior count is provided (aiwatch-reports#54)', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  const curr = parseInt(a.mostIncidents.Incidents, 10)
  const text = generateTldr(a, MOCK_INCIDENTS, { [a.mostIncidents.Service]: { prev: curr + 40, curr } })
  assert(text.includes(`${curr + 40} last month`), 'shows prior-month count')
  assert(text.includes('(−40)'), 'shows signed delta')
})

test('omits the MoM tail when no prior count is provided (backward-compat)', () => {
  const a = analyze(MOCK_SCORES, MOCK_INCIDENTS)
  assert(!generateTldr(a, MOCK_INCIDENTS).includes('last month'), 'no MoM tail by default')
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
