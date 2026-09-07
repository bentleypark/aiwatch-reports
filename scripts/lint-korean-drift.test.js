// Tests for lint-korean-drift.js (aiwatch-reports#115). Pure Node + assert, no deps —
// run: node scripts/lint-korean-drift.test.js
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  stripTags, koBlocks, extractKoSlots, compareSlots, partitionPriors, monthOfPath, readOrNull,
} = require('./lint-korean-drift')

let passed = 0
let failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`) }
}

const ko = (body) => `<details>\n<summary><strong>Summary in Korean</strong></summary>\n<ul>\n${body}\n</ul>\n</details>`
const li = (slot, text) => `<li><strong>${slot}</strong>: ${text}</li>`

// ── extraction ───────────────────────────────────────────────────────────────
test('extractKoSlots reads slot label → text, tags stripped', () => {
  const s = extractKoSlots(ko(li('가장 안정적', 'Windsurf (100) — 장애 <em>0건</em>')))
  assert.deepEqual(Object.keys(s), ['가장 안정적'])
  assert.equal(s['가장 안정적'], 'Windsurf (100) — 장애 0건')
})

test('a non-Korean <details> block is not picked up', () => {
  const en = '<details>\n<summary><strong>Method notes</strong></summary>\n<ul>\n' +
    li('Most reliable', 'Windsurf') + '\n</ul>\n</details>'
  assert.deepEqual(extractKoSlots(en), {})
})

test('a report with no KO block yields no slots, and does not throw', () => {
  assert.deepEqual(extractKoSlots('## Summary\n\n- **Most reliable**: Windsurf\n'), {})
  assert.equal(koBlocks(''), '')
})

test('a duplicated slot label keeps the first — a repeat is a defect, not something to hide', () => {
  const s = extractKoSlots(ko([li('주의 필요', '첫 번째'), li('주의 필요', '두 번째')].join('\n')))
  assert.equal(s['주의 필요'], '첫 번째')
})

test('stripTags collapses whitespace so multi-line slot bodies compare cleanly', () => {
  assert.equal(stripTags('가장\n  안정적   <a href="#x">링크</a>'), '가장 안정적 링크')
})

test('monthOfPath reads YYYY-MM from the directory, and rejects anything else', () => {
  assert.equal(monthOfPath('2026-08/index.md'), '2026-08')
  assert.equal(monthOfPath('/abs/path/2026-08/index.md'), '2026-08')
  assert.equal(monthOfPath('_templates/monthly-report.md'), null)
  assert.equal(monthOfPath('index.md'), null)
})

// ── slot pairing ─────────────────────────────────────────────────────────────
test('compareSlots pairs a slot with the same slot in each prior month', () => {
  const cur = { '가장 안정적': '8월 문장', '주의 필요': '8월 주의' }
  const priors = [
    { month: '2026-06', slots: { '가장 안정적': '6월 문장' } },
    { month: '2026-07', slots: { '가장 안정적': '7월 문장', '주의 필요': '7월 주의' } },
  ]
  const out = compareSlots(cur, priors)
  const stable = out.find((r) => r.slot === '가장 안정적')
  assert.deepEqual(stable.prior.map((p) => [p.month, p.text]), [['2026-06', '6월 문장'], ['2026-07', '7월 문장']])
  assert.equal(out.find((r) => r.slot === '주의 필요').prior.length, 1)
})

test('a slot label no prior month used is reported with an empty prior list, not dropped', () => {
  const out = compareSlots({ '새 슬롯': '본문' }, [{ month: '2026-07', slots: { '가장 안정적': 'x' } }])
  assert.equal(out.length, 1)
  assert.deepEqual(out[0].prior, [])
})

// ── slot-label extraction ────────────────────────────────────────────────────
test('REGRESSION F3a — a label carrying inline markup is kept, not dropped with its slot', () => {
  const s = extractKoSlots(ko([li('패턴 <em>1</em>', '본문'), li('정상', '본문2')].join('')))
  assert.deepEqual(s, { '패턴 1': '본문', 정상: '본문2' })
})

test('REGRESSION F3b — whitespace between <li> and <strong> does not drop the slot', () => {
  assert.deepEqual(extractKoSlots(ko('<li> <strong>가장 안정적</strong>: 본문</li>')), { '가장 안정적': '본문' })
})

test('REGRESSION F3c — an unclosed <li> does not swallow the next slot', () => {
  const s = extractKoSlots(ko('<li><strong>가장 안정적</strong>: 첫째<li><strong>주의 필요</strong>: 둘째</li>'))
  assert.deepEqual(s, { '가장 안정적': '첫째', '주의 필요': '둘째' })
})

test('REGRESSION F1 — readOrNull returns null for a missing path and for a directory', () => {
  const fsx = require('fs'); const os = require('os')
  const dir = fsx.mkdtempSync(path.join(os.tmpdir(), 'kdrift-'))
  assert.equal(readOrNull(path.join(dir, 'nope.md')), null, 'missing')
  assert.equal(readOrNull(dir), null, 'a directory must not throw EISDIR')
  const f = path.join(dir, 'x.md'); fsx.writeFileSync(f, 'hello')
  assert.equal(readOrNull(f), 'hello', 'control: a readable file still returns its text')
  fsx.rmSync(dir, { recursive: true, force: true })
})

test('REGRESSION R2 — a bullet with <strong> but NO colon does not swallow the next slot', () => {
  // Round 1 widened the label to allow inline markup, which let it backtrack past </li>: the
  // colon-less item and the next item fused into one fabricated label, deleting a real slot.
  const s = extractKoSlots(ko(
    '<li><strong>패턴 1</strong> — 콜론 없는 리드인입니다.</li>' + li('패턴 2', '본문입니다')))
  assert.deepEqual(s, { '패턴 2': '본문입니다' })
  assert.ok(!Object.keys(s).some((k) => k.includes('콜론 없는')), 'no fabricated merged label')
})

test('REGRESSION R2 — the label may not span two KO <details> blocks', () => {
  const two = ko('<li><strong>가장 안정적</strong> 콜론 없음</li>') + '\n' + ko(li('패턴 1', '본문'))
  assert.deepEqual(extractKoSlots(two), { '패턴 1': '본문' })
})

test('REGRESSION R2 — an <li> carrying attributes is parsed, not skipped', () => {
  assert.deepEqual(extractKoSlots(ko('<li class="x"><strong>가장 안정적</strong>: 본문</li>')),
    { '가장 안정적': '본문' })
})

test('REGRESSION R3 — partitionPriors sends a zero-slot month to unparsed, and keeps the rest comparable', () => {
  // The round-2 version of this test asserted only the PRECONDITION (`extractKoSlots` returns {}),
  // which was already true before the fix — it stayed green with the shipped branch deleted. The
  // decision now lives in a pure fn, so the assertion can reach it.
  const md = '<details markdown="1">\n<summary><strong>Summary in Korean</strong></summary>\n\n' +
    '- **가장 안정적**: Cohere\n\n</details>'
  const mdEntry = { month: '2026-03', slots: extractKoSlots(md) }
  const ok = { month: '2026-04', slots: { '가장 안정적': '본문' } }
  assert.deepEqual(extractKoSlots(md), {}, 'precondition: markdown bullets are not <li><strong>')
  const { comparable, unparsed } = partitionPriors([mdEntry, ok])
  assert.deepEqual(comparable.map((e) => e.month), ['2026-04'])
  assert.deepEqual(unparsed.map((e) => e.month), ['2026-03'])
})

test('REGRESSION R3 — partitionPriors on all-comparable and all-unparsed inputs', () => {
  const a = { month: '2026-04', slots: { x: '1' } }
  const b = { month: '2026-05', slots: {} }
  assert.deepEqual(partitionPriors([a]).unparsed, [])
  assert.deepEqual(partitionPriors([b]).comparable, [])
  assert.deepEqual(partitionPriors([]), { comparable: [], unparsed: [] })
  assert.deepEqual(partitionPriors([{ month: '2026-06' }]).unparsed.length, 1, 'a missing slots field is not comparable')
})

// ── the CLI itself, executed — the only thing that pins how main() composes the pure fns ─────
// Rounds 2, 3 and 4 each found a defect on a line no test ran: the decision was extracted and tested,
// but its CALL SITE stayed blind, so reverting the call left the suite green. This runs the real
// script against the real months on disk.
function cli(args) {
  const { execFileSync } = require('child_process')
  return execFileSync(process.execPath, [path.join(__dirname, 'lint-korean-drift.js'), ...args],
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' })
}

test('CLI — a prior month whose KO bullets are markdown is skipped, not listed as compared', () => {
  // 2026-03 is markdown-style; 2026-04/05 are not. Reverting main() to skip partitionPriors puts
  // 2026-03 back in the compared list, which this assertion catches.
  const out = cli(['2026-06/index.md'])
  assert.ok(/Korean copy vs 2026-04, 2026-05/.test(out), `compared list wrong:\n${out}`)
  assert.ok(/slot comparison skips[^\n]*2026-03/.test(out), `2026-03 not reported as skipped:\n${out}`)
})

test('CLI — a window reaching only a markdown month reports that, not "no prior month on disk"', () => {
  const out = cli(['2026-04/index.md'])
  assert.ok(!/on disk/.test(out), `2026-03 IS on disk and was read:\n${out}`)
  assert.ok(/no prior month has comparable KO slots/.test(out), out)
})

test('CLI — prints a real slot comparison for a normal month, and exits 0', () => {
  const out = cli(['2026-07/index.md'])
  assert.ok(/▸ 가장 안정적/.test(out), out)
  assert.ok(/2026-06 /.test(out), 'a prior month must appear under the slot')
  // The TARGET month's own line is the tool's deliverable — the sentence the author is being asked to
  // compare. Every other assertion here survived deleting it, so it needs its own.
  assert.ok(/2026-07\s+Windsurf \(100\)/.test(out),
    `the target month's own wording must be printed under the slot:\n${out}`)
})

test('CLI — a prior line prints in FULL, and every prior month appears under the slot', () => {
  // Round 7 found the output truncated at 150 chars with no marker — 22 of 33 slots exceeded it, so
  // most comparisons hid the text the author was asked to read. Deleting the cap fixed it and shipped
  // no test, leaving five mutations that restore the exact defect at 21/21 green. Both properties are
  // decidable against committed text: 2026-04's `주의 필요` body is 235 chars, and `가장 안정적`
  // exists in all three prior months.
  const out = cli(['2026-07/index.md'])
  const block = (label) => {
    const from = out.indexOf(`▸ ${label}`)
    assert.ok(from !== -1, `slot ${label} not printed:\n${out}`)
    const next = out.indexOf('\n  ▸ ', from + 1)
    return out.slice(from, next === -1 ? undefined : next)
  }
  // one prior line and one TARGET line, since they are printed by separate statements: 2026-04's
  // `주의 필요` body is 235 chars and 2026-07's is 260.
  assert.ok(/mmary methodology 확인 권장\./.test(block('주의 필요')),
    `a 235-char prior line must print to its end, not to a cap:\n${block('주의 필요')}`)
  assert.ok(/pic 쪽 성능 저하로 기록된 것입니다\./.test(block('주의 필요')),
    `the 260-char TARGET line must print to its end too:\n${block('주의 필요')}`)
  const stable = block('가장 안정적')
  for (const m of ['2026-04', '2026-05', '2026-06']) {
    assert.ok(new RegExp(`\\n      ${m}  `).test(stable), `${m} missing from 가장 안정적:\n${stable}`)
  }
})

test('CLI — the no-prior notice appears under the slot that has none, and NOT under one that does', () => {
  // 2026-07's `장애 건수는 하락세…` slot appears in no earlier month; `가장 안정적` appears in all of
  // them. Asserting only that the string exists let an unconditional print pass, which would put
  // "no prior month used this slot label" directly beneath three prior-month lines.
  const out = cli(['2026-07/index.md'])
  const block = (label) => {
    const from = out.indexOf(`▸ ${label}`)
    assert.ok(from !== -1, `slot ${label} not printed:\n${out}`)
    const next = out.indexOf('\n  ▸ ', from + 1)
    return out.slice(from, next === -1 ? undefined : next)
  }
  assert.ok(/no prior month used this slot label/.test(block('장애 건수는 하락세')), out)
  assert.ok(!/no prior month used this slot label/.test(block('가장 안정적')),
    `the notice must not print under a slot that HAS priors:\n${out}`)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
