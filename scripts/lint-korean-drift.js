// lint-korean-drift.js — authoring aid for the monthly report's Korean copy (aiwatch-reports#115).
//
// The report's KO `<details>` blocks have no wording check: `lint-recurrence.js` reads narrative
// STRUCTURE (which service leads which slot), and aiwatch's `lint:korean` scans a fixed list of
// surfaces in that repo which does not include this one. The recurring failure is terminology
// drifting from what earlier months settled on, one month at a time, with nothing to compare
// against while authoring.
//
// The KO blocks are structured (`<li><strong>SLOT</strong>: …`), so a slot can be printed beside the
// same slot from the prior N months. The fixed Summary slots (가장 안정적 / 이번 달 가장 위험 /
// 주의 필요) recur every month and are what this is for. The `패턴 N` headings mostly will NOT match,
// by design — write-monthly-report tells the author to reframe a pattern title that paraphrases a
// prior month's — so those print as "no prior month used this slot label". It asserts nothing, so it
// has near-zero false positives; the judgement stays with the author.
//
// Exits 0 on every path it handles: this is a judgement aid, like `lint:graph`'s unclaimed-issue
// report, not a gate. Pure decision logic is unit-tested in lint-korean-drift.test.js.
//
// A second half — a scan for Hangul runs absent from the prior months — was built and removed before
// merge as too imprecise to act on. The measurements are in aiwatch-reports#115; read them there
// rather than rebuilding it from memory.

const fs = require('fs')
const path = require('path')
const { monthsBefore } = require('./generate-charts')

const KO_BLOCK_RE = /<summary><strong>[^<]*Korean[^<]*<\/strong><\/summary>([\s\S]*?)<\/details>/g
// How many prior months the comparison reads. Fixed rather than a flag: a `--months` option existed,
// was never passed by the documented invocation, and each round it cost something — a non-contiguous
// window from a fractional value, a guard for that, a unit test for the guard, then an unpinned call
// site. Nothing outside its own tests ever used it.
const PRIOR_MONTHS = 3

// Items are split BEFORE the label/body split. One combined regex was tried and withdrawn: with a
// label pattern permissive enough for inline markup, a bullet carrying `<strong>…</strong>` and no
// colon let the label backtrack past `</li>` into a later item, fabricating one merged slot and
// deleting a real one. Splitting first means no pattern can span an item boundary.
const LI_SPLIT_RE = /<li\b[^>]*>/
const LABEL_BODY_RE = /^\s*<strong>([\s\S]*?)<\/strong>\s*:\s*([\s\S]*?)(?:<\/li>[\s\S]*)?$/

/** Strip HTML tags and collapse whitespace — the KO blocks carry `<a>`/`<em>`/`<strong>` inline. */
function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** All KO `<details>` bodies in a report, concatenated. Empty string when the report has none. */
function koBlocks(src) {
  return [...String(src).matchAll(KO_BLOCK_RE)].map((m) => m[1]).join('\n')
}

/**
 * KO blocks → `{ [slotLabel]: text }`, for bullets written as `<li><strong>LABEL</strong>: text`.
 * A duplicate label keeps the FIRST occurrence: a repeat is a report defect, and silently overwriting
 * would hide it from the comparison.
 */
function extractKoSlots(src) {
  const out = {}
  for (const item of koBlocks(src).split(LI_SPLIT_RE).slice(1)) {
    const m = LABEL_BODY_RE.exec(item)
    if (!m) continue
    const key = stripTags(m[1])
    if (key && !(key in out)) out[key] = stripTags(m[2])
  }
  return out
}

/**
 * Pair each slot of `current` with the same slot in each prior month.
 * `priors` is `[{ month, slots }]`, oldest first. A slot with no prior match is reported with an
 * empty `prior` array rather than dropped — a NEW slot label is itself worth seeing, since it means
 * this month invented a heading the corpus has no precedent for.
 */
function compareSlots(current, priors) {
  return Object.entries(current).map(([slot, text]) => ({
    slot,
    text,
    prior: priors
      .map(({ month, slots }) => (slots[slot] === undefined ? null : { month, text: slots[slot] }))
      .filter(Boolean),
  }))
}

/** `2026-08/index.md` → `2026-08`. Returns null when the path carries no `YYYY-MM` directory. */
function monthOfPath(p) {
  const m = String(p).match(/(\d{4}-\d{2})[/\\]index\.md$/)
  return m ? m[1] : null
}

/**
 * File text, or null when it cannot be read FOR ANY REASON — missing, a directory, unreadable.
 * The earlier guard probed `fs.existsSync` separately, which answers "a directory entry is here"
 * rather than "this reads as text": a directory named `index.md` threw EISDIR.
 */
function readOrNull(p) {
  try { return fs.readFileSync(p, 'utf8') } catch { return null }
}

/**
 * Split read months into the ones the slot comparison can use and the ones it cannot.
 * A month whose KO bullets are markdown rather than `<li><strong>` yields no slots (2026-03 is one).
 * It must not be listed as compared — that would make "no prior month used this slot label" a false
 * claim about a month that does carry the slot.
 *
 * This lives here rather than inside `main` so it can be tested: while it was a branch in the CLI its
 * regression test could only assert the precondition, and stayed green with the branch deleted.
 */
function partitionPriors(entries) {
  const comparable = []
  const unparsed = []
  for (const e of entries) {
    if (Object.keys(e.slots || {}).length) comparable.push(e)
    else unparsed.push(e)
  }
  return { comparable, unparsed }
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function main(argv) {
  const target = argv[0]
  if (!target) {
    console.log('usage: node scripts/lint-korean-drift.js YYYY-MM/index.md')
    return 0
  }
  const month = monthOfPath(target)
  if (!month) {
    console.log(`[lint-korean-drift] ${target}: not a YYYY-MM/index.md path — nothing to compare.`)
    return 0
  }
  const root = path.resolve(__dirname, '..')
  const targetPath = path.resolve(root, target)
  const src = readOrNull(targetPath)
  if (src === null) {
    console.log(`[lint-korean-drift] ${target}: could not read it (looked in ${targetPath}) — nothing to compare.`)
    return 0
  }
  const current = extractKoSlots(src)
  if (!Object.keys(current).length) {
    console.log(`[lint-korean-drift] ${target}: no Korean <details> slots found — nothing to compare.`)
    return 0
  }

  const read = []
  for (const m of monthsBefore(month, PRIOR_MONTHS)) {
    const raw = readOrNull(path.join(root, m, 'index.md'))
    if (raw === null) continue
    read.push({ month: m, slots: extractKoSlots(raw) })
  }
  const { comparable: priors, unparsed } = partitionPriors(read)
  if (!priors.length) {
    console.log(`[lint-korean-drift] ${month}: no prior month has comparable KO slots — nothing to compare.`)
    return 0
  }

  console.log(`\n[lint-korean-drift] ${month} Korean copy vs ${priors.map((p) => p.month).join(', ')}`)
  if (unparsed.length) {
    console.log(`  slot comparison skips (KO bullets are not <li><strong>): ${unparsed.map((e) => e.month).join(', ')}`)
  }
  console.log('  Advisory only — nothing here fails. Read the prior wording, then decide.\n')

  console.log('── Slot comparison ' + '─'.repeat(58))
  for (const { slot, text, prior } of compareSlots(current, priors)) {
    console.log(`\n  ▸ ${slot}`)
    for (const p of prior) console.log(`      ${p.month}  ${p.text}`)
    console.log(`      ${month}  ${text}`)
    if (!prior.length) console.log('      (no prior month used this slot label)')
  }

  return 0
}

module.exports = { stripTags, koBlocks, extractKoSlots, compareSlots, partitionPriors, monthOfPath, readOrNull }

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)))
  } catch (err) {
    console.log(`[lint-korean-drift] unexpected error: ${err && err.message ? err.message : err}`)
    process.exit(0)
  }
}
