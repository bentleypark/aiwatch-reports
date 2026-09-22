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

test('an over-long count is still whole-month coverage', () => {
  // 35-day window in 30-day April — abnormal, and it takes the full-month branch: the span is the
  // whole month, and the count is printed as the archive gave it rather than being corrected here.
  assert.strictEqual(
    buildPeriodSuffix(2026, 4, 35),
    '35-day monitoring period (Apr 1–30)',
  )
})

test('renders single-day partial as a degenerate range', () => {
  // 1-day window in the onboarding month → "Mar 31–31". (Re-pointed from a synthetic Feb 2026 in
  // #113: end-alignment is now claimed for the start month only, and February 2026 precedes
  // monitoring entirely — there is no window there to align.)
  assert.strictEqual(
    buildPeriodSuffix(2026, 3, 1),
    '1-day monitoring period (Mar 31–31)',
  )
})

// #113 — a short month after onboarding is a LOST day, not a late start. `daysCollected` is a
// bare count, so no start day is knowable; inferring one published "Aug 2–31", where `Aug 2` was
// `31 - 30 + 1` and not an observation. Both directions are asserted: the onboarding span must
// survive (a fix that flattened every month into a count would lose real information).
test('a post-onboarding short month states no span it cannot know (#113)', () => {
  assert.strictEqual(
    buildPeriodSuffix(2026, 8, 30),
    '30 of 31 days with uptime data',
  )
})

test('the onboarding month keeps its end-aligned span (#113 control)', () => {
  // The direction that must NOT change: 2026-03 is genuinely end-aligned — monitoring began
  // mid-month, so those 12 days really are Mar 20–31.
  assert.strictEqual(
    buildPeriodSuffix(2026, 3, 12),
    '12-day monitoring period (Mar 20–31)',
  )
})

test('a full month still renders its span (#113 control)', () => {
  // August once its archive was rebuilt to 31 days — the span IS known here.
  assert.strictEqual(
    buildPeriodSuffix(2026, 8, 31),
    '31-day monitoring period (Aug 1–31)',
  )
})

test('2026-04 is the first month excluded from end-alignment (#113 boundary)', () => {
  // Pins the far side of MONITORING_START. Without this, moving the constant forward one month
  // reintroduces the defect on a real published month while the whole suite stays green.
  assert.strictEqual(
    buildPeriodSuffix(2026, 4, 25),
    '25 of 30 days with uptime data',
  )
})

test('a month before monitoring began is not end-aligned either (#113 boundary)', () => {
  // The predicate names the start month exactly; it does not extend backwards, where alignment
  // would be an even weaker inference than the one this issue removed.
  assert.strictEqual(
    buildPeriodSuffix(2026, 2, 1),
    '1 of 28 days with uptime data',
  )
})

test('a zero count never renders a day past the end of the month (#113)', () => {
  // `readArchiveSnapshot` defaults a missing `daysCollected` to 0 and main() rejects it only when
  // `services` is 0 too, so a 2026-03 regeneration from a partial snapshot reaches here.
  const out = buildPeriodSuffix(2026, 3, 0)
  assert.ok(!out.includes('32'), `must not emit a 32nd of March: ${out}`)
  assert.strictEqual(out, '0 of 31 days with uptime data')
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

test('a short post-onboarding month renders a countable bullet, not a false span (#113)', () => {
  // What the front page WOULD have published for August had its archive stayed at 30 days:
  // "- [**August 2026**](2026-08/) — 45 services, 30-day monitoring period (Aug 2–31)".
  const entry = buildEntry({
    period: '2026-08', year: 2026, month: 8,
    services: 45, daysCollected: 30,
  })
  assert.strictEqual(
    entry,
    '- [**August 2026**](2026-08/) — 45 services, 30 of 31 days with uptime data',
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
