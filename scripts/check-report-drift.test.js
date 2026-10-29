// Tests for check-report-drift.js (aiwatch-reports#167). Pure Node + assert, no deps —
// run: node scripts/check-report-drift.test.js
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  EXCLUDED_MONTHS,
  RANK_UNCHECKED_MONTHS,
  KNOWN_DRIFT,
  incidentCountOf,
  scoreRows,
  incidentRows,
  monthRows,
  findDrift,
  staleKnownDrift,
  checkedMonths,
  checkRepo,
} = require('./check-report-drift')

let passed = 0
let failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (err) { failed++; console.log(`  ✗ ${name}`); console.log(`    ${err.message}`) }
}
function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

const ROOT = path.join(__dirname, '..')
const read = month => fs.readFileSync(path.join(ROOT, month, 'index.md'), 'utf8')
const data = month => JSON.parse(fs.readFileSync(path.join(ROOT, '_data', `${month}.json`), 'utf8'))
function replaceOnce(text, from, to) {
  assert.strictEqual(text.split(from).length, 2, `fixture edit must match exactly once: ${from}`)
  return text.replace(from, to)
}

console.log('\ncheck-report-drift (aiwatch-reports#167)')

test('every checked published month matches its _data', () => {
  assert.deepStrictEqual(checkRepo(ROOT), [])
})

test('the pre-fix 2026-09 Kimi rows are drift', () => {
  let md = read('2026-09')
  md = replaceOnce(md, '| 7= | Kimi (Moonshot AI) | 82 | Good | Official | 1 incident, 23m |', '| 27= | Kimi (Moonshot AI) | 72 | Fair | Official | 13 incidents, fast recovery (avg 7m) |')
  md = replaceOnce(md, '<tr><td>Kimi (Moonshot AI)</td><td>1</td><td>23m (23m)</td><td class="hide-mobile">23m</td><td class="hide-mobile">23m</td></tr>',
    '<tr><td>Kimi (Moonshot AI)</td><td>13</td><td>1h 30m (27m)</td><td class="hide-mobile">27m</td><td class="hide-mobile">7m</td></tr>')
  const drift = findDrift(md, data('2026-09'), '2026-09')
  assert.deepStrictEqual(drift.filter(d => d.published).map(d => `${d.table} ${d.published.name}`).sort(),
    ['incidents Kimi (Moonshot AI)', 'scores Kimi (Moonshot AI)'])
  assert.deepStrictEqual(drift.filter(d => d.expected).map(d => `${d.table} ${d.expected.name}`).sort(), ['incidents kimi', 'scores kimi'])
})

test('a stale rank alone is drift', () => {
  const md = replaceOnce(read('2026-09'), '| 10= | Cohere API | 81 |', '| 11 | Cohere API | 81 |')
  assert.deepStrictEqual(findDrift(md, data('2026-09'), '2026-09').map(d => d.published?.name ?? d.expected.name), ['Cohere API', 'cohere'])
})

test('a stale incident count in the Why cell is drift', () => {
  const md = replaceOnce(read('2026-07'), '| Windsurf | 100 | Excellent | Official | Zero incidents', '| Windsurf | 100 | Excellent | Official | 2 incidents')
  eq(findDrift(md, data('2026-07'), '2026-07').length, 2)
})

test('a renamed service and reordered rows are not drift', () => {
  let md = replaceOnce(read('2026-09'), '| 4 | Groq Cloud |', '| 4 | GroqCloud |')
  md = replaceOnce(md, '<tr><td>Junie</td><td>1</td>', '<tr><td>Junie <em>(renamed)</em></td><td>1</td>')
  const rows = md.split('\n')
  const a = rows.findIndex(l => l.startsWith('<tr><td>Junie'))
  ;[rows[a], rows[a + 1]] = [rows[a + 1], rows[a]]
  assert.deepStrictEqual(findDrift(rows.join('\n'), data('2026-09'), '2026-09'), [])
})

test('a known archive-side drift is skipped, and only that row', () => {
  const md = replaceOnce(read('2026-07'), '| Windsurf | 100 | Excellent | Official | Zero incidents', '| Windsurf | 100 | Excellent | Official | 2 incidents')
  const [p] = findDrift(md, data('2026-07'), '2026-07').filter(d => d.published)
  const [e] = findDrift(md, data('2026-07'), '2026-07').filter(d => d.expected)
  const known = [{ month: '2026-07', table: 'scores', published: p.published.key, expected: e.expected.key, issue: 'x' }]
  assert.deepStrictEqual(findDrift(md, data('2026-07'), '2026-07', known), [])
  eq(findDrift(md, data('2026-07'), '2026-07', [{ ...known[0], month: '2026-08' }]).length, 2, 'an entry for another month')
  eq(findDrift(md, data('2026-07'), '2026-07', [{ ...known[0], expected: 'x' }]).length, 2, 'an entry whose expected row differs')
})

test('a known drift that no longer matches is reported for removal', () => {
  const live = { month: '2026-09', table: 'incidents', published: incidentRows(read('2026-09'))[0].key, expected: incidentRows(read('2026-09'))[0].key, issue: 'x' }
  const gone = { ...live, published: '1 | 1m (1m) | 1m | 9h' }
  const fixed = { ...live, expected: '1 | 1m (1m) | 1m | 9h' }
  assert.deepStrictEqual(staleKnownDrift(ROOT, [live, gone, fixed]), [gone, fixed])
})

test('a known drift in a rank-unchecked month is matched rank-less', () => {
  const m = RANK_UNCHECKED_MONTHS[0]
  const md = replaceOnce(read(m), '| Together AI | 72 | Fair | Official | 85 incidents', '| Together AI | 72 | Fair | Official | 84 incidents')
  const drift = findDrift(md, data(m), m)
  const known = [{ month: m, table: 'scores', published: drift.find(d => d.published).published.key, expected: drift.find(d => d.expected).expected.key, issue: 'x' }]
  assert.deepStrictEqual(findDrift(md, data(m), m, known), [])
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'))
  fs.mkdirSync(path.join(root, m))
  fs.mkdirSync(path.join(root, '_data'))
  fs.writeFileSync(path.join(root, m, 'index.md'), md)
  fs.copyFileSync(path.join(ROOT, '_data', `${m}.json`), path.join(root, '_data', `${m}.json`))
  try { assert.deepStrictEqual(staleKnownDrift(root, known), []) }
  finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('checkRepo fails on a known drift that no longer matches', () => {
  const gone = { month: '2026-09', table: 'incidents', published: '1 | 1m (1m) | 1m | 9h', expected: '1 | 1m (1m) | 1m | 1m', issue: 'x' }
  const problems = checkRepo(ROOT, [...KNOWN_DRIFT, gone])
  eq(problems.length, 1)
  assert.match(problems[0], /KNOWN_DRIFT 2026-09 incidents \(x\) no longer matches/)
})

test('every published month is checked except the excluded ones', () => {
  const months = fs.readdirSync(ROOT).filter(d => /^\d{4}-\d{2}$/.test(d) && fs.existsSync(path.join(ROOT, d, 'index.md'))).sort()
  assert.deepStrictEqual(checkedMonths(ROOT), months.filter(m => !EXCLUDED_MONTHS.includes(m)))
  assert.ok(checkedMonths(ROOT).includes('2026-04'))
  assert.ok(checkedMonths(ROOT).includes('2026-06'))
})

test('an excluded month really differs from the builder beyond its ranks', () => {
  for (const m of EXCLUDED_MONTHS) {
    const { published, expected } = monthRows(read(m), data(m), m, false)
    assert.notDeepStrictEqual(published.scores.map(r => r.key).sort(), expected.scores.map(r => r.key).sort(), m)
  }
})

test('a rank-unchecked month differs only in its ranks, and its other columns are still checked', () => {
  for (const m of RANK_UNCHECKED_MONTHS) {
    const { published, expected } = monthRows(read(m), data(m), m, true)
    assert.notDeepStrictEqual(published.scores.map(r => r.key).sort(), expected.scores.map(r => r.key).sort(), `${m} ranks differ`)
    assert.deepStrictEqual(findDrift(read(m), data(m), m), [])
  }
  const md = replaceOnce(read('2026-06'), '<tr><td>Together AI</td><td>85</td>', '<tr><td>Together AI</td><td>12</td>')
  eq(findDrift(md, data('2026-06'), '2026-06').length, 2)
})

test('incidentCountOf reads the count a Why cell opens with', () => {
  eq(incidentCountOf('Zero incidents, 100.00% uptime — lost 11 pts on Responsiveness (latency)'), '0')
  eq(incidentCountOf('Zero incidents (no published uptime)'), '0')
  eq(incidentCountOf('1 incident, 23m'), '1')
  eq(incidentCountOf('49 incidents'), '49')
  eq(incidentCountOf(''), '?')
})

test('scoreRows reads both ranking tables and incidentRows a name with markup', () => {
  const md = read('2026-09')
  eq(scoreRows(md).length, 41)
  assert.ok(incidentRows(read('2026-04')).some(r => r.name === 'Codex <em>(9-day window)</em>'))
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
