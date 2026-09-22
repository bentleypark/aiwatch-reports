#!/usr/bin/env node
// update-index.js — Insert / refresh the top-level `index.md` entry for a given
// month. Called by `.github/workflows/generate-report.yml` after the report
// draft + archive snapshot are produced (#15) so the front-page list stays in
// step with what's actually published — no more hand-editing on first-of-month.
//
// Usage: node scripts/update-index.js 2026-04
//
// Reads `_data/{MONTH}.json` (already committed by the same workflow run via
// scripts/fetch-archive.sh) for `services` count + `daysCollected`. Full months
// render their span ("Apr 1–30"). A partial window renders a span only for the
// onboarding month, where end-alignment is a fact rather than an inference
// ("Mar 20–31"); after that a shortfall renders as a bare count. See
// `buildPeriodSuffix` for why (#113).
//
// Idempotent: if a line for the same month already exists in `## Reports`,
// it's replaced rather than duplicated. Re-running the workflow for the same
// month produces no diff if the archive numbers haven't shifted.

const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.join(__dirname, '..')
const INDEX_PATH = path.join(REPO_ROOT, 'index.md')
const DATA_DIR = path.join(REPO_ROOT, '_data')

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_ABBR = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function lastDayOfMonth(year, month) {
  // month is 1-12. JS Date with day=0 of next month gives last day of current.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function parseMonth(arg) {
  if (!arg || !/^\d{4}-(0[1-9]|1[0-2])$/.test(arg)) {
    throw new Error(`Invalid month: expected YYYY-MM, got "${arg}"`)
  }
  const [yearStr, monthStr] = arg.split('-')
  return { year: Number(yearStr), month: Number(monthStr), period: arg }
}

// AIWatch began monitoring partway through 2026-03, so that ONE month's window is genuinely
// end-aligned and its span is known (Mar 20–31) — the case end-alignment was written for. Every
// month after it was monitored end to end, so a short `daysCollected` there is a LOST day, not a
// late start, and the archive does not say WHICH day: `daysCollected` is a bare count (#113).
// The two cases must not render alike — one knows its span, the other cannot state one.
const MONITORING_START = { year: 2026, month: 3 }

// Exactly the start month — no earlier one is claimed. A month before monitoring began has no
// report and no archive; were one ever passed, end-aligning it would be a weaker inference than
// the one #113 removed, so it takes the bare-count path with everything else.
function isOnboardingMonth(year, month) {
  return year === MONITORING_START.year && month === MONITORING_START.month
}

function buildPeriodSuffix(year, month, daysCollected) {
  const lastDay = lastDayOfMonth(year, month)
  const abbr = MONTH_ABBR[month]
  // A window covering the whole month reads its span off the calendar. `>=` because an over-long
  // count is still whole-month coverage.
  if (daysCollected >= lastDay) {
    return `${daysCollected}-day monitoring period (${abbr} 1–${lastDay})`
  }
  // A non-positive count names no days at all, so it cannot be end-aligned either: without this
  // guard, 0 renders "Mar 32–31" (`readArchiveSnapshot` defaults a missing count to 0, and main()
  // only rejects it when `services` is 0 too). Fall through to the bare count, which degrades
  // honestly.
  if (daysCollected > 0 && isOnboardingMonth(year, month)) {
    // End-aligned: monitoring started mid-month, so the collected days really are the last N.
    // The two guards above bound `daysCollected` to (0, lastDay), so this cannot go below 1.
    const startDay = lastDay - daysCollected + 1
    return `${daysCollected}-day monitoring period (${abbr} ${startDay}–${lastDay})`
  }
  // Post-onboarding shortfall. No start day can be stated, and "monitored" would overclaim too:
  // AIWatch ran all month; what is short is the count of days whose counter read back.
  return `${daysCollected} of ${lastDay} days with uptime data`
}

function buildEntry({ period, year, month, services, daysCollected }) {
  const fullName = `${MONTH_NAMES[month]} ${year}`
  const periodSuffix = buildPeriodSuffix(year, month, daysCollected)
  return `- [**${fullName}**](${period}/) — ${services} services, ${periodSuffix}`
}

function readArchiveSnapshot(period) {
  const snapshotPath = path.join(DATA_DIR, `${period}.json`)
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${snapshotPath}. Run scripts/fetch-archive.sh ${period} first.`)
  }
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  } catch (err) {
    // Re-throw with the file path so the workflow log identifies the bad snapshot
    // directly instead of just "Unexpected token …".
    throw new Error(`Snapshot ${snapshotPath} is not valid JSON: ${err.message}`)
  }
  // The Worker archive shape (MonthlyArchive in worker/src/monthly-archive.ts)
  // has `services` as a Record<svcId, MonthlyServiceData>. Count keys, not array length.
  const services = raw.services && typeof raw.services === 'object'
    ? Object.keys(raw.services).length
    : 0
  const daysCollected = typeof raw.daysCollected === 'number' ? raw.daysCollected : 0
  return { services, daysCollected }
}

/**
 * Insert or replace the index entry for `period` in the markdown body.
 * Pure function — deterministic in (body, period, entry); tested in isolation.
 *
 * @param {string} body  Raw `index.md` content
 * @param {string} period  Target month, e.g. "2026-04"
 * @param {string} newEntry  The full bullet line for the entry
 * @returns {string} Updated body
 */
function upsertIndexEntry(body, period, newEntry) {
  const lines = body.split('\n')
  const reportsIdx = lines.findIndex((l) => l.trim() === '## Reports')
  if (reportsIdx === -1) {
    throw new Error('index.md missing "## Reports" heading — cannot determine insertion point')
  }

  // Match existing entry by the period URL so we don't accidentally edit
  // a paragraph that mentions the month name in passing.
  const periodUrlPattern = new RegExp(`\\]\\(${period}/\\)`)
  const existingIdx = lines.findIndex((l, i) => i > reportsIdx && periodUrlPattern.test(l))

  if (existingIdx !== -1) {
    // Replace in place — preserves whatever ordering the maintainer arranged.
    lines[existingIdx] = newEntry
    return lines.join('\n')
  }

  // Insert at top of the list (newest-first ordering, matches existing convention).
  // Skip exactly one blank line after `## Reports` if present — standard markdown
  // spacing — so the new entry sits one blank line below the heading regardless of
  // whether the list is empty or already has older entries.
  let insertAt = reportsIdx + 1
  if (insertAt < lines.length && lines[insertAt].trim() === '') insertAt++
  return [
    ...lines.slice(0, insertAt),
    newEntry,
    ...lines.slice(insertAt),
  ].join('\n')
}

function main() {
  const arg = process.argv[2]
  const { year, month, period } = parseMonth(arg)
  const { services, daysCollected } = readArchiveSnapshot(period)

  if (services === 0 && daysCollected === 0) {
    // Empty snapshot is almost certainly a corrupt archive or a backfill run
    // before the cron landed. Failing loud surfaces it to the workflow log
    // rather than producing a misleading "0 services, 0-day" entry.
    throw new Error(`Snapshot for ${period} reports 0 services and 0 days — refusing to write a misleading entry`)
  }

  const newEntry = buildEntry({ period, year, month, services, daysCollected })
  const body = fs.readFileSync(INDEX_PATH, 'utf8')
  const updated = upsertIndexEntry(body, period, newEntry)

  if (updated === body) {
    console.log(`[update-index] No changes — entry for ${period} already up to date.`)
    return
  }

  fs.writeFileSync(INDEX_PATH, updated)
  // Echo the rendered suffix rather than restating "N-day window" — that phrasing asserts on the
  // console exactly the span the page now refuses to claim for a short month (#113).
  console.log(`[update-index] ✓ ${period}: ${services} services, ${buildPeriodSuffix(year, month, daysCollected)}`)
}

if (require.main === module) {
  try {
    main()
  } catch (err) {
    console.error(`[update-index] ${err.message}`)
    process.exit(1)
  }
}

module.exports = {
  parseMonth,
  lastDayOfMonth,
  buildPeriodSuffix,
  buildEntry,
  upsertIndexEntry,
}
