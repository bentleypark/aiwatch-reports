// aiwatch-reports#167 — a correction applied to `archive:monthly:{YYYY-MM}` in KV and never re-synced
// here leaves `_data/YYYY-MM.json`, and so the published body, behind. check-report-drift.js holds the
// body to `_data`; this holds `_data` to the live archive. It needs the network, so it runs on a
// schedule (check-report-archive.yml) instead of in the test workflow.
//
// run: node scripts/check-report-archive.js   (exit 1 on a difference or an unreadable month)
const fs = require('fs')
const path = require('path')
const { checkedMonths } = require('./check-report-drift')

const API_BASE = process.env.AIWATCH_API_BASE || 'https://aiwatch-worker.p2c2kbf.workers.dev'
const ROOT = path.join(__dirname, '..')

// { month: { field: { data, live } } } — differences accepted as they stand, for months whose live
// archive was rebuilt after the snapshot in `_data` was taken. An entry only covers that exact pair of
// values; once it stops describing a difference the check fails until it is removed.
const KNOWN_ARCHIVE_DRIFT = require('./known-archive-drift.json')

const pair = f => JSON.stringify({ data: f.data, live: f.live })

// [{ field, data, live }] — a key missing on one side has `undefined` on that side.
function diffFields(data, live, at = '') {
  const comparable = data && live && typeof data === 'object' && typeof live === 'object'
  if (!comparable) return data === live ? [] : [{ field: at, data, live }]
  const keys = new Set([...Object.keys(data), ...Object.keys(live)])
  return [...keys].flatMap(k => diffFields(data[k], live[k], at ? `${at}.${k}` : k))
}

async function fetchLive(month, doFetch = fetch, base = API_BASE) {
  const url = `${base}/api/report?month=${month}`
  let lastError
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await doFetch(url, { signal: AbortSignal.timeout(30000) })
      if (res.ok) return await res.text()
      lastError = `HTTP ${res.status}`
    } catch (err) {
      lastError = err.message
    }
  }
  throw new Error(lastError)
}

function shown(value) {
  if (value === undefined) return '(absent)'
  const text = JSON.stringify(value)
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

// { unexpected: [{ field, data, live }], stale: [field], acceptedCount } for one month.
function applyKnown(fields, known = {}) {
  const unexpected = fields.filter(f => !known[f.field] || pair(known[f.field]) !== pair(f))
  const stale = Object.keys(known).filter(field => !fields.some(f => f.field === field))
  return { unexpected, stale, acceptedCount: fields.length - unexpected.length }
}

// { compared, accepted: { month: count }, problems: [{ month, summary, lines }] }
async function checkRepo(root, readLive, known = KNOWN_ARCHIVE_DRIFT) {
  const result = { compared: [], accepted: {}, problems: [] }
  for (const month of checkedMonths(root, [])) {
    let live
    try {
      live = JSON.parse(await readLive(month))
    } catch (err) {
      result.problems.push({ month, summary: `${month}: could not read the live archive (${err.message})`, lines: [] })
      continue
    }
    result.compared.push(month)
    const data = JSON.parse(fs.readFileSync(path.join(root, '_data', `${month}.json`), 'utf8'))
    const { unexpected, stale, acceptedCount } = applyKnown(diffFields(data, live), known[month])
    if (acceptedCount) result.accepted[month] = acceptedCount
    if (unexpected.length || stale.length) {
      result.problems.push({
        month,
        summary: `${month}: ${unexpected.length} field(s) in _data differ from the live archive, ${stale.length} stale known-archive-drift entr(ies)`,
        lines: [
          ...unexpected.map(f => `${month} ${f.field}: _data ${shown(f.data)}, live ${shown(f.live)}`),
          ...stale.map(field => `${month} ${field}: in known-archive-drift.json but no longer differs — remove it`),
        ],
      })
    }
  }
  return result
}

if (require.main === module) {
  checkRepo(ROOT, month => fetchLive(month)).then(({ compared, accepted, problems }) => {
    for (const p of problems) {
      console.log(`::error::${p.summary}`)
      for (const line of p.lines) console.log(`  ${line}`)
    }
    console.log(`[check-report-archive] compared: ${compared.join(', ') || 'none'}; accepted: ${Object.entries(accepted).map(([m, n]) => `${m} (${n})`).join(', ') || 'none'}; ${problems.length} month(s) with a problem.`)
    process.exit(problems.length ? 1 : 0)
  })
}

module.exports = { KNOWN_ARCHIVE_DRIFT, diffFields, fetchLive, applyKnown, checkRepo }
