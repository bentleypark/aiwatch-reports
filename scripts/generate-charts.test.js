const {
  generateScoreBarSvg, generateUptimeHeatmapSvg, scoreColorByGrade,
  monthsBefore, buildTrendSeries, computeScoreMovers, computeNotableMovers, formatTrendArrow, fmtScoreDelta,
  generateTrendSvg, toMonthEntry, monthEntryFromScoreRows, rosterForMonth, spreadLabelYs,
  buildMoverExclude, notableMoversForChart,
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

test('excludes NO_INCIDENT_FEED / stale / recently-added, keeps established; null → empty', () => {
  const services = {
    bedrock: { score: 90 },                             // NO_INCIDENT_FEED
    deepseek: { score: 88, incidentSourceStale: true }, // stale (archive flag)
    fal: { score: 77, addedAt: '2026-06-24' },          // added IN the report month
    claude: { score: 71 },                              // established → kept
  }
  const ex = buildMoverExclude(services, '2026-06')
  assert.ok(ex.has('bedrock'), 'bedrock (NO_INCIDENT_FEED) excluded')
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

// ── Summary ──────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
