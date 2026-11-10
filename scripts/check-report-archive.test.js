// Tests for check-report-archive.js (aiwatch-reports#167). Pure Node + assert, no deps —
// run: node scripts/check-report-archive.test.js
const assert = require('assert')
const { execFile } = require('child_process')
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { KNOWN_ARCHIVE_DRIFT, diffFields, fetchLive, applyKnown, checkRepo } = require('./check-report-archive')
const { checkedMonths } = require('./check-report-drift')

let passed = 0
let failed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (err) { failed++; console.log(`  ✗ ${name}`); console.log(`    ${err.message}`) }
}

const ROOT = path.join(__dirname, '..')
const archive = (score = 82) => ({ generatedAt: 'x', services: { kimi: { score, incidentList: [{ id: 'a' }] }, claude: { score: 70 } } })

function repoWith(months) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'report-archive-'))
  fs.mkdirSync(path.join(root, '_data'))
  for (const [month, data] of Object.entries(months)) {
    fs.mkdirSync(path.join(root, month))
    fs.writeFileSync(path.join(root, month, 'index.md'), '# report\n')
    fs.writeFileSync(path.join(root, '_data', `${month}.json`), JSON.stringify(data))
  }
  return root
}
const liveFrom = byMonth => async month => {
  if (byMonth[month] instanceof Error) throw byMonth[month]
  return typeof byMonth[month] === 'string' ? byMonth[month] : JSON.stringify(byMonth[month])
}

// Runs the real script from a copy of scripts/ against a local stand-in for the Worker.
async function runScript(data, live) {
  const root = repoWith({ '2026-09': data })
  fs.cpSync(__dirname, path.join(root, 'scripts'), { recursive: true })
  fs.writeFileSync(path.join(root, 'scripts', 'known-archive-drift.json'), '{}')
  const server = http.createServer((req, res) => {
    res.statusCode = req.url === '/api/report?month=2026-09' ? 200 : 404
    res.end(JSON.stringify(live))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const env = { ...process.env, AIWATCH_API_BASE: `http://127.0.0.1:${server.address().port}` }
  try {
    return await new Promise(resolve => execFile(process.execPath, ['scripts/check-report-archive.js'], { cwd: root, env }, (err, stdout) => resolve({ code: err ? err.code : 0, stdout })))
  } finally {
    server.close()
  }
}

async function main() {
  console.log('diffFields')
  await test('identical archives have no difference', () => {
    assert.deepStrictEqual(diffFields(archive(), archive()), [])
  })
  await test('key order is not a difference', () => {
    assert.deepStrictEqual(diffFields({ a: 1, b: 2 }, { b: 2, a: 1 }), [])
  })
  await test('names the service and the field, and leaves the equal service out', () => {
    assert.deepStrictEqual(diffFields(archive(72), archive(82)), [{ field: 'services.kimi.score', data: 72, live: 82 }])
  })
  await test('a field missing on one side differs from null', () => {
    assert.deepStrictEqual(diffFields({ s: {} }, { s: { p95: null } }), [{ field: 's.p95', data: undefined, live: null }])
  })
  await test('a changed array element is named by index', () => {
    assert.deepStrictEqual(diffFields({ l: [{ id: 'a' }, { id: 'b' }] }, { l: [{ id: 'a' }, { id: 'c' }] }), [{ field: 'l.1.id', data: 'b', live: 'c' }])
  })
  await test('an object replaced by a scalar is a single difference', () => {
    assert.deepStrictEqual(diffFields({ a: { b: 1 } }, { a: null }), [{ field: 'a', data: { b: 1 }, live: null }])
  })

  console.log('fetchLive')
  await test('retries once after a failure and returns the second answer', async () => {
    let calls = 0
    const body = await fetchLive('2026-09', async () => (++calls === 1 ? { ok: false, status: 502 } : { ok: true, text: async () => 'ok' }), 'http://x')
    assert.strictEqual(body, 'ok')
    assert.strictEqual(calls, 2)
  })
  await test('retries once after a thrown error', async () => {
    let calls = 0
    const body = await fetchLive('2026-09', async () => { if (++calls === 1) throw new Error('timeout'); return { ok: true, text: async () => 'ok' } }, 'http://x')
    assert.strictEqual(body, 'ok')
  })
  await test('throws the last error when both attempts fail', async () => {
    await assert.rejects(fetchLive('2026-09', async () => ({ ok: false, status: 404 }), 'http://x'), /HTTP 404/)
  })

  console.log('checkRepo')
  await test('a month matching the live archive is compared and clean', async () => {
    const r = await checkRepo(repoWith({ '2026-09': archive() }), liveFrom({ '2026-09': archive() }), {})
    assert.deepStrictEqual(r, { compared: ['2026-09'], accepted: {}, problems: [] })
  })
  await test('a stale _data row fails, naming month, service, field and both values', async () => {
    const r = await checkRepo(repoWith({ '2026-09': archive(72) }), liveFrom({ '2026-09': archive(82) }), {})
    assert.strictEqual(r.problems.length, 1)
    assert.deepStrictEqual(r.problems[0].lines, ['2026-09 services.kimi.score: _data 72, live 82'])
  })
  await test('a field on only one side is named, with the missing side marked', async () => {
    const live = archive()
    live.services.kimi.p95 = 5
    const r = await checkRepo(repoWith({ '2026-09': archive() }), liveFrom({ '2026-09': live }), {})
    assert.deepStrictEqual(r.problems[0].lines, ['2026-09 services.kimi.p95: _data (absent), live 5'])
  })
  await test('only the differing month is reported', async () => {
    const r = await checkRepo(repoWith({ '2026-08': archive(), '2026-09': archive(72) }), liveFrom({ '2026-08': archive(), '2026-09': archive() }), {})
    assert.deepStrictEqual(r.compared, ['2026-08', '2026-09'])
    assert.deepStrictEqual(r.problems.map(p => p.month), ['2026-09'])
  })
  await test('an excluded body month is still compared', async () => {
    const r = await checkRepo(repoWith({ '2026-03': archive(72) }), liveFrom({ '2026-03': archive() }), {})
    assert.deepStrictEqual(r.problems.map(p => p.month), ['2026-03'])
  })
  await test('a known difference is accepted and counted', async () => {
    const known = { '2026-05': { 'services.kimi.score': { data: 72, live: 82 } } }
    const r = await checkRepo(repoWith({ '2026-05': archive(72) }), liveFrom({ '2026-05': archive(82) }), known)
    assert.deepStrictEqual(r, { compared: ['2026-05'], accepted: { '2026-05': 1 }, problems: [] })
  })
  await test('one new difference is reported alone beside a known one', async () => {
    const known = { '2026-05': { 'services.kimi.score': { data: 72, live: 82 } } }
    const live = archive(82)
    live.services.claude.score = 61
    const r = await checkRepo(repoWith({ '2026-05': archive(72) }), liveFrom({ '2026-05': live }), known)
    assert.deepStrictEqual(r.problems[0].lines, ['2026-05 services.claude.score: _data 70, live 61'])
    assert.strictEqual(r.accepted['2026-05'], 1)
  })
  await test('a known field whose live value changed again is reported', async () => {
    const known = { '2026-05': { 'services.kimi.score': { data: 72, live: 82 } } }
    const r = await checkRepo(repoWith({ '2026-05': archive(72) }), liveFrom({ '2026-05': archive(90) }), known)
    assert.deepStrictEqual(r.problems[0].lines, ['2026-05 services.kimi.score: _data 72, live 90'])
  })
  await test('a changed _data value on a known field is reported', async () => {
    const known = { '2026-05': { 'services.kimi.score': { data: 72, live: 82 } } }
    const r = await checkRepo(repoWith({ '2026-05': archive(1) }), liveFrom({ '2026-05': archive(82) }), known)
    assert.deepStrictEqual(r.problems[0].lines, ['2026-05 services.kimi.score: _data 1, live 82'])
  })
  await test('an entry that no longer describes a difference fails until removed', async () => {
    const known = { '2026-05': { 'services.kimi.score': { data: 72, live: 82 } } }
    const r = await checkRepo(repoWith({ '2026-05': archive(82) }), liveFrom({ '2026-05': archive(82) }), known)
    assert.deepStrictEqual(r.problems[0].lines, ['2026-05 services.kimi.score: in known-archive-drift.json but no longer differs — remove it'])
  })
  await test('an entry for another month does not apply', async () => {
    const known = { '2026-05': { 'services.kimi.score': { data: 72, live: 82 } } }
    const r = await checkRepo(repoWith({ '2026-06': archive(72) }), liveFrom({ '2026-06': archive(82) }), known)
    assert.deepStrictEqual(r.problems.map(p => p.month), ['2026-06'])
  })
  await test('an accepted absent value is not the same as null', () => {
    const r = applyKnown([{ field: 'a', data: undefined, live: null }], { a: { data: null, live: null } })
    assert.deepStrictEqual(r.unexpected.map(f => f.field), ['a'])
  })

  await test('an unreadable month is a problem and the next month is still compared', async () => {
    const r = await checkRepo(repoWith({ '2026-08': archive(), '2026-09': archive(72) }), liveFrom({ '2026-08': new Error('HTTP 502'), '2026-09': archive() }), {})
    assert.deepStrictEqual(r.compared, ['2026-09'])
    assert.deepStrictEqual(r.problems.map(p => p.month), ['2026-08', '2026-09'])
    assert.match(r.problems[0].summary, /could not read the live archive \(HTTP 502\)/)
  })
  await test('a live answer that is not JSON is a problem, not a pass', async () => {
    const r = await checkRepo(repoWith({ '2026-09': archive() }), liveFrom({ '2026-09': '<html>' }), {})
    assert.deepStrictEqual(r.compared, [])
    assert.match(r.problems[0].summary, /could not read the live archive/)
  })

  console.log('this repo')
  await test('every month is compared, including one the body check excludes', () => {
    const months = checkedMonths(ROOT, [])
    assert.ok(months.includes('2026-03'))
    assert.ok(months.includes('2026-09'))
    assert.ok(!checkedMonths(ROOT).includes('2026-03'))
  })
  await test('every known-drift month has a _data file', () => {
    for (const month of Object.keys(KNOWN_ARCHIVE_DRIFT)) assert.ok(fs.existsSync(path.join(ROOT, '_data', `${month}.json`)), month)
  })

  console.log('run as a script')
  await test('exit 0 and the month listed when _data matches', async () => {
    const r = await runScript(archive(82), archive(82))
    assert.strictEqual(r.code, 0, r.stdout)
    assert.match(r.stdout, /compared: 2026-09;/)
  })
  await test('exit 1 and the service and field printed on a difference', async () => {
    const r = await runScript(archive(72), archive(82))
    assert.strictEqual(r.code, 1, r.stdout)
    assert.match(r.stdout, /2026-09 services\.kimi\.score: _data 72, live 82/)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

main()
