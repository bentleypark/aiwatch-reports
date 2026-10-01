// Tests for lint-narrative-repeats.js (aiwatch-reports#122). Pure Node + assert, no deps —
// run: node scripts/lint-narrative-repeats.test.js
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { splitSections, narrativeText, figures, findRepeats } = require('./lint-narrative-repeats')

let passed = 0
let failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`) }
}

const report = (sections) => Object.entries(sections).map(([h, body]) => `## ${h}\n\n${body}\n`).join('\n')

// ── tokens ───────────────────────────────────────────────────────────────────
test('a duration is one token, not its hour and minute parts', () => {
  assert.deepEqual(figures('downtime 138h 3m, longest 13h, avg 40m'), ['138h 3m', '13h', '40m'])
})

test('percentages, score moves and "N of M" are tokens', () => {
  assert.deepEqual(figures('99.97% uptime, 88 → 56, 24 of 64, 48%'), ['99.97%', '88 → 56', '24 of 64', '48%'])
})

test('prose that merely contains digits is not a token', () => {
  assert.deepEqual(figures('a 24-hour window on Ray2 and Qwen3.8-2.4T'), [])
})

test('a latency or a spelled-out unit is not read as a duration', () => {
  assert.deepEqual(figures('p50 174ms, p75 210ms, 48hrs, 2h'), ['2h'])
})

test('a decimal or grouped number is not cut into a fragment the text does not contain, on either side', () => {
  assert.deepEqual(figures('took 1.5h; p75 1.5 → 2.25; 1,200 → 900; 2,024 of 3,100'), [])
  assert.deepEqual(figures('1 → 2.5; 88 → 56.5; 24 of 64.5; 3 of 1,200; 10 → 1,200'), [])
  assert.deepEqual(figures('5h 30min'), ['5h'])
})

test('a token repeated inside one section counts once for that section', () => {
  assert.deepEqual(figures('71h 54m … again 71h 54m'), ['71h 54m'])
})

// ── sections ─────────────────────────────────────────────────────────────────
test('KO <details> mirrors and HTML comments are excluded', () => {
  const body = 'EN 45h 11m\n<details><summary>KO</summary>45시간 11분 99.99%</details>\n<!-- 13h draft -->\n<details markdown="1">KO 7h</details>'
  assert.deepEqual(figures(narrativeText(body)), ['45h 11m'])
})

test('a level-3 heading stays inside its level-2 section', () => {
  const s = splitSections('## Notable Incidents\n\n### 1. Outage\n**Duration**: 20h 15m\n\n## Observations\n- x')
  assert.ok(s['Notable Incidents'].includes('20h 15m'))
  assert.equal(Object.keys(s).length, 2)
})

// ── threshold ────────────────────────────────────────────────────────────────
test('a figure in 3 narrative sections is reported; one in 2 is not', () => {
  const { repeats } = findRepeats(report({
    Summary: 'Mistral 122h 14m, Score 81 → 42',
    'Key Insight': 'Mistral 122h 14m and 81 → 42',
    'Notable Incidents': 'Embeddings 122h 14m',
    Observations: 'nothing numeric',
  }))
  assert.deepEqual(repeats, [{ figure: '122h 14m', sections: ['Summary', 'Key Insight', 'Notable Incidents'] }])
})

test('a figure that only also appears in a non-narrative section is not counted there', () => {
  const { repeats } = findRepeats(report({
    Summary: '20h 15m', Recommendations: '20h 15m', 'Incident Summary': '20h 15m', 'Notable Incidents': '20h 15m',
  }))
  assert.deepEqual(repeats, [])
})

test('most-repeated figures come first', () => {
  const { repeats } = findRepeats(report({
    Summary: '13h, 1m, 2m', 'Key Insight': '13h, 1m, 2m', 'Notable Incidents': '13h, 2m', Observations: '2m',
  }))
  assert.deepEqual(repeats.map((r) => r.figure), ['2m', '13h'])
})

test('a missing narrative section is listed rather than thrown on', () => {
  const { repeats, missing } = findRepeats(report({ Summary: '5h', 'Key Insight': '5h' }))
  assert.deepEqual(repeats, [])
  assert.deepEqual(missing, ['Notable Incidents', 'Observations'])
})

// ── real report ──────────────────────────────────────────────────────────────
test('the published 2026-07 report: all four sections found, and its Mistral 129h 28m retelling is reported', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '2026-07', 'index.md'), 'utf8')
  const { repeats, missing } = findRepeats(src)
  assert.deepEqual(missing, [])
  assert.deepEqual(repeats.find((r) => r.figure === '129h 28m').sections, ['Key Insight', 'Notable Incidents', 'Observations'])
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
