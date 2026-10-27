// aiwatch#1807 — every `actions/setup-node` step reads the Node version from `.nvmrc` with
// `check-latest: true`, and no workflow pins one inline. Pure Node + assert, no deps — run:
// node scripts/ci-node-version.test.js
//
// setup-node lets an inline `node-version:` win over `node-version-file:`, and without `check-latest`
// it takes whatever matching version the runner has cached, so either one would silently keep a job off
// the latest security release. The sibling repo carries its own copy (`scripts/ci-node-version.test.mjs`).

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const repoRoot = path.join(__dirname, '..')
const DIR = path.join(repoRoot, '.github/workflows')

let passed = 0
let failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (err) { failed++; console.log(`  ✗ ${name}`); console.log(`    ${err.message}`) }
}

const SETUP_NODE = /^\s*(-\s*)?["']?uses["']?\s*:\s*["']?actions\/setup-node@/
const INLINE_PIN = /^\s*["']?node-version["']?\s*:/
const FROM_NVMRC = /^\s*["']?node-version-file["']?\s*:\s*["']?\.nvmrc["']?\s*(#.*)?$/
const CHECK_LATEST = /^\s*["']?check-latest["']?\s*:\s*["']?true["']?\s*(#.*)?$/

/** Problems in one workflow's text; empty when every setup-node step reads `.nvmrc` and checks latest. */
function nodeVersionViolations(text) {
  const lines = text.split('\n')
  const problems = lines
    .map((l, i) => (INLINE_PIN.test(l) ? `line ${i + 1}: inline node-version` : null))
    .filter(Boolean)
  const steps = lines.filter((l) => SETUP_NODE.test(l)).length
  const fromFile = lines.filter((l) => FROM_NVMRC.test(l)).length
  const latest = lines.filter((l) => CHECK_LATEST.test(l)).length
  if (steps !== fromFile) problems.push(`${steps} setup-node step(s), ${fromFile} node-version-file: .nvmrc`)
  if (steps !== latest) problems.push(`${steps} setup-node step(s), ${latest} check-latest: true`)
  return problems
}

/** `.nvmrc` holds one bare major. */
function isBareMajor(nvmrc) {
  return /^\d+\n?$/.test(nvmrc)
}

const workflows = fs.readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f))

test('every workflow takes its Node version from .nvmrc', () => {
  const found = Object.fromEntries(
    workflows
      .map((f) => [f, nodeVersionViolations(fs.readFileSync(path.join(DIR, f), 'utf8'))])
      .filter(([, p]) => p.length),
  )
  assert.deepStrictEqual(found, {})
})

test('the scan sees the real setup-node steps', () => {
  const steps = workflows
    .flatMap((f) => fs.readFileSync(path.join(DIR, f), 'utf8').split('\n'))
    .filter((l) => SETUP_NODE.test(l))
  assert.ok(steps.length > 0)
})

test('.nvmrc is one bare major', () => {
  assert.ok(isBareMajor(fs.readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8')))
})

const step = (withLines) =>
  ['    steps:', '      - uses: actions/checkout@v7', '      - uses: actions/setup-node@v7', '        with:', ...withLines].join('\n')

const FILE = "          node-version-file: '.nvmrc'"
const LATEST = '          check-latest: true'

test('fixture: a step reading .nvmrc with check-latest passes', () => {
  assert.deepStrictEqual(nodeVersionViolations(step([FILE, LATEST])), [])
  assert.deepStrictEqual(nodeVersionViolations(step(['          node-version-file: .nvmrc', "          check-latest: 'true'"])), [])
})

test('fixture: an inline pin fails, alone or next to node-version-file', () => {
  assert.strictEqual(nodeVersionViolations(step(["          node-version: '20'", LATEST])).length, 2)
  assert.deepStrictEqual(nodeVersionViolations(step([FILE, LATEST, '          node-version: 20'])), ['line 7: inline node-version'])
})

test('fixture: a setup-node step with no version source fails', () => {
  assert.deepStrictEqual(nodeVersionViolations(step([LATEST])), ['1 setup-node step(s), 0 node-version-file: .nvmrc'])
})

test('fixture: node-version-file pointing elsewhere fails', () => {
  assert.strictEqual(nodeVersionViolations(step(["          node-version-file: 'package.json'", LATEST])).length, 1)
})

test('fixture: missing or false check-latest fails', () => {
  assert.deepStrictEqual(nodeVersionViolations(step([FILE])), ['1 setup-node step(s), 0 check-latest: true'])
  assert.deepStrictEqual(nodeVersionViolations(step([FILE, '          check-latest: false'])), ['1 setup-node step(s), 0 check-latest: true'])
})

test('fixture: isBareMajor', () => {
  assert.ok(isBareMajor('24\n'))
  assert.ok(isBareMajor('24'))
  assert.ok(!isBareMajor('v24\n'))
  assert.ok(!isBareMajor('24.x\n'))
  assert.ok(!isBareMajor('lts/*\n'))
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
