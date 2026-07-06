// Tests for lint-recurrence.js (aiwatch-reports#55). Pure Node + assert, no deps —
// run: node scripts/lint-recurrence.test.js
const assert = require('assert')
const {
  parseFrontmatter,
  isPublished,
  findLeakedFences,
  lintReport,
  priorReportPath,
} = require('./lint-recurrence')
const { RECURRENCE_OPEN_MARKER, SUMMARY_OPEN_MARKER } = require('./generate-report')

let passed = 0
let failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (err) { failed++; console.log(`  ✗ ${name}`); console.log(`    ${err.message}`) }
}
function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

// A minimal report fixture: frontmatter + Score table (the self-contained lexicon that
// #54's extractor reads) + the three narrative slots.
function report({ published = true, highIncident = 'Together AI (85 incidents)', keyInsight = '- x', affected = 'Gemini API', extra = '' } = {}) {
  return [
    '---',
    'layout: page',
    'title: "Test Report"',
    `published: ${published}`,
    '---',
    '',
    '## Summary',
    '',
    `- **High incident count, fast recovery**: ${highIncident}`,
    extra,
    '',
    '## Key Insight',
    '',
    keyInsight,
    '',
    '## AIWatch Score — Test Rankings',
    '',
    '| Rank | Service | Score | Grade |',
    '|------|---------|-------|-------|',
    '| 1 | Together AI | 84 | Good |',
    '| 2 | Mistral API | 78 | Good |',
    '| 3 | Gemini API | 64 | Fair |',
    '',
    '## Notable Incidents',
    '',
    '### 1. Thing',
    `**Affected**: ${affected}`,
    '',
    '## Observations',
    '',
    '- ok',
  ].join('\n')
}

console.log('\nparseFrontmatter / isPublished')

test('parses published: true', () => {
  eq(parseFrontmatter(report({ published: true })).published, 'true')
  eq(isPublished(report({ published: true })), true)
})

test('parses published: false', () => {
  eq(isPublished(report({ published: false })), false)
})

test('missing frontmatter → {} → not published', () => {
  eq(Object.keys(parseFrontmatter('## No frontmatter')).length, 0)
  eq(isPublished('## No frontmatter'), false)
})

test('handles a BOM-prefixed frontmatter', () => {
  eq(isPublished('﻿---\npublished: true\n---\n# body'), true)
})

test('handles CRLF line endings', () => {
  eq(isPublished('---\r\npublished: true\r\n---\r\nbody'), true)
})

test('normalizes an inline #-comment on the value', () => {
  eq(isPublished('---\npublished: true # ready to ship\n---'), true)
})

test('normalizes a quoted value and mixed case', () => {
  eq(isPublished('---\npublished: "true"\n---'), true)
  eq(isPublished('---\npublished: True\n---'), true)
})

console.log('\nfindLeakedFences')

test('detects an AUTO-DRAFT fence', () => {
  const fences = findLeakedFences(`intro\n${SUMMARY_OPEN_MARKER}\nbody`)
  eq(fences.length, 1)
  eq(fences[0].line, 2)
})

test('detects a RECURRENCE CHECK fence', () => {
  eq(findLeakedFences(`a\nb\n${RECURRENCE_OPEN_MARKER}`).length, 1)
})

test('detects both BEGIN and END markers', () => {
  const md = `${SUMMARY_OPEN_MARKER}\ndraft\n<!-- END AUTO-DRAFT -->`
  eq(findLeakedFences(md).length, 2)
})

test('clean document → no fences', () => {
  eq(findLeakedFences(report()).length, 0)
})

test('a benign comment before a real fence is NOT mis-flagged (no cross-comment span)', () => {
  // Regression: a keyword regex using [^]*? across comments swallowed the benign
  // "Generate with:" comment up to the downstream fence and mis-located it.
  const md = [
    'line1',
    '<!-- Generate with: node scripts/generate-charts.js 2026-05/index.md -->',
    'line3',
    RECURRENCE_OPEN_MARKER,
  ].join('\n')
  const fences = findLeakedFences(md)
  eq(fences.length, 1)
  eq(fences[0].line, 4) // the real fence, at its own line — not line 2
})

console.log('\nlintReport')

test('a draft (published: false) is exempt — fences do NOT fail', () => {
  const md = report({ published: false, extra: SUMMARY_OPEN_MARKER })
  const r = lintReport({ md })
  eq(r.published, false)
  eq(r.errors.length, 0)
})

test('a published report with a leaked AUTO-DRAFT fence FAILS', () => {
  const md = report({ published: true, extra: SUMMARY_OPEN_MARKER })
  const r = lintReport({ md })
  eq(r.errors.length, 1)
  assert.ok(r.errors[0].message.includes('Draft scaffolding leaked'), 'error message names the defect')
})

test('a published report with a leaked RECURRENCE CHECK fence FAILS', () => {
  const md = report({ published: true, extra: RECURRENCE_OPEN_MARKER })
  eq(lintReport({ md }).errors.length, 1)
})

test('a clean published report with no prior month → no errors, no warnings', () => {
  const r = lintReport({ md: report() })
  eq(r.errors.length, 0)
  eq(r.warnings.length, 0)
})

test('WARNS on a same-slot recurrence vs the prior month (reuses #54 extraction)', () => {
  // Overlap ONLY the summary slot (Together AI); differ in notable so exactly one warning.
  const md = report({ highIncident: 'Together AI (85 incidents)', affected: 'Gemini API' })
  const priorMd = report({ highIncident: 'Together AI (133 incidents)', affected: 'Mistral API' })
  const r = lintReport({ md, priorMd, month: '2026-06', priorMonth: '2026-05' })
  eq(r.errors.length, 0)
  eq(r.warnings.length, 1)
  assert.ok(r.warnings[0].message.includes('Together AI'), 'names the repeated service')
  assert.ok(r.warnings[0].message.includes('2026-05'), 'names the prior month')
})

test('does NOT warn when every slot names a different service than the prior month', () => {
  const md = report({ highIncident: 'Together AI (85 incidents)', affected: 'Gemini API' })
  const priorMd = report({ highIncident: 'Mistral API (140 incidents)', affected: 'Mistral API' })
  eq(lintReport({ md, priorMd, month: '2026-06', priorMonth: '2026-05' }).warnings.length, 0)
})

test('fence FAIL and recurrence WARN co-exist on one published report', () => {
  const md = report({ highIncident: 'Together AI (85 incidents)', affected: 'Gemini API', extra: RECURRENCE_OPEN_MARKER })
  const priorMd = report({ highIncident: 'Together AI (133 incidents)', affected: 'Mistral API' })
  const r = lintReport({ md, priorMd, month: '2026-06', priorMonth: '2026-05' })
  eq(r.errors.length, 1)
  eq(r.warnings.length, 1)
})

console.log('\npriorReportPath')

test('resolves the prior month report path from a NNNN-NN/index.md path', () => {
  const { month, priorMonth, priorPath } = priorReportPath('2026-06/index.md')
  eq(month, '2026-06')
  eq(priorMonth, '2026-05')
  assert.ok(priorPath.endsWith('2026-05/index.md'), `prior path resolves to 2026-05, got ${priorPath}`)
})

test('a non-report path yields no month (graceful)', () => {
  const { month, priorPath } = priorReportPath('scripts/thing.js')
  eq(month, '')
  eq(priorPath, null)
})

console.log('\nCLI (exit-code contract)')

const cp = require('child_process')
const fsC = require('fs')
const osC = require('os')
const pathC = require('path')
const CLI = pathC.join(__dirname, 'lint-recurrence.js')

// Run the CLI as a subprocess; returns { code, out }.
function runCli(args) {
  const r = cp.spawnSync('node', [CLI, ...args], { encoding: 'utf-8' })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }
}

test('no args → exit 0 (nothing to lint)', () => {
  eq(runCli([]).code, 0)
})

test('a published report with a leaked fence → exit 1 with ::error', () => {
  const dir = fsC.mkdtempSync(pathC.join(osC.tmpdir(), 'cli-'))
  try {
    const p = pathC.join(dir, '2099-03', 'index.md')
    fsC.mkdirSync(pathC.dirname(p), { recursive: true })
    fsC.writeFileSync(p, report({ published: true, extra: RECURRENCE_OPEN_MARKER }))
    const r = runCli([p])
    eq(r.code, 1)
    assert.ok(r.out.includes('::error'), 'emits an error annotation')
  } finally { fsC.rmSync(dir, { recursive: true, force: true }) }
})

test('multi-file: one clean + one leaked → exit 1 (worst-of aggregation)', () => {
  const dir = fsC.mkdtempSync(pathC.join(osC.tmpdir(), 'cli-multi-'))
  try {
    const clean = pathC.join(dir, '2099-04', 'index.md')
    const bad = pathC.join(dir, '2099-05', 'index.md')
    fsC.mkdirSync(pathC.dirname(clean), { recursive: true })
    fsC.mkdirSync(pathC.dirname(bad), { recursive: true })
    fsC.writeFileSync(clean, report({ published: true }))
    fsC.writeFileSync(bad, report({ published: true, extra: SUMMARY_OPEN_MARKER }))
    eq(runCli([clean, bad]).code, 1)
  } finally { fsC.rmSync(dir, { recursive: true, force: true }) }
})

test('an unreadable file → exit 1 (surfaced, not silently skipped)', () => {
  const r = runCli([pathC.join(osC.tmpdir(), 'does-not-exist-2099-01', 'index.md')])
  eq(r.code, 1)
  assert.ok(r.out.includes('::error'), 'read failure is an annotation')
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
