const { generateScoreBarSvg, generateUptimeHeatmapSvg, scoreColorByGrade } = require('./generate-charts')
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

// ── Summary ──────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
