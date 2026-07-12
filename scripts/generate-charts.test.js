const {
  generateScoreBarSvg, generateUptimeHeatmapSvg, scoreColorByGrade,
  monthsBefore, buildTrendSeries, computeScoreMovers, computeNotableMovers, formatTrendArrow, fmtScoreDelta,
  generateTrendSvg, toMonthEntry, monthEntryFromScoreRows, rosterForMonth, spreadLabelYs,
  buildMoverExclude, notableMoversForChart,
  uptimeLookbackDays, uptimeLookbackSpan, explainWindow, missingMonthDays, elapsedMonthDays, hasDayData,
  heatmapGate, describeMissing, dataSpan, daysInMonthOf, UPTIME_MAX_LOOKBACK_DAYS,
} = require('./generate-charts')
const assert = require('assert')
const { spawnSync } = require('child_process')
const path = require('path')

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

test('excludes services the report does not rank (SCORE_WITHHELD / stale)', () => {
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

// ── rosterForMonth (heatmap month-roster filter, aiwatch-reports#63) ──
const CAT = ['claude', 'openai', 'bedrock', 'characterai', 'langfuse', 'turbopuffer', 'twelvelabs']

test('rosterForMonth drops ids absent from the month archive (added after the month)', () => {
  // archive = existed-in-month set (excludes July-added turbopuffer/twelvelabs)
  const out = rosterForMonth(CAT, ['claude', 'openai', 'bedrock', 'characterai', 'langfuse'])
  assert.deepStrictEqual(out, ['claude', 'openai', 'bedrock', 'characterai', 'langfuse'])
  assert.ok(!out.includes('turbopuffer') && !out.includes('twelvelabs'))
})

test('rosterForMonth KEEPS score-excluded-but-existed services (bedrock/azure/characterai + mid-month)', () => {
  // bedrock/characterai are score-withheld; langfuse is mid-month-added — all existed, all kept
  const out = rosterForMonth(CAT, ['claude', 'bedrock', 'characterai', 'langfuse'])
  assert.ok(out.includes('bedrock') && out.includes('characterai') && out.includes('langfuse'))
})

test('rosterForMonth preserves category order', () => {
  const out = rosterForMonth(['a', 'b', 'c', 'd'], ['d', 'b', 'a'])
  assert.deepStrictEqual(out, ['a', 'b', 'd']) // input order, filtered — not roster order
})

test('rosterForMonth fail-opens on null roster (missing/corrupt snapshot)', () => {
  assert.deepStrictEqual(rosterForMonth(CAT, null), CAT)
})

test('rosterForMonth fail-opens on empty roster', () => {
  assert.deepStrictEqual(rosterForMonth(CAT, []), CAT)
})

// ── spreadLabelYs (trend end-label de-collision, aiwatch-reports#65) ──
test('spreadLabelYs separates two labels at the same y by minGap', () => {
  // Copilot(88)/Perplexity(88) both anchor at y=90 → must split
  assert.deepStrictEqual(spreadLabelYs([90, 90], 12), [90, 102])
})

test('spreadLabelYs leaves already-spaced labels untouched', () => {
  assert.deepStrictEqual(spreadLabelYs([90, 108, 135], 12), [90, 108, 135])
})

test('spreadLabelYs preserves INPUT order (not sorted order)', () => {
  // input out of order: the label at index 0 (y=108) and index 1 (y=90) — output keeps index positions
  assert.deepStrictEqual(spreadLabelYs([108, 90], 12), [108, 90])
})

test('spreadLabelYs cascades a tight cluster', () => {
  // three within <minGap of each other → 90, 102, 114
  assert.deepStrictEqual(spreadLabelYs([90, 95, 100], 12), [90, 102, 114])
})

test('spreadLabelYs handles single + empty', () => {
  assert.deepStrictEqual(spreadLabelYs([90], 12), [90])
  assert.deepStrictEqual(spreadLabelYs([], 12), [])
})

test('generateTrendSvg emits two same-final-Score movers at different label ys (wiring)', () => {
  // guards against a future refactor silently unwiring spreadLabelYs while the pure-fn
  // tests stay green — the actual #65 bug was two movers ending at 88 overlapping.
  const trend = { months: ['2026-04', '2026-05', '2026-06'], partialMonths: new Set(), series: {} }
  const movers = {
    declining: [],
    improving: [
      { id: 'copilot', name: 'GitHub Copilot', delta: 19, points: [{ score: 69 }, { score: 78 }, { score: 88 }] },
      { id: 'perplexity', name: 'Perplexity', delta: 12, points: [{ score: 76 }, { score: 82 }, { score: 88 }] },
    ],
  }
  const svg = generateTrendSvg(trend, { movers, nameFor: id => id })
  const ys = [...svg.matchAll(/<text[^>]*\sy="([0-9.]+)"[^>]*>(?:GitHub Copilot|Perplexity)/g)].map(m => Number(m[1]))
  eq(ys.length, 2, `both mover labels present (got ${ys.length})`)
  assert.ok(Math.abs(ys[0] - ys[1]) >= 12, `same-score labels must be ≥12 apart, got ${JSON.stringify(ys)}`)
})

// ── buildMoverExclude (moved from generate-report.js, aiwatch-reports#67) ──
console.log('\nbuildMoverExclude')

test('excludes SCORE_WITHHELD / stale / recently-added, keeps established; null → empty', () => {
  const services = {
    bedrock: { score: 90 },                             // SCORE_WITHHELD
    deepseek: { score: 88, incidentSourceStale: true }, // stale (archive flag)
    fal: { score: 77, addedAt: '2026-06-24' },          // added IN the report month
    claude: { score: 71 },                              // established → kept
  }
  const ex = buildMoverExclude(services, '2026-06')
  assert.ok(ex.has('bedrock'), 'bedrock (SCORE_WITHHELD) excluded')
  assert.ok(ex.has('deepseek'), 'stale source excluded')
  assert.ok(ex.has('fal'), 'recently-added (addedAt in report month) excluded')
  assert.ok(!ex.has('claude'), 'established service kept')
  assert.strictEqual(ex.size, 3)
})

test('a service added in a PRIOR month is NOT excluded', () => {
  const ex = buildMoverExclude({ fal: { score: 77, addedAt: '2026-05-10' } }, '2026-06')
  assert.ok(!ex.has('fal'), 'prior-month addedAt → full coverage → not excluded')
})

test('null archive → empty set (fail-open)', () => {
  const ex = buildMoverExclude(null, '2026-06')
  assert.ok(ex instanceof Set && ex.size === 0)
})

// ── notableMoversForChart (aiwatch-reports#67) ──
console.log('\nnotableMoversForChart')

test('splits by SCORE delta and carries {id,name,delta,points}', () => {
  const pts = [{ score: 70 }, { score: 78 }]
  const notable = [
    { id: 'up', name: 'Up', score: { first: 70, last: 78, delta: 8, points: pts }, declining: false },
    { id: 'down', name: 'Down', score: { first: 78, last: 70, delta: -8, points: pts }, declining: true },
  ]
  const { declining, improving } = notableMoversForChart(notable)
  eq(improving.length, 1)
  eq(improving[0].id, 'up')
  eq(declining.length, 1)
  eq(declining[0].id, 'down')
  // item shape
  eq(improving[0].name, 'Up')
  eq(improving[0].delta, 8)
  eq(improving[0].points, pts)
})

test('a flat-Score row (delta 0) follows the table declining flag', () => {
  const pts = [{ score: 64 }, { score: 64 }]
  const flatDeclining = [{ id: 'g', name: 'G', score: { delta: 0, points: pts }, declining: true }]
  const flatImproving = [{ id: 'g', name: 'G', score: { delta: 0, points: pts }, declining: false }]
  eq(notableMoversForChart(flatDeclining).declining.length, 1)   // declining flag → declining
  eq(notableMoversForChart(flatDeclining).improving.length, 0)
  eq(notableMoversForChart(flatImproving).improving.length, 1)   // not declining → improving
})

// ── wiring: the CHART emphasizes the NOTABLE set, not the Score-mover set (#67) ──
console.log('\ntrend chart wiring (notable movers, #67)')

test('generateTrendSvg emphasizes the Notable Movers, not computeScoreMovers', () => {
  // NOTABLE_ENTRIES: gemini has a FLAT score (64→64) but a huge MTTR/downtime spike, so it is a
  // Notable Mover but NOT a Score mover (delta 0). claude declines -8 (both a Notable + a Score
  // mover). So the notable-chart must label gemini; the old Score-mover chart would NOT.
  const trend = buildTrendSeries(NOTABLE_ENTRIES)
  const nameFor = id => id

  const notable = computeNotableMovers(trend, { nameFor })
  const notableSet = new Set(notable.map(m => m.id))
  assert.ok(notableSet.has('gemini') && notableSet.has('claude'), 'fixture sanity')

  const movers = notableMoversForChart(notable)
  const notableSvg = generateTrendSvg(trend, { nameFor, movers })
  // Extract emphasized label ids (mover end-labels are the only service-name texts).
  const labeled = id => new RegExp(`<text[^>]*>${id} [±+−]`).test(notableSvg)
  assert.ok(labeled('gemini'), 'notable chart labels gemini (flat score, spiked MTTR)')
  assert.ok(labeled('claude'), 'notable chart labels claude')

  // The old Score-mover path would NOT emphasize gemini (delta 0 is not a score mover).
  const scoreMovers = computeScoreMovers(trend, { nameFor })
  const scoreSet = new Set([...scoreMovers.declining, ...scoreMovers.improving].map(m => m.id))
  assert.ok(!scoreSet.has('gemini'), 'score movers exclude gemini — proves the chart changed source')
  assert.deepStrictEqual([...notableSet].sort(), ['claude', 'gemini'])
})

// ── chart current-month entry must carry MTTR/downtime, else MTTR-driven movers vanish (#67) ──
// Pins WHY the trend CLI builds the current month via toMonthEntry (archive) not
// monthEntryFromScoreRows (Score/grade only): a flat-Score service whose only signal is an
// MTTR spike is a Notable Mover in the table but disappears if the current entry lacks MTTR.
test('computeNotableMovers surfaces an MTTR-driven mover ONLY when the current entry carries MTTR (#67)', () => {
  const prior = toMonthEntry('2026-05', { services: { gemini: { score: 64, grade: 'Fair', avgResolutionMin: 120, totalDowntimeMin: 240 } } })
  const archiveCurrent = toMonthEntry('2026-06', { services: { gemini: { score: 64, grade: 'Fair', avgResolutionMin: 1320, totalDowntimeMin: 2640 } } })
  const rowsCurrent = monthEntryFromScoreRows('2026-06', [{ Service: 'Gemini API', Score: '64', Grade: 'Fair' }])
  // archive-based current entry (the fixed CLI path) → gemini's MTTR spike is visible → mover
  const withArchive = computeNotableMovers(buildTrendSeries([prior, archiveCurrent]))
  assert.ok(withArchive.some(m => m.id === 'gemini'), 'gemini surfaces when current entry carries MTTR')
  // Score-table-only current entry (the old bug path) → MTTR null → flat Score → NOT a mover
  const withRows = computeNotableMovers(buildTrendSeries([prior, rowsCurrent]))
  assert.ok(!withRows.some(m => m.id === 'gemini'), 'gemini vanishes when current entry lacks MTTR — why the CLI must use toMonthEntry')
})

// ── aiwatch-reports#77 — heatmap lookback window ──────────────────
// The /api/uptime `days` param is a lookback anchored to TODAY. The old code passed
// `daysInMonth`, so a chart built D days after month-end lost the month's first D days.

const JUL10 = new Date(Date.UTC(2026, 6, 10)) // 2026-07-10

test('uptimeLookbackDays reaches back to the month\'s first day', () => {
  // June 1 → July 10 inclusive = 40 days. The old code passed 30 and started the chart on June 11.
  assert.strictEqual(uptimeLookbackDays('2026-06', JUL10), 40)
  assert.notStrictEqual(uptimeLookbackDays('2026-06', JUL10), 30, 'must not pass daysInMonth')
})

test('uptimeLookbackDays: generated on the last day of the month → exactly daysInMonth', () => {
  // The one case where the old bug was invisible.
  assert.strictEqual(uptimeLookbackDays('2026-06', new Date(Date.UTC(2026, 5, 30))), 30)
})

test('uptimeLookbackDays: generated on the 1st → 1 day (in-progress month)', () => {
  assert.strictEqual(uptimeLookbackDays('2026-07', new Date(Date.UTC(2026, 6, 1))), 1)
})

test('uptimeLookbackDays regressions the months the bug actually truncated', () => {
  // April and May were both generated after month-end, so days=daysInMonth landed the window
  // mid-month: April's chart starts on the 5th, May's on the 3rd, while their headers read
  // "April 1–30" / "May 1–31". These are the windows those runs SHOULD have requested.
  assert.strictEqual(uptimeLookbackDays('2026-04', new Date(Date.UTC(2026, 4, 4))), 34) // Apr 1 → May 4
  assert.strictEqual(uptimeLookbackDays('2026-05', new Date(Date.UTC(2026, 5, 2))), 33) // May 1 → Jun 2
})

test('March is NOT a victim — its late start was real, not truncation', () => {
  // The first March chart (git 3aa29a2, committed 2026-03-27) is subtitled "March 20–27". With
  // days=31 its window reached back to 2026-02-25 — it COULD see March 1–19 and found nothing.
  // Monitoring genuinely began 2026-03-20, and the report header says so ("Period: March 20–31").
  const firstGen = new Date(Date.UTC(2026, 2, 27))
  assert.strictEqual(uptimeLookbackSpan('2026-03', firstGen), 27, 'the window already reached March 1')
  assert.ok(uptimeLookbackSpan('2026-03', firstGen) < 31, 'days=31 over-reached into February')
})

test('uptimeLookbackDays clamps to the endpoint cap', () => {
  const farFuture = new Date(Date.UTC(2027, 0, 1))
  assert.strictEqual(uptimeLookbackDays('2026-06', farFuture), UPTIME_MAX_LOOKBACK_DAYS)
})

test('uptimeLookbackDays rejects a month that has not started', () => {
  assert.throws(() => uptimeLookbackDays('2026-08', JUL10), /has not started/)
})

test('uptimeLookbackDays rejects a malformed monthKey', () => {
  assert.throws(() => uptimeLookbackDays('2026-13', JUL10), /invalid monthKey/)
  assert.throws(() => uptimeLookbackDays('nonsense', JUL10), /invalid monthKey/)
})

test('window errors carry no internal fn name — the CLI already prefixes them', () => {
  // The CLI prints `✗ Cannot determine the uptime window: ${err.message}`; a `uptimeLookbackSpan:`
  // prefix inside the message produced a double-prefixed line naming a helper the operator
  // cannot act on.
  for (const bad of ['2026-13', '2027-01']) {
    assert.throws(() => uptimeLookbackDays(bad, JUL10), err => !/uptimeLookback/.test(err.message))
  }
})

// ── coverage gate ────────────────────────────────────────────────

const fullJune = Object.fromEntries(
  Array.from({ length: 30 }, (_, i) => [`2026-06-${String(i + 1).padStart(2, '0')}`, { claude: {} }]),
)

test('missingMonthDays: full coverage → no gap', () => {
  assert.deepStrictEqual(missingMonthDays(fullJune, '2026-06', 30, JUL10), [])
})

test('missingMonthDays names the exact days the old bug dropped', () => {
  const truncated = { ...fullJune }
  for (let d = 1; d <= 9; d++) delete truncated[`2026-06-0${d}`]
  const missing = missingMonthDays(truncated, '2026-06', 30, JUL10)
  assert.strictEqual(missing.length, 9)
  assert.strictEqual(missing[0], '2026-06-01')
  assert.strictEqual(missing[8], '2026-06-09')
})

test('missingMonthDays: an interior hole is a gap too', () => {
  const holed = { ...fullJune }
  delete holed['2026-06-15']
  assert.deepStrictEqual(missingMonthDays(holed, '2026-06', 30, JUL10), ['2026-06-15'])
})

test('missingMonthDays: future days of an in-progress month are not missing', () => {
  const julSoFar = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`2026-07-${String(i + 1).padStart(2, '0')}`, { claude: {} }]),
  )
  // July has 31 days; only 1–10 have happened. No gap.
  assert.deepStrictEqual(missingMonthDays(julSoFar, '2026-07', 31, JUL10), [])
  // Drop July 3 → that one IS missing.
  delete julSoFar['2026-07-03']
  assert.deepStrictEqual(missingMonthDays(julSoFar, '2026-07', 31, JUL10), ['2026-07-03'])
})

// ── subtitle honesty ─────────────────────────────────────────────

test('heatmap subtitle states the span actually rendered, not the whole month', () => {
  const names = ['Claude']
  // Starts on the 1st but ends on the 20th (in-progress month rendered with --allow-partial).
  const svg = generateUptimeHeatmapSvg(names, fullJune, 30, '2026-06', 1, 20)
  assert.ok(svg.includes('June 1–20'), 'must say 1–20')
  assert.ok(!svg.includes('June 1–30'), 'old code printed 1–daysInMonth whenever it started on the 1st')
})

test('heatmap subtitle covers the full month when data does', () => {
  const svg = generateUptimeHeatmapSvg(['Claude'], fullJune, 30, '2026-06', 1, 30)
  assert.ok(svg.includes('June 1–30'))
})

test('elapsedMonthDays: a finished month is fully elapsed', () => {
  assert.strictEqual(elapsedMonthDays('2026-06', 30, JUL10), 30)
})

test('elapsedMonthDays: an in-progress month stops at today', () => {
  assert.strictEqual(elapsedMonthDays('2026-07', 31, JUL10), 10)
})

test('zero coverage is distinguishable from a partial gap', () => {
  // The guard the CLI uses: missing.length === elapsedMonthDays → nothing at all was fetched.
  // A month past retention returns no days; --allow-partial must not paint 31 gray columns
  // captioned as the full month.
  const none = missingMonthDays({}, '2026-03', 31, JUL10)
  assert.strictEqual(none.length, elapsedMonthDays('2026-03', 31, JUL10), 'all 31 days missing = zero coverage')

  const partial = { ...fullJune }
  for (let d = 1; d <= 9; d++) delete partial[`2026-06-0${d}`]
  assert.notStrictEqual(missingMonthDays(partial, '2026-06', 30, JUL10).length, elapsedMonthDays('2026-06', 30, JUL10))
})

test('explainWindow distinguishes the endpoint cap from a data hole', () => {
  // 2026-04 on 2026-07-10 needs a 101-day lookback → clamped → first 11 days unreachable.
  // Assert the load-bearing NUMBERS and the two-way classifier token, not the exact prose.
  const clamped = explainWindow('2026-04', JUL10)
  assert.match(clamped, /101/)          // the uncapped span it needed
  assert.match(clamped, /11/)           // the days it cannot reach
  assert.match(clamped, /unreachable/)  // classifier: the endpoint's ?days= cap

  // 2026-06 needs 40 days — inside retention, so any gap is the data's fault, not the window's.
  const inside = explainWindow('2026-06', JUL10)
  assert.match(inside, /40/)
  assert.ok(!/unreachable/.test(inside), 'classifier: not a cap')
})

test('uptimeLookbackSpan is uncapped; uptimeLookbackDays is capped', () => {
  assert.strictEqual(uptimeLookbackSpan('2026-04', JUL10), 101)
  assert.strictEqual(uptimeLookbackDays('2026-04', JUL10), UPTIME_MAX_LOOKBACK_DAYS)
  // Below the cap the two agree.
  assert.strictEqual(uptimeLookbackSpan('2026-06', JUL10), uptimeLookbackDays('2026-06', JUL10))
})

// ── a day key that exists but carries nothing must not count as coverage ─────
// Two reviewers found this independently: `{}` is truthy, so a `!history[key]` gate would pass a
// month of empty days and render a full grid of gray columns at exit 0 — reintroducing
// the very silent failure #77 exists to remove.

test('hasDayData rejects every empty shape', () => {
  for (const empty of [undefined, null, {}, [], 0, '', false]) {
    assert.strictEqual(hasDayData(empty), false, `${JSON.stringify(empty)} must not count as data`)
  }
  assert.strictEqual(hasDayData({ claude: { up: 288, total: 288 } }), true)
})

test('a month of {} day-entries is zero coverage, not full coverage', () => {
  const allEmpty = Object.fromEntries(
    Array.from({ length: 31 }, (_, i) => [`2026-03-${String(i + 1).padStart(2, '0')}`, {}]),
  )
  // The old truthiness check would have found 0 missing days here.
  assert.strictEqual(Object.keys(allEmpty).filter(k => !allEmpty[k]).length, 0)
  // The gate must see all 31 as missing → zero coverage → refuse even with --allow-partial.
  const missing = missingMonthDays(allEmpty, '2026-03', 31, JUL10)
  assert.strictEqual(missing.length, 31)
  assert.strictEqual(missing.length, elapsedMonthDays('2026-03', 31, JUL10), 'zero coverage')
})

test('a single hollow day inside an otherwise full month is a gap', () => {
  const holed = { ...fullJune, '2026-06-15': {} }
  assert.deepStrictEqual(missingMonthDays(holed, '2026-06', 30, JUL10), ['2026-06-15'])
})

// ── one clock for the whole run ──────────────────────────────────────────────
test('the three window fns agree when handed the same `today`', () => {
  // They each default to `new Date()`; the CLI threads one captured clock through all of them so a
  // midnight-UTC crossing during the 30s fetch cannot split the window from the coverage check.
  const midnightish = new Date(Date.UTC(2026, 6, 10, 23, 59, 59))
  assert.strictEqual(uptimeLookbackDays('2026-06', midnightish), 40)
  assert.strictEqual(elapsedMonthDays('2026-06', 30, midnightish), 30)
  assert.deepStrictEqual(missingMonthDays(fullJune, '2026-06', 30, midnightish), [])
})

test('an uncomputable uptime ratio renders gray, never red', () => {
  // Absence must not be painted as an outage. {} and {ok:0,total:0} both give NaN.
  const GRAY = '#21262d', RED = '#ef4444', GREEN = '#3fb950'
  // Key on the cell's semantic signature (cellSize=16), NOT its x-position: an x-anchored regex
  // silently latches onto a legend swatch when padding or labelWidth changes.
  const cellColor = dayValue => {
    const svg = generateUptimeHeatmapSvg(['Claude'], { '2026-06-01': dayValue }, 1, '2026-06', 1, 1)
    const cells = [...svg.matchAll(/<rect [^>]*width="16"[^>]*fill="(#[0-9a-f]{6})"/g)]
    assert.strictEqual(cells.length, 1, 'exactly one data cell for a 1-service 1-day heatmap')
    return cells[0][1]
  }
  assert.strictEqual(cellColor({ claude: { ok: 288, total: 288 } }), GREEN)
  assert.strictEqual(cellColor({ claude: {} }), GRAY, '{} used to render RED via NaN')
  assert.strictEqual(cellColor({ claude: { ok: 0, total: 0 } }), GRAY, '0/0 is NaN, not an outage')
  assert.strictEqual(cellColor({ claude: null }), GRAY)
  // A genuine outage still renders red.
  assert.strictEqual(cellColor({ claude: { ok: 0, total: 288 } }), RED)
})

// ── the gate's ORDER is the contract (aiwatch-reports#77) ────────────────────
// The predicate tests above prove zero-coverage is *distinguishable* from a partial gap. These
// prove the CLI's decision consults it FIRST. A refactor letting --allow-partial short-circuit
// ahead of the zero-coverage check would render an empty chart captioned as a full month — the
// exact silent failure #77 exists to kill — while every other test stayed green.

const partialJune = (() => {
  const h = { ...fullJune }
  for (let d = 1; d <= 9; d++) delete h[`2026-06-0${d}`]
  return h
})()

test('gate: zero coverage refuses even WITH --allow-partial', () => {
  const v = heatmapGate({}, '2026-03', 31, JUL10, { allowPartial: true })
  assert.strictEqual(v.action, 'refuse')
  assert.strictEqual(v.reason, 'zero-coverage', 'the flag must not reclassify this as partial')
})

test('gate: a partial gap refuses WITHOUT the flag, renders WITH it', () => {
  assert.strictEqual(heatmapGate(partialJune, '2026-06', 30, JUL10, { allowPartial: false }).action, 'refuse')
  const allowed = heatmapGate(partialJune, '2026-06', 30, JUL10, { allowPartial: true })
  assert.strictEqual(allowed.action, 'render')
  assert.strictEqual(allowed.reason, 'partial', 'a rendered partial chart must still be labelled partial')
})

test('gate: full coverage renders with no flag and reports `complete`', () => {
  const v = heatmapGate(fullJune, '2026-06', 30, JUL10)
  assert.strictEqual(v.action, 'render')
  assert.strictEqual(v.reason, 'complete')
  assert.deepStrictEqual(v.missing, [])
})

test('gate: a month of {} entries is zero coverage, not full coverage', () => {
  const hollow = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [`2026-06-${String(i + 1).padStart(2, '0')}`, {}]),
  )
  assert.strictEqual(heatmapGate(hollow, '2026-06', 30, JUL10, { allowPartial: true }).reason, 'zero-coverage')
})

test('gate: a response carrying only adjacent-month days is zero coverage', () => {
  // The most operationally likely "API returned something, but nothing usable" case.
  const wrongMonth = { '2026-05-30': { claude: { ok: 288, total: 288 } }, '2026-07-01': { claude: { ok: 1, total: 1 } } }
  const v = heatmapGate(wrongMonth, '2026-06', 30, JUL10, { allowPartial: true })
  assert.strictEqual(v.reason, 'zero-coverage')
  assert.strictEqual(v.missing.length, 30)
})

test('describeMissing names one day without an ellipsis, many with a span', () => {
  assert.strictEqual(describeMissing(['2026-06-15'], '2026-06'), '1 day of 2026-06 absent from the API response (2026-06-15)')
  assert.match(describeMissing(['2026-06-01', '2026-06-02'], '2026-06'), /^2 days .*\(2026-06-01 … 2026-06-02\)/)
})

test('describeMissing is total — an empty list never prints "(undefined)"', () => {
  for (const empty of [[], null, undefined]) {
    const out = describeMissing(empty, '2026-06')
    assert.ok(!/undefined/.test(out), `describeMissing(${JSON.stringify(empty)}) leaked undefined: ${out}`)
  }
})

// ── calendar edges ───────────────────────────────────────────────────────────

test('daysInMonthOf handles leap February', () => {
  assert.strictEqual(daysInMonthOf('2024-02'), 29)
  assert.strictEqual(daysInMonthOf('2026-02'), 28)
})

test('uptimeLookbackSpan spans a leap February correctly', () => {
  assert.strictEqual(uptimeLookbackSpan('2024-02', new Date(Date.UTC(2024, 2, 1))), 30) // 29 + Mar 1
})

test('monthKey must be zero-padded — an unpadded key silently mismatches history', () => {
  // `2026-6` passes the 1..12 range check but builds `2026-6-01` keys that match nothing.
  // Documented, not supported: the CLI derives monthKey from a 2-digit directory name.
  const missing = missingMonthDays({ '2026-06-01': { claude: { ok: 1, total: 1 } } }, '2026-6', 30, JUL10)
  assert.strictEqual(missing[0], '2026-6-01', 'keys are built from the caller\'s monthKey verbatim')
})

test('elapsedMonthDays on the 1st of the month is 1', () => {
  assert.strictEqual(elapsedMonthDays('2026-07', 31, new Date(Date.UTC(2026, 6, 1))), 1)
})

// ── subtitle: the late-START half of the contract ────────────────────────────

test('heatmap subtitle states a LATE start span', () => {
  const svg = generateUptimeHeatmapSvg(['Claude'], fullJune, 30, '2026-06', 12, 30)
  assert.ok(svg.includes('June 12–30'), 'a --allow-partial chart must name its true start')
  assert.ok(!svg.includes('June 1–30'))
})

// ── CLI early-exit paths (spawn) ─────────────────────────────────────────────
// Everything below `require.main === module` is otherwise untested. These three exits happen
// BEFORE the network fetch, so they need no report file, no fixture, and no mock. The coverage
// gate itself is covered by heatmapGate's unit tests above — the CLI only prints its verdict.

const SCRIPT = path.join(__dirname, 'generate-charts.js')
const runCli = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', cwd: path.dirname(__dirname) })

test('CLI rejects an unknown flag with exit 1', () => {
  const r = runCli('--allow-parital', '2026-05/index.md')  // a plausible typo
  assert.strictEqual(r.status, 1)
  assert.match(r.stderr, /Unknown option\(s\): --allow-parital/)
})

test('CLI with no report path exits 1 and prints usage', () => {
  const r = runCli('--allow-partial')
  assert.strictEqual(r.status, 1)
  assert.match(r.stderr, /Usage: node scripts\/generate-charts\.js/)
  assert.match(r.stderr, /--allow-partial/, 'usage must document the flag')
})

test('CLI accepts the flag in either position', () => {
  // Both orderings must reach the same next failure (a missing report file), not an arg-parse error.
  for (const args of [['--allow-partial', 'nope-9999-99/index.md'], ['nope-9999-99/index.md', '--allow-partial']]) {
    const r = runCli(...args)
    assert.strictEqual(r.status, 1)
    assert.match(r.stderr, /Cannot read report file/, `argv order ${args.join(' ')} must parse`)
    assert.ok(!/Unknown option/.test(r.stderr))
  }
})

test('the gray legend names the color by what it means, not one of its causes', () => {
  const svg = generateUptimeHeatmapSvg(['Claude'], fullJune, 30, '2026-06', 1, 30)
  assert.ok(svg.includes('No data'), 'gray covers mid-month onboarding AND unmeasured days')
  assert.ok(!svg.includes('Added Later'), 'the old label named only the onboarding case')
})

test('explainWindow never claims more lost days than the month has', () => {
  // span - CAP counts days before the window opens; for a month that ended before the window even
  // begins it exceeds daysInMonth. "the first 42 days of 2026-03" is not a sentence about March.
  const march = explainWindow('2026-03', JUL10)
  assert.match(march, /all 31 days of 2026-03/)
  assert.ok(!/first 42/.test(march))
  assert.ok(!/first \d+ days? of 2026-03/.test(march), 'a wholly-unreachable month is not "the first N"')

  // A partially-reachable month still reports its leading gap. Pin the COUNT, not the adverb.
  assert.match(explainWindow('2026-04', JUL10), /the first 11 days of 2026-04 are/)
})

test('explainWindow uses a singular noun for a one-day gap', () => {
  // 2026-04 seen on 2026-06-30: span = 91, cap 90 → exactly one day lost.
  const oneDay = explainWindow('2026-04', new Date(Date.UTC(2026, 5, 30)))
  assert.match(oneDay, /the first day of 2026-04 is/)
  assert.ok(!/the first 1 day/.test(oneDay), '"the first 1 day" is stilted; the count is redundant at 1')
  assert.ok(!/day of 2026-04 are/.test(oneDay), 'noun agreed but the verb did not')
})

// ── dataSpan: the span rendered must equal the span that has data ────────────

test('dataSpan finds a late start and a full end', () => {
  const h = { ...fullJune }
  for (let d = 1; d <= 11; d++) delete h[`2026-06-${String(d).padStart(2, '0')}`]
  assert.deepStrictEqual(dataSpan(h, '2026-06', 30), { firstDataDay: 12, lastDataDay: 30 })
})

test('dataSpan stops at today for an in-progress month', () => {
  const h = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`2026-07-${String(i + 1).padStart(2, '0')}`, { claude: {} , x: {} }]))
  assert.deepStrictEqual(dataSpan(h, '2026-07', 31), { firstDataDay: 1, lastDataDay: 10 })
})

test('dataSpan treats a hollow leading day as absent, like the gate does', () => {
  // If this used a truthy check instead of hasDayData, firstDataDay would be 1 and the chart would
  // open with an all-gray column the gate had already declared missing.
  const h = { ...fullJune, '2026-06-01': {}, '2026-06-02': {} }
  assert.strictEqual(dataSpan(h, '2026-06', 30).firstDataDay, 3)
})

test('dataSpan returns null when nothing has data', () => {
  assert.strictEqual(dataSpan({}, '2026-06', 30), null)
})

test('dataSpan handles a single day of data', () => {
  assert.deepStrictEqual(dataSpan({ '2026-06-17': { claude: {} } }, '2026-06', 30), { firstDataDay: 17, lastDataDay: 17 })
})

// ── explainWindow arithmetic boundaries ─────────────────────────────────────

test('explainWindow: lost === daysInMonth - 1 still says "the first N", not "all"', () => {
  // 2026-05 seen on 2026-08-28: span 120, lost = min(30, 31) = 30 — one day short of the whole month.
  const almost = explainWindow('2026-05', new Date(Date.UTC(2026, 7, 28)))
  assert.match(almost, /the first 30 days of 2026-05/)
  assert.ok(!/all 31 days/.test(almost), 'the last day is still reachable')
  // One day later it flips.
  assert.match(explainWindow('2026-05', new Date(Date.UTC(2026, 7, 29))), /all 31 days of 2026-05/)
})

test('explainWindow: a leap February past the window reports 29 days', () => {
  assert.match(explainWindow('2024-02', new Date(Date.UTC(2024, 6, 1))), /all 29 days of 2024-02/)
})

test('explainWindow: span exactly at the cap is inside the window, span+1 is not', () => {
  // 2026-04's first day is exactly 90 days before 2026-06-29 → span 90 → within.
  assert.strictEqual(uptimeLookbackSpan('2026-04', new Date(Date.UTC(2026, 5, 29))), 90)
  assert.ok(!/unreachable/.test(explainWindow('2026-04', new Date(Date.UTC(2026, 5, 29)))))
  assert.match(explainWindow('2026-04', new Date(Date.UTC(2026, 5, 30))), /unreachable/)
})

// ── Summary ──────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
