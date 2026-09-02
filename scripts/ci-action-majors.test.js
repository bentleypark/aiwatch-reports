// aiwatch#671 — a two-sided RATCHET on the major version of every `actions/*` pin in this repo's
// workflows. Pure Node + assert, no deps — run: node scripts/ci-action-majors.test.js
//
// Why a guard and not a note. GitHub removes the Node 20 action runtime on 2026-09-16, so the pins
// here have to move off `@v4` before then. In the five weeks between the sibling repo's issue recounting its pins
// and the fix landing, FOUR more `@v4` pins arrived there — nobody broke a rule, they each added a CI
// job by copying the step above it. A deadline written in an issue does not reach the moment someone
// copies a `uses:` line. This does.
//
// What it deliberately does NOT encode: which major of which action runs on which Node. That is an
// external, rotating fact — it changes when GitHub cuts a release, nothing here could test it, and a
// stale copy would become the premise of the next bump. FLOOR is simply WHAT WE PIN TODAY.
//
// TWO-SIDED. Rule 2 stops a pin sinking below FLOOR; rule 3 stops FLOOR sinking below the pins, so a
// downgrade is a two-place edit visible in the diff. It is a review aid, not a lock: lowering the
// floor AND the pins together is internally consistent and no rule fires. Rule 3's fixture says so.
//
// Rules are FUNCTIONS, and the mutation tests call the same ones the repo-level tests do — an earlier
// draft restated each filter chain beside the fixtures, so a one-character typo in the real rule left
// the suite green while real `@v4` pins shipped.
//
// This is a deliberate SECOND COPY of `aiwatch/scripts/ci-action-majors.test.mjs`. The two repos share
// no package, so there is nowhere to put one implementation. Changing the rule means changing both.
//
// This suite once also asserted that `test.yml`'s `paths` filter still admitted `.github/workflows/**`,
// so the guard could not be silently switched off. That assertion is gone because the FILTER is gone:
// `test.yml` now runs on every PR, so there is no filter to narrow and nothing to parse. See its header.
//
// KNOWN LIMITS: `.github/actions/**/action.yml` (composite actions) is not scanned — neither repo has
// one today. The parser reads BLOCK-style steps; a YAML flow mapping (`- {uses: x@v4}`) is REFUSED by
// `assertNoUnsupportedShape` rather than silently skipped.

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (err) { failed++; console.log(`  ✗ ${name}`); console.log(`    ${err.message}`) }
}

/** Minimum acceptable major per first-party action. Rule 3 pins this to the lowest major actually in
 *  the workflows, so both numbers move in the same PR (aiwatch#671, the Node-20 runner removal). */
const FLOOR = {
  checkout: 7,
  'setup-node': 7,
}

const stripComment = (line) => line.replace(/#.*$/, '')

/** Strip one surrounding quote pair. This repo quotes scalars by house style (`node-version: '20'`),
 *  so a quoted `uses:` value is a correctly-written pin — an earlier draft threw on it. */
function unquote(s) {
  const m = /^(['"])(.*)\1$/.exec(s)
  return m ? m[2] : s
}

/** A `uses:` KEY line: block style, optional list dash, optional quotes, optional space before the
 *  colon. ANCHORED — an unanchored matcher parsed `- run: echo "… uses: actions/checkout@v4"` as a pin. */
const USES_KEY = /^\s*(-\s*)?["']?uses["']?\s*:/

/** A shape carrying a pin that this parser cannot read. Refused loudly, because a flow mapping is
 *  invisible to the block parser AND to any ground truth in the same regex family. */
function assertNoUnsupportedShape(text, label = '<text>') {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (/\{[^}]*\buses\b\s*:/.test(stripComment(lines[i]))) {
      throw new Error(`${label}:${i + 1}: YAML flow-mapping step — this guard reads block style only: ${stripComment(lines[i]).trim()}`)
    }
  }
}

/** Every `uses:` reference. Throws rather than skipping a shape it cannot destructure. A subpath
 *  action (`actions/cache/restore@v4`) or remote reusable workflow is floored on owner + first segment. */
function parseUses(text, label = '<text>') {
  assertNoUnsupportedShape(text, label)
  const out = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const code = stripComment(lines[i])
    if (!USES_KEY.test(code)) continue
    const raw = unquote(code.replace(USES_KEY, '').trim())
    if (raw === '') throw new Error(`${label}:${i + 1}: empty \`uses:\``)
    if (raw.startsWith('./') || raw.startsWith('docker://')) {
      out.push({ owner: null, name: null, ref: null, raw, line: i + 1 })
      continue
    }
    const m = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/[A-Za-z0-9_.\/-]+)?@(\S+)$/.exec(raw)
    if (!m) throw new Error(`${label}:${i + 1}: \`uses:\` the parser could not read: ${raw}`)
    out.push({ owner: m[1], name: m[2], ref: m[3], raw, line: i + 1 })
  }
  return out
}

/** The major in a bare `@vN` pin, or `null` for anything else. */
function majorOf(ref) {
  const m = /^v(\d+)$/.exec(ref == null ? '' : ref)
  return m ? Number(m[1]) : null
}

/** GitHub matches action owners case-insensitively; matching case-sensitively let `Actions/checkout@v4`
 *  bypass rules 2 AND 3 at once, silently. */
const isFirstParty = (u) => (u.owner || '').toLowerCase() === 'actions'

/** Rule 1 — refs that are not a bare `@vN` major pin. */
function notBareMajor(uses) {
  return uses.filter((u) => u.owner !== null && majorOf(u.ref) === null)
}

/** Rule 2 — pins below their floor. `majorOf(...) !== null` first: `null < 7` is `true` in JS, so
 *  without it a floating ref would ALSO be reported here and send the reader to the wrong fix. */
function belowFloor(uses, floor) {
  const f = floor || FLOOR
  return uses
    .filter((u) => isFirstParty(u) && f[u.name] !== undefined)
    .filter((u) => majorOf(u.ref) !== null && majorOf(u.ref) < f[u.name])
}

/** Rule 3 — the other side: a floor entry below the lowest major actually pinned. */
function floorBelowPins(uses, floor) {
  const f = floor || FLOOR
  const lowest = new Map()
  for (const u of uses) {
    if (!isFirstParty(u) || majorOf(u.ref) === null) continue
    const cur = lowest.get(u.name)
    if (cur === undefined || majorOf(u.ref) < cur) lowest.set(u.name, majorOf(u.ref))
  }
  return [...lowest].filter(([n, low]) => f[n] !== undefined && f[n] < low).map(([n, low]) => `${n}: FLOOR ${f[n]} < lowest pin v${low}`)
}

/** Rule 4 — actions used with no floor entry, and floor entries no workflow uses. */
function floorDisagreement(uses, floor) {
  const f = floor || FLOOR
  const used = new Set(uses.filter(isFirstParty).map((u) => u.name))
  return {
    unfloored: [...used].filter((n) => f[n] === undefined).sort(),
    unused: Object.keys(f).filter((n) => !used.has(n)).sort(),
  }
}

const DIR = path.join(__dirname, '..', '.github', 'workflows')
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
const parsed = files.map((f) => ({ file: f, text: fs.readFileSync(path.join(DIR, f), 'utf8') }))
const allUses = parsed.flatMap(({ file, text }) => parseUses(text, file).map((u) => Object.assign({}, u, { file })))

test('the parser reads every BLOCK-style `uses:` key line, and nothing else claims more', () => {
  let raw = 0
  for (const { text } of parsed) {
    for (const line of text.split('\n')) if (USES_KEY.test(stripComment(line))) raw++
  }
  assert.strictEqual(allUses.length, raw, `parseUses and the key matcher disagree (parsed ${allUses.length}, matched ${raw})`)
  assert.ok(files.length >= 4, `expected several workflow files, found ${files.length}`)
  assert.ok(allUses.length >= 8, `expected the repo's pins, found ${allUses.length}`)
})

test('every action ref is a bare major pin — no floating refs, full versions or SHAs', () => {
  const bad = notBareMajor(allUses).map((u) => `${u.file}:${u.line}: ${u.raw}`)
  assert.deepStrictEqual(bad, [], `refs that are not a bare @vN major pin:\n${bad.join('\n')}`)
})

test('RATCHET side A — every actions/* pin is at or above its FLOOR', () => {
  const below = belowFloor(allUses).map((u) => `${u.file}:${u.line}: ${u.raw} < v${FLOOR[u.name]}`)
  assert.deepStrictEqual(below, [], `pins below the floor — raise the pin, or the floor in this file:\n${below.join('\n')}`)
})

test('RATCHET side B — no FLOOR entry sits below the lowest major actually pinned', () => {
  const sunk = floorBelowPins(allUses)
  assert.deepStrictEqual(sunk, [], `FLOOR entries below what the repo pins — raise them in this PR:\n${sunk.join('\n')}`)
})

test('FLOOR and the workflows agree in BOTH directions', () => {
  const d = floorDisagreement(allUses)
  assert.deepStrictEqual(d.unfloored, [], `actions/* used with no FLOOR entry: ${d.unfloored.join(', ')}`)
  assert.deepStrictEqual(d.unused, [], `FLOOR entries no workflow uses: ${d.unused.join(', ')}`)
})

// ── Parser fixtures ───────────────────────────────────────────────────────────────────────────────

const WF = (ref, name) => `jobs:\n  build:\n    steps:\n      - uses: actions/${name || 'checkout'}@${ref}\n`

test('majorOf accepts ONLY a bare major', () => {
  assert.strictEqual(majorOf('v7'), 7)
  assert.strictEqual(majorOf('v10'), 10)
  assert.strictEqual(majorOf('v7.0.1'), null)
  assert.strictEqual(majorOf('main'), null)
  assert.strictEqual(majorOf('11bd71901bbe5b1630ceea73d27597364c9af683'), null)
  assert.strictEqual(majorOf(''), null)
  assert.strictEqual(majorOf(undefined), null)
})

test('parseUses reads the shapes real workflows actually contain', () => {
  const ok = (line) => parseUses(line).map((u) => `${u.owner}/${u.name}@${u.ref}`)
  assert.deepStrictEqual(ok('      - uses: actions/checkout@v7   # the source\n'), ['actions/checkout@v7'])
  assert.deepStrictEqual(ok('        uses: actions/checkout@v7\n'), ['actions/checkout@v7'])
  assert.deepStrictEqual(ok('      - uses: "actions/checkout@v7"\n'), ['actions/checkout@v7'])
  assert.deepStrictEqual(ok("      - uses: 'actions/checkout@v7'\n"), ['actions/checkout@v7'])
  assert.deepStrictEqual(ok('      - "uses": actions/checkout@v7\n'), ['actions/checkout@v7'])
  assert.deepStrictEqual(ok('      - uses : actions/checkout@v7\n'), ['actions/checkout@v7'])
  assert.deepStrictEqual(ok('      - uses: actions/cache/restore@v4\n'), ['actions/cache@v4'])
  assert.deepStrictEqual(ok('      - uses: org/repo/.github/workflows/x.yml@v1\n'), ['org/repo@v1'])
})

test('parseUses THROWS on a `uses:` it cannot destructure, rather than dropping it', () => {
  assert.throws(() => parseUses('      - uses: actions/checkout\n', 'f.yml'), /could not read/)
  assert.throws(() => parseUses('      - uses:\n', 'f.yml'), /empty/)
})

test('a flow-mapping step is REFUSED, not silently skipped', () => {
  assert.throws(() => parseUses('      - {uses: actions/checkout@v4}\n', 'f.yml'), /flow-mapping/)
  assert.throws(() => parseUses('      - { uses: actions/checkout@v4, with: {ref: main} }\n', 'f.yml'), /flow-mapping/)
})

test('an anchored detector ignores a `uses:` that is only quoted inside a run: line', () => {
  assert.deepStrictEqual(parseUses('      - run: echo "this step uses: actions/checkout@v4"\n'), [])
  assert.deepStrictEqual(parseUses('      - name: what this uses is documented above\n'), [])
})

test('parseUses keeps a local or docker action but leaves it unfloored', () => {
  assert.strictEqual(parseUses('      - uses: ./.github/actions/setup\n')[0].owner, null)
  assert.strictEqual(parseUses('      - uses: docker://alpine:3.20\n')[0].owner, null)
})

// ── Mutation: every rule must go RED on the shape it exists to catch, via the SAME functions. ──────

test('MUTATION rule 2: a copy-pasted @v4 is caught, and the current pin is not', () => {
  assert.strictEqual(belowFloor(parseUses(WF('v4'))).length, 1, 'a @v4 pin did not trip the floor')
  assert.strictEqual(belowFloor(parseUses(WF('v7'))).length, 0, 'the current pin tripped the floor')
  assert.strictEqual(belowFloor(parseUses(WF('v8'))).length, 0, 'a future major tripped the floor')
  assert.strictEqual(belowFloor(parseUses('      - uses: Actions/checkout@v4\n')).length, 1, 'a capitalised owner bypassed the floor')
})

test('MUTATION rule 1: floating refs, full versions and SHAs are each caught, by ONE rule only', () => {
  for (const ref of ['main', 'master', 'v7.0.1', '11bd71901bbe5b1630ceea73d27597364c9af683']) {
    assert.strictEqual(notBareMajor(parseUses(WF(ref))).length, 1, `${ref} was accepted as a major pin`)
    assert.strictEqual(belowFloor(parseUses(WF(ref))).length, 0, `${ref} was ALSO reported as below the floor`)
  }
  assert.strictEqual(notBareMajor(parseUses(WF('v7'))).length, 0)
})

test('MUTATION rule 3: a FLOOR entry lowered below the pins is caught — the ratchet is two-sided', () => {
  // Literal floors, never the live FLOOR: a fixture that reads the real config tests the config, not
  // the function, and passes or fails for reasons its own name does not describe.
  const pins = parseUses(WF('v7', 'setup-node'))
  assert.deepStrictEqual(floorBelowPins(pins, { 'setup-node': 4 }), ['setup-node: FLOOR 4 < lowest pin v7'])
  assert.deepStrictEqual(floorBelowPins(pins, { 'setup-node': 7 }), [], 'a floor equal to the pin was reported as sunk')
  assert.deepStrictEqual(floorBelowPins(parseUses(WF('v9', 'setup-node')), { 'setup-node': 7 }), ['setup-node: FLOOR 7 < lowest pin v9'])
  // WHAT THIS RATCHET DOES NOT DO, stated rather than implied: lowering the floor AND the pins
  // together is consistent, so no rule fires. The guarantee is a two-place edit visible in the diff.
  assert.deepStrictEqual(floorBelowPins(parseUses(WF('v4', 'setup-node')), { 'setup-node': 4 }), [])
})

test('MUTATION rule 4: an unfloored actions/* is caught, and so is a dead FLOOR entry', () => {
  assert.deepStrictEqual(floorDisagreement(parseUses('      - uses: actions/stale@v1\n'), { checkout: 7 }).unfloored, ['stale'])
  assert.deepStrictEqual(floorDisagreement(parseUses(WF('v7')), { checkout: 7, retired: 3 }).unused, ['retired'])
  assert.deepStrictEqual(floorDisagreement(parseUses(WF('v7')), {}).unfloored, ['checkout'])
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
