// lint-narrative-repeats.js — authoring aid: figures repeated across ONE report's narrative sections
// (aiwatch-reports#122).
//
// `lint-recurrence.js` and the generate-time RECURRENCE CHECK compare a report against PRIOR months.
// Nothing looked inside a single report, where the recurring miss is one story told in full in
// several of the four narrative sections (Summary, Key Insight, Notable Incidents, Observations).
//
// It counts literal figure tokens per section and prints every figure that appears in 3 or more.
// Two sections is house style — a Summary bullet carries its home section's headline number — so the
// threshold is 3. It prints and exits 0 on every path it handles: the judgement stays with the author.
//
// Known limits:
// - It sees only four figure shapes: a duration, a percentage, `N → M` and `N of M`. A story retold
//   through a bare Score (`(45)`), a latency (`174ms`) or no figure at all is invisible to it.
// - Cross-MONTH framing repetition is the RECURRENCE CHECK's job; this is strictly within one report.
// - It cannot tell a legitimate contrast from a duplication.
// - The Korean `<details>` mirrors are excluded: they restate their English section by design.

const fs = require('fs')
const path = require('path')

const SECTIONS = ['Summary', 'Key Insight', 'Notable Incidents', 'Observations']
const THRESHOLD = 3

// Longest alternative first, so `138h 3m` is one token rather than `138h` + `3m`.
const FIGURE_RE = /(?<![\d.,])(?:\d+(?:\.\d+)?%|\d+h \d+m|\d+h|\d+m|\d+ → \d+|\d+ of \d+)(?![\w]|[.,]\d)/g

/** `## Heading` → body, for every level-2 heading. A repeated heading keeps the first. */
function splitSections(src) {
  const out = {}
  const parts = String(src).split(/^## +/m).slice(1)
  for (const part of parts) {
    const nl = part.indexOf('\n')
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim()
    if (!(heading in out)) out[heading] = nl === -1 ? '' : part.slice(nl + 1)
  }
  return out
}

/** Drop HTML comments (draft fences, authoring notes) and `<details>` blocks (the KO mirrors). */
function narrativeText(body) {
  return String(body)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, ' ')
}

/** Distinct figure tokens in a text, in first-seen order. */
function figures(text) {
  return [...new Set(String(text).match(FIGURE_RE) || [])]
}

/**
 * Figures appearing in at least `threshold` of the narrative sections, most-repeated first.
 * Returns `{ repeats: [{ figure, sections }], missing: [sectionName] }`.
 */
function findRepeats(src, threshold = THRESHOLD) {
  const all = splitSections(src)
  const missing = SECTIONS.filter((s) => !(s in all))
  const seen = new Map()
  for (const name of SECTIONS) {
    if (!(name in all)) continue
    for (const f of figures(narrativeText(all[name]))) {
      if (!seen.has(f)) seen.set(f, [])
      seen.get(f).push(name)
    }
  }
  const repeats = [...seen.entries()]
    .filter(([, secs]) => secs.length >= threshold)
    .map(([figure, sections]) => ({ figure, sections }))
    .sort((a, b) => b.sections.length - a.sections.length)
  return { repeats, missing }
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function main(argv) {
  const target = argv[0]
  if (!target) {
    console.log('usage: node scripts/lint-narrative-repeats.js YYYY-MM/index.md')
    return 0
  }
  const targetPath = path.resolve(path.resolve(__dirname, '..'), target)
  let src
  try { src = fs.readFileSync(targetPath, 'utf8') } catch {
    console.log(`[lint-narrative-repeats] ${target}: could not read it (looked in ${targetPath}).`)
    return 0
  }
  const { repeats, missing } = findRepeats(src)
  console.log(`\n[lint-narrative-repeats] ${target} — figures in ${THRESHOLD}+ of: ${SECTIONS.join(' / ')}`)
  console.log('  Advisory only — nothing here fails. A hit is a second telling to check, not a defect.\n')
  if (missing.length) console.log(`  sections not found: ${missing.join(', ')}\n`)
  if (!repeats.length) {
    console.log('  none')
    return 0
  }
  for (const { figure, sections } of repeats) console.log(`  ${figure.padEnd(14)} ${sections.length}  ${sections.join(' · ')}`)
  return 0
}

module.exports = { SECTIONS, THRESHOLD, splitSections, narrativeText, figures, findRepeats }

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)))
  } catch (err) {
    console.log(`[lint-narrative-repeats] unexpected error: ${err && err.message ? err.message : err}`)
    process.exit(0)
  }
}
