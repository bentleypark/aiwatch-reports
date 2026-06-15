const {
  generateScoreBarSvg, generateUptimeHeatmapSvg, scoreColorByGrade,
  monthsBefore, buildTrendSeries, computeScoreMovers, computeNotableMovers, formatTrendArrow, fmtScoreDelta,
  generateTrendSvg, toMonthEntry, monthEntryFromScoreRows,
} = require('./generate-charts')
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

// ── scoreColorByGrade ────────────────────────────────────

console.log('\nscoreColorByGrade')

test('Excellent → green', () => {
  eq(scoreColorByGrade('Excellent'), '#22c55e')
})

test('Good → blue', () => {
  eq(scoreColorByGrade('Good'), '#3b82f6')
})

test('Fair → yellow', () => {
  eq(scoreColorByGrade('Fair'), '#eab308')
})

test('Degrading → red', () => {
  eq(scoreColorByGrade('Degrading'), '#ef4444')
})

test('Unstable → red', () => {
  eq(scoreColorByGrade('Unstable'), '#ef4444')
})

test('unknown grade → grey', () => {
  eq(scoreColorByGrade(''), '#6b7280')
  eq(scoreColorByGrade('Other'), '#6b7280')
})

// ── generateScoreBarSvg ──────────────────────────────────

console.log('\ngenerateScoreBarSvg')

const MOCK_SCORES = [
  { Service: 'Cohere API', Score: '100', Grade: 'Excellent', Confidence: 'High' },
  { Service: 'OpenAI API', Score: '86', Grade: 'Excellent', Confidence: 'High' },
  { Service: 'ElevenLabs', Score: '52', Grade: 'Degrading', Confidence: 'High' },
  { Service: 'Perplexity', Score: 'N/A', Grade: '', Confidence: 'Low' },
]

test('returns valid SVG string', () => {
  const svg = generateScoreBarSvg(MOCK_SCORES)
  assert.ok(svg.startsWith('<svg'), 'should start with <svg')
  assert.ok(svg.endsWith('</svg>'), 'should end with </svg>')
})

test('includes all ranked services', () => {
  const svg = generateScoreBarSvg(MOCK_SCORES)
  assert.ok(svg.includes('Cohere API'), 'should include Cohere API')
  assert.ok(svg.includes('OpenAI API'), 'should include OpenAI API')
  assert.ok(svg.includes('ElevenLabs'), 'should include ElevenLabs')
})

test('excludes N/A from bars but shows in footer', () => {
  const svg = generateScoreBarSvg(MOCK_SCORES)
  assert.ok(svg.includes('Perplexity'), 'should mention Perplexity')
  assert.ok(svg.includes('N/A (insufficient data)'), 'should show N/A note')
})

test('uses correct colors per grade', () => {
  const svg = generateScoreBarSvg(MOCK_SCORES)
  // Cohere (Excellent) → green
  assert.ok(svg.includes('fill="#22c55e"'), 'should have green bar')
  // ElevenLabs (Degrading) → red
  assert.ok(svg.includes('fill="#ef4444"'), 'should have red bar')
})

test('sorts by score descending', () => {
  const svg = generateScoreBarSvg(MOCK_SCORES)
  const cohereIdx = svg.indexOf('Cohere API')
  const openaiIdx = svg.indexOf('OpenAI API')
  const elevenIdx = svg.indexOf('ElevenLabs')
  assert.ok(cohereIdx < openaiIdx, 'Cohere (100) before OpenAI (86)')
  assert.ok(openaiIdx < elevenIdx, 'OpenAI (86) before ElevenLabs (52)')
})

test('dark background, no light mode', () => {
  const svg = generateScoreBarSvg(MOCK_SCORES)
  assert.ok(svg.includes('fill="#0d1117"'), 'should have dark bg')
  assert.ok(!svg.includes('prefers-color-scheme'), 'should not have media query')
})

test('escapes XML entities in service names', () => {
  const scores = [{ Service: 'xAI & Co', Score: '80', Grade: 'Good', Confidence: 'High' }]
  const svg = generateScoreBarSvg(scores)
  assert.ok(svg.includes('xAI &amp; Co'), 'should escape ampersand')
  assert.ok(!svg.includes('xAI & Co'), 'should not have raw ampersand')
})

test('filters NaN scores', () => {
  const scores = [
    { Service: 'Valid', Score: '90', Grade: 'Excellent', Confidence: 'High' },
    { Service: 'Bad', Score: 'TBD', Grade: '', Confidence: 'Low' },
  ]
  const svg = generateScoreBarSvg(scores)
  assert.ok(svg.includes('Valid'), 'should include valid service')
  // 'Bad' might appear in N/A footer or not as a bar
  const barSection = svg.split('N/A')[0]
  assert.ok(!barSection.includes('>Bad<'), 'should not have Bad as a bar')
})

test('handles empty scores array', () => {
  const svg = generateScoreBarSvg([])
  assert.ok(svg.startsWith('<svg'), 'should still produce valid SVG')
})

// ── generateUptimeHeatmapSvg ─────────────────────────────

console.log('\ngenerateUptimeHeatmapSvg')

const MOCK_HISTORY = {
  '2026-03-20': { claude: { ok: 248, total: 248 }, openai: { ok: 200, total: 248 } },
  '2026-03-21': { claude: { ok: 12, total: 57 }, openai: { ok: 57, total: 57 } },
  '2026-03-22': { claude: { ok: 159, total: 159 }, openai: { ok: 159, total: 159 } },
}

test('returns valid SVG string', () => {
  const svg = generateUptimeHeatmapSvg(['Claude API', 'OpenAI API'], MOCK_HISTORY, 31, '2026-03', 20, 22)
  assert.ok(svg.startsWith('<svg'), 'should start with <svg')
  assert.ok(svg.endsWith('</svg>'), 'should end with </svg>')
})

test('renders only visible days (startDay to endDay)', () => {
  const svg = generateUptimeHeatmapSvg(['Claude API'], MOCK_HISTORY, 31, '2026-03', 20, 22)
  // Should show days 20, 21, 22 (3 cells per service)
  assert.ok(svg.includes('>20<'), 'should show day 20')
  assert.ok(svg.includes('>22<'), 'should show day 22')
  assert.ok(!svg.includes('>19<'), 'should not show day 19')
  assert.ok(!svg.includes('>23<'), 'should not show day 23')
})

test('colors by ok/total ratio', () => {
  const svg = generateUptimeHeatmapSvg(['Claude API'], MOCK_HISTORY, 31, '2026-03', 20, 21)
  // Day 20: claude ok=248/total=248 (100%) → green (#3fb950)
  // Day 21: claude ok=12/total=57 (21%) → red (#ef4444)
  assert.ok(svg.includes('#3fb950'), 'should have green for 100% day')
  assert.ok(svg.includes('#ef4444'), 'should have red for <90% day')
})

test('shows dynamic month name in subtitle', () => {
  const svg = generateUptimeHeatmapSvg(['Claude API'], MOCK_HISTORY, 31, '2026-03', 20, 22)
  assert.ok(svg.includes('March'), 'should show March in subtitle')
})

test('shows full-month subtitle when startDay is 1', () => {
  const svg = generateUptimeHeatmapSvg(['Claude API'], MOCK_HISTORY, 31, '2026-03', 1, 31)
  assert.ok(svg.includes('March 1–31'), 'should show full month range')
  assert.ok(svg.includes('AIWatch polling'), 'should mention data source')
})

test('includes legend items', () => {
  const svg = generateUptimeHeatmapSvg(['Claude API'], MOCK_HISTORY, 31, '2026-03', 20, 22)
  assert.ok(svg.includes('Operational'), 'should have Operational legend')
  assert.ok(svg.includes('Degraded'), 'should have Degraded legend')
  assert.ok(svg.includes('Down'), 'should have Down legend')
})

test('no data cells for missing service IDs', () => {
  // 'unknown' service has no data in MOCK_HISTORY
  const svg = generateUptimeHeatmapSvg(['Unknown Svc'], MOCK_HISTORY, 31, '2026-03', 20, 20)
  // Should render noData color (#21262d)
  assert.ok(svg.includes('#21262d'), 'should have noData color for unknown service')
})

test('dark background, no light mode', () => {
  const svg = generateUptimeHeatmapSvg(['Claude API'], MOCK_HISTORY, 31, '2026-03', 20, 22)
  assert.ok(svg.includes('fill="#0d1117"'), 'should have dark bg')
  assert.ok(!svg.includes('prefers-color-scheme'), 'should not have media query')
})

test('heatmap cells use rx=2', () => {
  const svg = generateUptimeHeatmapSvg(['Claude API'], MOCK_HISTORY, 31, '2026-03', 20, 20)
  assert.ok(svg.includes('rx="2"'), 'should use rx=2 for cells')
})

// ── 3-Month Trend (aiwatch-reports#41) ───────────────────

console.log('\nmonthsBefore')

test('returns the N months immediately before, ascending', () => {
  assert.deepStrictEqual(monthsBefore('2026-06', 2), ['2026-04', '2026-05'])
})

test('wraps the year boundary', () => {
  assert.deepStrictEqual(monthsBefore('2026-02', 3), ['2025-11', '2025-12', '2026-01'])
})

// Three months: March is PARTIAL (12/31 days). Claude declines every month;
// Gemini improves; Newbie only appears in the last month (mid-window add).
const TREND_ENTRIES = [
  { month: '2026-03', daysInMonth: 31, daysCollected: 12, services: { claude: { score: 71, grade: 'Good' }, gemini: { score: 80, grade: 'Good' } } },
  { month: '2026-04', daysInMonth: 30, daysCollected: 30, services: { claude: { score: 68, grade: 'Good' }, gemini: { score: 85, grade: 'Good' } } },
  { month: '2026-05', daysInMonth: 31, daysCollected: 31, services: { claude: { score: 63, grade: 'Fair' }, gemini: { score: 90, grade: 'Excellent' }, newbie: { score: 50, grade: 'Fair' } } },
]

console.log('\nbuildTrendSeries')

test('aligns points 1:1 with months', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  eq(t.months.length, 3)
  eq(t.series.claude.points.length, 3)
  assert.deepStrictEqual(t.series.claude.points.map(p => p.score), [71, 68, 63])
})

test('a service added mid-window gets null for the months it was absent', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  assert.deepStrictEqual(t.series.newbie.points.map(p => p.score), [null, null, 50])
})

test('flags the partial month (daysCollected < daysInMonth)', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  assert.ok(t.partialMonths.has('2026-03'), '2026-03 should be partial')
  assert.ok(!t.partialMonths.has('2026-04'), '2026-04 (30/30) should be full')
  assert.ok(!t.partialMonths.has('2026-05'), '2026-05 (31/31) should be full')
})

console.log('\ncomputeScoreMovers')

test('ranks decliners and improvers by delta', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  const m = computeScoreMovers(t)
  eq(m.declining[0].id, 'claude')
  eq(m.declining[0].delta, -8)
  eq(m.improving[0].id, 'gemini')
  eq(m.improving[0].delta, 10)
})

test('flags a strictly monotonic decline (down every month)', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  const m = computeScoreMovers(t)
  eq(m.declining[0].monoDown, true) // claude 71 → 68 → 63
})

test('does NOT flag a flat-then-drop as down-every-month', () => {
  // 88 → 88 → 71: net decline (−17) but the first step is flat, not a decrease.
  const flat = [
    { month: '2026-03', daysInMonth: 31, daysCollected: 31, services: { svc: { score: 88, grade: 'Good' } } },
    { month: '2026-04', daysInMonth: 30, daysCollected: 30, services: { svc: { score: 88, grade: 'Good' } } },
    { month: '2026-05', daysInMonth: 31, daysCollected: 31, services: { svc: { score: 71, grade: 'Fair' } } },
  ]
  const m = computeScoreMovers(buildTrendSeries(flat))
  eq(m.declining[0].id, 'svc')
  eq(m.declining[0].delta, -17)
  eq(m.declining[0].monoDown, false)
})

test('excludes a service missing in the first or last month (no fake mover)', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  const m = computeScoreMovers(t)
  const ids = [...m.declining, ...m.improving].map(r => r.id)
  assert.ok(!ids.includes('newbie'), 'mid-window-added service must not be a mover')
})

test('returns empty movers for a single month (no trend)', () => {
  const t = buildTrendSeries([TREND_ENTRIES[2]])
  const m = computeScoreMovers(t)
  eq(m.declining.length, 0)
  eq(m.improving.length, 0)
})

test('honors a nameFor mapping', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  const m = computeScoreMovers(t, { nameFor: id => (id === 'claude' ? 'Claude API' : id) })
  eq(m.declining[0].name, 'Claude API')
})

console.log('\ncomputeNotableMovers')

// Gemini: FLAT score (64→64) but MTTR spikes 2h→22h — the decision signal a composite
// score hides. claude: score + MTTR + downtime all decline. steady: nothing moves.
const NOTABLE_ENTRIES = [
  { month: '2026-03', daysInMonth: 31, daysCollected: 31, services: {
    gemini: { score: 64, grade: 'Fair', mttr: 120, downtime: 240 },
    claude: { score: 71, grade: 'Good', mttr: 30, downtime: 60 },
    steady: { score: 80, grade: 'Good', mttr: 10, downtime: 20 },
  } },
  { month: '2026-04', daysInMonth: 30, daysCollected: 30, services: {
    gemini: { score: 64, grade: 'Fair', mttr: 600, downtime: 1200 },
    claude: { score: 68, grade: 'Good', mttr: 90, downtime: 180 },
    steady: { score: 80, grade: 'Good', mttr: 10, downtime: 20 },
  } },
  { month: '2026-05', daysInMonth: 31, daysCollected: 31, services: {
    gemini: { score: 64, grade: 'Fair', mttr: 1320, downtime: 2640 },
    claude: { score: 63, grade: 'Fair', mttr: 180, downtime: 360 },
    steady: { score: 80, grade: 'Good', mttr: 10, downtime: 20 },
  } },
]

test('surfaces a FLAT-score service whose MTTR spiked (the signal Score hides)', () => {
  const n = computeNotableMovers(buildTrendSeries(NOTABLE_ENTRIES))
  eq(n[0].id, 'gemini')          // biggest normalized move
  eq(n[0].score.delta, 0)        // score is flat
  eq(n[0].mttr.delta, 1200)
  eq(n[0].downtime.delta, 2400)
  assert.ok(n[0].emphasize === 'mttr' || n[0].emphasize === 'downtime', 'bolds a measured axis, not score')
  eq(n[0].declining, true)       // MTTR / downtime up = worse
})

test('includes a service declining on all axes', () => {
  const n = computeNotableMovers(buildTrendSeries(NOTABLE_ENTRIES))
  const claude = n.find(m => m.id === 'claude')
  assert.ok(claude, 'claude should be a notable mover')
  eq(claude.score.delta, -8)
  eq(claude.declining, true)
})

test('excludes a service that did not move on any axis', () => {
  const n = computeNotableMovers(buildTrendSeries(NOTABLE_ENTRIES))
  assert.ok(!n.some(m => m.id === 'steady'), 'a flat service is not notable')
})

test('direction follows the headline (emphasized) axis, not score', () => {
  // Score +1 (slightly up) but downtime regresses 12h → 49h — the row must read 🔻 (declining),
  // keying off the bolded downtime, not the small score gain.
  const mistralish = [
    { month: '2026-04', daysInMonth: 30, daysCollected: 30, services: { svc: { score: 77, grade: 'Good', mttr: 8, downtime: 735 } } },
    { month: '2026-05', daysInMonth: 31, daysCollected: 31, services: { svc: { score: 78, grade: 'Good', mttr: 19, downtime: 2938 } } },
  ]
  const m = computeNotableMovers(buildTrendSeries(mistralish))[0]
  eq(m.score.delta, 1)
  eq(m.emphasize, 'downtime')
  eq(m.declining, true) // headline = downtime regression
})

test('does NOT use the uptime field (the #586 / mixed-source trap)', () => {
  // A service whose only "movement" is uptime must NOT surface — uptime is excluded.
  const upOnly = [
    { month: '2026-03', daysInMonth: 31, daysCollected: 31, services: { svc: { score: 70, grade: 'Good', uptime: 72.78, mttr: 30, downtime: 60 } } },
    { month: '2026-04', daysInMonth: 30, daysCollected: 30, services: { svc: { score: 70, grade: 'Good', uptime: 99.9, mttr: 30, downtime: 60 } } },
  ]
  const n = computeNotableMovers(buildTrendSeries(upOnly))
  eq(n.length, 0) // flat score + flat MTTR/downtime → not notable, despite a huge uptime swing
})

test('falls back to Score-only notability when MTTR/downtime are absent', () => {
  const n = computeNotableMovers(buildTrendSeries(TREND_ENTRIES)) // no mttr/downtime fields
  eq(n[0].id, 'gemini')          // +10 score is the largest move here
  eq(n[0].emphasize, 'score')
  eq(n[0].mttr.delta, null)
  eq(n[0].downtime.delta, null)
})

test('honors nameFor + respects the limit', () => {
  const n = computeNotableMovers(buildTrendSeries(NOTABLE_ENTRIES), { limit: 1, nameFor: id => id.toUpperCase() })
  eq(n.length, 1)
  eq(n[0].name, 'GEMINI')
})

test('returns [] for a single month', () => {
  eq(computeNotableMovers(buildTrendSeries([NOTABLE_ENTRIES[2]])).length, 0)
})

test('excludes services the report does not rank (NO_INCIDENT_FEED / stale)', () => {
  // bedrock moves hard on every axis but is in the exclude set → must never surface as a mover,
  // mirroring the Score table's exclusion (else the trend contradicts the rest of the report).
  const withBedrock = NOTABLE_ENTRIES.map((e, i) => ({
    ...e,
    services: { ...e.services, bedrock: { score: 90 - i * 10, grade: 'Good', mttr: 10 + i * 600, downtime: 20 + i * 1200 } },
  }))
  const t = buildTrendSeries(withBedrock)
  const exclude = new Set(['bedrock'])
  assert.ok(!computeNotableMovers(t, { exclude }).some(m => m.id === 'bedrock'), 'bedrock excluded from notable movers')
  const sm = computeScoreMovers(t, { exclude })
  assert.ok(![...sm.declining, ...sm.improving].some(m => m.id === 'bedrock'), 'bedrock excluded from score movers')
  // without the exclude it WOULD appear (proves the guard is what suppresses it)
  assert.ok(computeNotableMovers(t).some(m => m.id === 'bedrock'), 'bedrock surfaces when not excluded')
})

console.log('\nformatTrendArrow / fmtScoreDelta')

test('formatTrendArrow joins present scores with arrows', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  eq(formatTrendArrow(t.series.claude.points), '71 → 68 → 63')
})

test('formatTrendArrow skips absent months', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  eq(formatTrendArrow(t.series.newbie.points), '50')
})

test('fmtScoreDelta signs the delta', () => {
  eq(fmtScoreDelta(8), '+8')
  eq(fmtScoreDelta(-8), '−8')
  eq(fmtScoreDelta(0), '±0')
})

console.log('\ngenerateTrendSvg')

test('renders without throwing and carries the title + mover label', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  const svg = generateTrendSvg(t, { nameFor: id => (id === 'claude' ? 'Claude API' : id) })
  assert.ok(svg.includes('3-Month Trend'), 'has title')
  assert.ok(svg.includes('Claude API'), 'labels the mover')
  assert.ok(svg.includes('<polyline'), 'draws lines')
})

test('marks the partial month with a star on the axis', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  const svg = generateTrendSvg(t)
  assert.ok(svg.includes('Mar*'), 'partial month axis label carries *')
  assert.ok(svg.includes('partial month'), 'has the partial footnote')
})

test('dark background, no light mode', () => {
  const t = buildTrendSeries(TREND_ENTRIES)
  const svg = generateTrendSvg(t)
  assert.ok(svg.includes('fill="#0d1117"'), 'dark bg')
  assert.ok(!svg.includes('prefers-color-scheme'), 'no media query')
})

console.log('\ntoMonthEntry / monthEntryFromScoreRows')

test('toMonthEntry computes daysInMonth + carries daysCollected', () => {
  const e = toMonthEntry('2026-03', { daysCollected: 12, services: { claude: { score: 71, grade: 'Good' } } })
  eq(e.daysInMonth, 31)
  eq(e.daysCollected, 12)
  eq(e.services.claude.score, 71)
})

test('toMonthEntry returns null when services are missing', () => {
  eq(toMonthEntry('2026-03', null), null)
  eq(toMonthEntry('2026-03', {}), null)
})

test('monthEntryFromScoreRows maps a parsed Score table to a current-month entry', () => {
  const e = monthEntryFromScoreRows('2026-05', [{ Service: 'Claude API', Score: '63', Grade: 'Fair' }])
  eq(e.services.claude.score, 63)
  eq(e.services.claude.grade, 'Fair')
  eq(e.daysCollected, e.daysInMonth) // current month treated as full
})

test('monthEntryFromScoreRows tolerates N/A scores', () => {
  const e = monthEntryFromScoreRows('2026-05', [{ Service: 'Voyage AI', Score: 'N/A', Grade: '' }])
  eq(e.services.voyageai.score, null)
})

// ── Summary ──────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
