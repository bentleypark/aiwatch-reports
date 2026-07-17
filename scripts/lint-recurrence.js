// lint-recurrence.js — pre-publish CI backstop for narrative recurrence (aiwatch-reports#55).
//
// Second layer behind the generate-time RECURRENCE CHECK block (#54): that block is
// advisory and DELETED before merge, so nothing stops a `published: true` report from
// still naming the same service in the same narrative slot as the prior month, or from
// leaking a draft fence. This lint enforces at the point of no return (the publish PR):
//
//   • FAIL  — any AUTO-DRAFT / RECURRENCE CHECK fence survived into a `published: true`
//             report (unambiguous defect: draft scaffolding must never publish).
//   • WARN  — a service named in the same slot as the immediately prior month (a genuine
//             recurring pattern is sometimes legitimately the story, so it warns rather
//             than fails — but it can never pass SILENTLY).
//
// Extraction is the SINGLE SOURCE OF TRUTH from #54 — `extractNarrativeSubjects` /
// `detectRecurrence` are imported, never re-implemented. Pure decision logic
// (`parseFrontmatter`, `findLeakedFences`, `lintReport`) is unit-tested in
// lint-recurrence.test.js; only the file I/O + annotation printing lives in the CLI.

const fs = require('fs')
const path = require('path')
const {
  extractNarrativeSubjects,
  detectRecurrence,
  RECURRENCE_SLOT_LABEL: SLOT_LABEL,
  SUMMARY_OPEN_MARKER,
  NOTABLE_OPEN_MARKER,
  OBSERVATIONS_OPEN_MARKER,
  RECURRENCE_OPEN_MARKER,
} = require('./generate-report')
const { monthsBefore } = require('./generate-charts')

// Human labels per slot for the warn annotation — IMPORTED from generate-report (#61), not copied.
// This was a hand-maintained mirror of #54's block wording; adding the 'Watch out' slot is exactly
// the edit that would have let the two drift (the lint would print a bare slot key for any slot the
// copy missed), so it now shares the one definition that the RECURRENCE block already renders from.

// The exact fence markers we ship (kept for reference/coupling); the detector below is a
// keyword check so a hand-edited/close marker or a future fence variant is still caught.
const KNOWN_FENCE_MARKERS = [SUMMARY_OPEN_MARKER, NOTABLE_OPEN_MARKER, OBSERVATIONS_OPEN_MARKER, RECURRENCE_OPEN_MARKER]
// Match each HTML comment INDIVIDUALLY (lazy to the first `-->`) — a keyword regex spanning
// `[^]*?` across comments would swallow a benign comment up to a downstream fence and
// mis-locate it. We then keyword-check the comment's own body.
const COMMENT_RE = /<!--([\s\S]*?)-->/g
const FENCE_KEYWORD_RE = /\b(?:AUTO-DRAFT|RECURRENCE CHECK)\b/i

// PURE. Read the leading `---` YAML frontmatter into a shallow key→string map. Only the
// scalar fields we need (`published`) matter; missing frontmatter → {}.
function parseFrontmatter(md) {
  const m = String(md).match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const out = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    // YAML: an UNQUOTED value ends at an inline ` # comment`; a quoted value keeps its content.
    if (!/^['"]/.test(v)) v = v.replace(/\s+#.*$/, '').trim()
    v = v.replace(/^(['"])(.*)\1$/, '$2') // strip surrounding quotes
    out[kv[1]] = v
  }
  return out
}

// PURE. Is this report marked `published: true`? Case-insensitive so a `published: True`
// (still truthy to Jekyll) can't silently slip the lint.
function isPublished(md) {
  return String(parseFrontmatter(md).published).toLowerCase() === 'true'
}

// PURE. Every AUTO-DRAFT / RECURRENCE CHECK fence (BEGIN or END) present in the document,
// with a 1-based line number for the annotation. Empty when clean.
function findLeakedFences(md) {
  const text = String(md)
  const out = []
  for (const m of text.matchAll(COMMENT_RE)) {
    if (!FENCE_KEYWORD_RE.test(m[1])) continue // benign comment (e.g. "Generate with: …")
    const line = text.slice(0, m.index).split('\n').length
    out.push({ line, snippet: m[0].split('\n')[0].slice(0, 120) })
  }
  return out
}

// PURE. Decide the lint result for one report against its prior month. Reuses #54's
// extraction verbatim. A `published: false` draft is exempt (fences are expected there).
//   { md, priorMd?, month?, priorMonth? } → { published, errors:[{line,message}], warnings:[{message}] }
function lintReport({ md, priorMd = null, month = '', priorMonth = '' }) {
  const published = isPublished(md)
  const errors = []
  const warnings = []
  if (!published) return { published, errors, warnings } // draft — nothing to enforce

  for (const f of findLeakedFences(md)) {
    errors.push({ line: f.line, message: `Draft scaffolding leaked into a published report — remove this fence before publishing: ${f.snippet}` })
  }

  if (priorMd) {
    const current = extractNarrativeSubjects(md)
    const prior = [{ month: priorMonth, subjects: extractNarrativeSubjects(priorMd) }]
    // window/min = 1: warn when a subject fills the same slot in the ONE immediately prior month.
    for (const f of detectRecurrence(current, prior, { window: 1, min: 1 })) {
      const label = SLOT_LABEL[f.slot] || f.slot
      warnings.push({ message: `"${f.service}" led ${label} in ${priorMonth || 'the prior month'} too — reframe around the month-over-month change or confirm the repeat is intentional.` })
    }
  }

  return { published, errors, warnings }
}

// ── CLI ──────────────────────────────────────────────────────────────
// Usage: node scripts/lint-recurrence.js <report/index.md> [<report/index.md> …]
// Emits GitHub Actions annotations; exits non-zero iff any report has a fence error.

// Resolve the prior month's report path relative to a `NNNN-NN/index.md` report path.
function priorReportPath(reportPath) {
  const month = path.basename(path.dirname(reportPath)) // "2026-06"
  if (!/^\d{4}-\d{2}$/.test(month)) return { month: '', priorMonth: '', priorPath: null }
  const priorMonth = monthsBefore(month, 1)[0]
  const priorPath = path.join(path.dirname(reportPath), '..', priorMonth, 'index.md')
  return { month, priorMonth, priorPath }
}

function lintFile(reportPath) {
  let md
  try {
    md = fs.readFileSync(reportPath, 'utf-8')
  } catch (err) {
    console.log(`::error file=${reportPath}::Could not read report (${err instanceof Error ? err.message : err})`)
    return 1
  }
  const { month, priorMonth, priorPath } = priorReportPath(reportPath)
  let priorMd = null
  if (priorPath) {
    try { priorMd = fs.readFileSync(priorPath, 'utf-8') } catch { priorMd = null /* prior month absent → skip warn */ }
  }

  const { published, errors, warnings } = lintReport({ md, priorMd, month, priorMonth })
  if (!published) {
    console.log(`[lint-recurrence] ${reportPath}: draft (published: false) — skipped.`)
    return 0
  }
  for (const e of errors) console.log(`::error file=${reportPath},line=${e.line}::${e.message}`)
  for (const w of warnings) console.log(`::warning file=${reportPath}::${w.message}`)
  const verdict = errors.length ? `FAIL (${errors.length} leaked fence${errors.length === 1 ? '' : 's'})` : warnings.length ? `pass with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : 'clean'
  console.log(`[lint-recurrence] ${reportPath}: ${verdict}.`)
  return errors.length ? 1 : 0
}

if (require.main === module) {
  const files = process.argv.slice(2).filter(Boolean)
  if (files.length === 0) {
    console.log('[lint-recurrence] No report files passed — nothing to lint.')
    process.exit(0)
  }
  let worst = 0
  for (const f of files) worst = Math.max(worst, lintFile(f))
  process.exit(worst)
}

module.exports = {
  parseFrontmatter,
  isPublished,
  findLeakedFences,
  lintReport,
  priorReportPath,
  KNOWN_FENCE_MARKERS,
}
