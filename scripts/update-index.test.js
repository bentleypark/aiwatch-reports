// update-index.test.js — Plain Node + assert, mirrors generate-report.test.js style.

const {
  parseMonth,
  lastDayOfMonth,
  buildPeriodSuffix,
  buildEntry,
  upsertIndexEntry,
} = require('./update-index')
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

console.log('parseMonth')
test('accepts valid YYYY-MM', () => {
  const result = parseMonth('2026-04')
  assert.strictEqual(result.year, 2026)
  assert.strictEqual(result.month, 4)
  assert.strictEqual(result.period, '2026-04')
})

test('rejects malformed month strings', () => {
  for (const bad of ['', undefined, '2026', '2026-4', '2026-13', '2026-00', '26-04', '2026-04-01']) {
    assert.throws(() => parseMonth(bad), /Invalid month/)
  }
})

console.log('\nlastDayOfMonth')
test('returns 30 for April 2026', () => {
  assert.strictEqual(lastDayOfMonth(2026, 4), 30)
})

test('returns 31 for January / March / December', () => {
  assert.strictEqual(lastDayOfMonth(2026, 1), 31)
  assert.strictEqual(lastDayOfMonth(2026, 3), 31)
  assert.strictEqual(lastDayOfMonth(2026, 12), 31)
})

test('returns 28 for February in non-leap years', () => {
  assert.strictEqual(lastDayOfMonth(2026, 2), 28)
  assert.strictEqual(lastDayOfMonth(2027, 2), 28)
})

test('returns 29 for February in leap years', () => {
  assert.strictEqual(lastDayOfMonth(2024, 2), 29)
  assert.strictEqual(lastDayOfMonth(2028, 2), 29)
})

console.log('\nbuildPeriodSuffix')
test('full-month windows render the whole range', () => {
  // 30-day April → "Apr 1–30"
  assert.strictEqual(
    buildPeriodSuffix(2026, 4, 30),
    '30-day monitoring period (Apr 1–30)',
  )
  // 31-day January → "Jan 1–31"
  assert.strictEqual(
    buildPeriodSuffix(2026, 1, 31),
    '31-day monitoring period (Jan 1–31)',
  )
})

test('partial windows align to the end of the month (matches 2026-03 hand-authored entry)', () => {
  // 12-day window in 31-day March → "Mar 20–31" (lastDay 31 - 12 + 1 = 20)
  assert.strictEqual(
    buildPeriodSuffix(2026, 3, 12),
    '12-day monitoring period (Mar 20–31)',
  )
})

test('clamps start day to 1 if window exceeds month length', () => {
  // 35-day window in 30-day April — abnormal but defensive: clamp at Apr 1 rather
  // than emit "Apr -4–30" or similar nonsense.
  assert.strictEqual(
    buildPeriodSuffix(2026, 4, 35),
    '35-day monitoring period (Apr 1–30)',
  )
})

test('renders single-day partial as a degenerate range', () => {
  // 1-day window at end of February 2026 → "Feb 28–28"
  assert.strictEqual(
    buildPeriodSuffix(2026, 2, 1),
    '1-day monitoring period (Feb 28–28)',
  )
})

console.log('\nbuildEntry')
test('renders the full markdown bullet for April 2026', () => {
  const entry = buildEntry({
    period: '2026-04', year: 2026, month: 4,
    services: 31, daysCollected: 30,
  })
  assert.strictEqual(
    entry,
    '- [**April 2026**](2026-04/) — 31 services, 30-day monitoring period (Apr 1–30)',
  )
})

test('matches the 2026-03 hand-authored entry exactly (regression baseline)', () => {
  // The hand-authored line in main was:
  // - [**March 2026**](2026-03/) — 27 services, 12-day monitoring period (Mar 20–31)
  const entry = buildEntry({
    period: '2026-03', year: 2026, month: 3,
    services: 27, daysCollected: 12,
  })
  assert.strictEqual(
    entry,
    '- [**March 2026**](2026-03/) — 27 services, 12-day monitoring period (Mar 20–31)',
  )
})

console.log('\nupsertIndexEntry')

function makeBody({ entries = [] } = {}) {
  return [
    '---',
    'layout: home',
    'title: AIWatch Monthly Reports',
    '---',
    '',
    'Some intro paragraph.',
    '',
    '## Reports',
    '',
    ...entries,
    '',
  ].join('\n')
}

test('inserts new entry at top of empty Reports list', () => {
  const body = makeBody({ entries: [] })
  const out = upsertIndexEntry(
    body,
    '2026-04',
    '- [**April 2026**](2026-04/) — 31 services, 30-day monitoring period (Apr 1–30)',
  )
  assert.match(out, /## Reports\n\n- \[\*\*April 2026\*\*\]\(2026-04\/\) — 31 services/)
})

test('inserts new entry at top, above existing entries (newest-first)', () => {
  const body = makeBody({
    entries: ['- [**March 2026**](2026-03/) — 27 services, 12-day monitoring period (Mar 20–31)'],
  })
  const out = upsertIndexEntry(
    body,
    '2026-04',
    '- [**April 2026**](2026-04/) — 31 services, 30-day monitoring period (Apr 1–30)',
  )
  const reportsBlock = out.split('## Reports')[1]
  // April line precedes March line
  const aprilIdx = reportsBlock.indexOf('April 2026')
  const marchIdx = reportsBlock.indexOf('March 2026')
  assert.ok(aprilIdx !== -1 && aprilIdx < marchIdx, 'April entry should appear before March')
})

test('replaces existing entry for same month rather than duplicating (idempotent re-run)', () => {
  const oldEntry = '- [**April 2026**](2026-04/) — 30 services, 30-day monitoring period (Apr 1–30)'
  const newEntry = '- [**April 2026**](2026-04/) — 31 services, 30-day monitoring period (Apr 1–30)'
  const body = makeBody({ entries: [oldEntry] })
  const out = upsertIndexEntry(body, '2026-04', newEntry)
  // Exactly one April entry, with the new service count
  const matches = out.match(/April 2026/g) || []
  assert.strictEqual(matches.length, 1, 'should not duplicate')
  assert.ok(out.includes('31 services'), 'new content present')
  assert.ok(!out.includes('30 services'), 'old content gone')
})

test('only matches by period URL — does not edit prose mentioning the month name', () => {
  // A paragraph mentioning "April 2026" outside the Reports list must not be touched.
  const body = [
    '---',
    'title: index',
    '---',
    '',
    'Welcome — see the April 2026 report below for highlights.',
    '',
    '## Reports',
    '',
    '- [**March 2026**](2026-03/) — 27 services, 12-day monitoring period (Mar 20–31)',
    '',
  ].join('\n')
  const newEntry = '- [**April 2026**](2026-04/) — 31 services, 30-day monitoring period (Apr 1–30)'
  const out = upsertIndexEntry(body, '2026-04', newEntry)
  assert.ok(out.includes('Welcome — see the April 2026 report below'), 'prose preserved verbatim')
  // Reports list got the new entry
  assert.ok(out.includes('](2026-04/)'), 'new entry inserted')
})

test('no-op when entry exists with identical content', () => {
  const entry = '- [**April 2026**](2026-04/) — 31 services, 30-day monitoring period (Apr 1–30)'
  const body = makeBody({ entries: [entry] })
  const out = upsertIndexEntry(body, '2026-04', entry)
  assert.strictEqual(out, body, 'unchanged body')
})

test('throws when "## Reports" heading is missing', () => {
  const body = '# Some other doc\n\nNo reports section.\n'
  assert.throws(
    () => upsertIndexEntry(body, '2026-04', '- entry'),
    /missing "## Reports" heading/,
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
