// aiwatch-reports#167 — a published report's ranking and Incident Summary must still say what its own
// `_data/YYYY-MM.json` says. An archive correction re-synced into `_data` without the body (2026-09
// Kimi) is the drift this catches. The expected rows come from the generator's own table builders,
// so the check has no second copy of the ranking or formatting rules.
//
// Rows are compared without the service name: names change between months (Groq Cloud → GroqCloud),
// and a published month keeps the names it shipped with.
//
// run: node scripts/check-report-drift.js   (exit 1 on drift)
const fs = require('fs')
const path = require('path')
const { buildScoreTable, buildIncidentTable, servicesFromArchive } = require('./generate-report')
const { parseTableGroups } = require('./generate-summary')

const EXCLUDED_MONTHS = ['2026-03']
// 2026-06 ranks both confidence tiers in one table (aiwatch-reports#106 split them later), so only its
// rank column differs from today's builder.
const RANK_UNCHECKED_MONTHS = ['2026-06']

// A row where the archive, not the body, is wrong. Each entry names the issue that corrects the
// archive; once `_data` is fixed the entry stops matching and the check fails until it is removed.
const KNOWN_DRIFT = []

function section(md, heading) {
  const start = md.search(new RegExp(`^## ${heading}`, 'm'))
  if (start < 0) return ''
  const next = md.slice(start + 3).search(/^## /m)
  return next < 0 ? md.slice(start) : md.slice(start, start + 3 + next)
}

function incidentCountOf(why) {
  const m = /^(Zero|\d+) incidents?\b/.exec(why || '')
  if (!m) return '?'
  return m[1] === 'Zero' ? '0' : m[1]
}

// [{ name, key }] — key is what is compared.
function scoreRows(md, { rank = true } = {}) {
  return parseTableGroups(md, 'AIWatch Score').flatMap(table =>
    table.map(r => ({ name: r.Service, key: [...(rank ? [r.Rank] : []), r.Score, r.Grade, incidentCountOf(r.Why)].join(' | ') })))
}

function incidentRows(md) {
  const rows = /<tr><td>(.*?)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><\/tr>/g
  return [...section(md, 'Incident Summary').matchAll(rows)].map(m => ({ name: m[1], key: m.slice(2).join(' | ') }))
}

// { published, expected }, each { scores, incidents }: the rows of one month as the body states them
// and as its _data rebuilds them.
function monthRows(md, archive, month, rank = !RANK_UNCHECKED_MONTHS.includes(month)) {
  const services = servicesFromArchive(archive)
  const built = `## AIWatch Score\n\n${buildScoreTable(services, {}, month)}\n\n## Incident Summary\n\n${buildIncidentTable(services, {}).tableRows}\n`
  const rows = text => ({ scores: scoreRows(text, { rank }), incidents: incidentRows(text) })
  return { published: rows(md), expected: rows(built) }
}

// Rows present on one side more often than on the other.
function multisetDiff(published, expected) {
  const counts = new Map()
  for (const r of published) counts.set(r.key, (counts.get(r.key) || 0) + 1)
  for (const r of expected) counts.set(r.key, (counts.get(r.key) || 0) - 1)
  const take = (rows, sign) => {
    const left = new Map(counts)
    return rows.filter(r => {
      const n = left.get(r.key) * sign
      if (n > 0) { left.set(r.key, left.get(r.key) - sign); return true }
      return false
    })
  }
  return { onlyPublished: take(published, 1), onlyExpected: take(expected, -1) }
}

function isKnown(known, month, table, publishedKey, expectedKey) {
  return known.some(k => k.month === month && k.table === table && k.published === publishedKey && k.expected === expectedKey)
}

// [{ table, published?, expected? }] for one month; [] when the body matches its data.
function findDrift(md, archive, month, known = KNOWN_DRIFT) {
  const { published, expected } = monthRows(md, archive, month)
  const drift = []
  for (const table of ['scores', 'incidents']) {
    const { onlyPublished, onlyExpected } = multisetDiff(published[table], expected[table])
    const unmatched = [...onlyExpected]
    for (const p of onlyPublished) {
      const i = unmatched.findIndex(e => isKnown(known, month, table, p.key, e.key))
      if (i >= 0) unmatched.splice(i, 1)
      else drift.push({ table, published: p })
    }
    for (const e of unmatched) drift.push({ table, expected: e })
  }
  return drift
}

// KNOWN_DRIFT entries that no longer describe any row: the archive was fixed, so the entry goes.
function staleKnownDrift(root, known = KNOWN_DRIFT) {
  return known.filter(k => {
    const md = readMonth(root, k.month)
    if (!md) return true
    const archive = JSON.parse(fs.readFileSync(path.join(root, '_data', `${k.month}.json`), 'utf8'))
    const { published, expected } = monthRows(md, archive, k.month)
    return !published[k.table].some(r => r.key === k.published) || !expected[k.table].some(r => r.key === k.expected)
  })
}

function readMonth(root, month) {
  const file = path.join(root, month, 'index.md')
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
}

function checkedMonths(root) {
  return fs.readdirSync(root)
    .filter(d => /^\d{4}-\d{2}$/.test(d) && !EXCLUDED_MONTHS.includes(d))
    .filter(d => readMonth(root, d) && fs.existsSync(path.join(root, '_data', `${d}.json`)))
    .sort()
}

function checkRepo(root, known = KNOWN_DRIFT) {
  const problems = []
  for (const month of checkedMonths(root)) {
    const archive = JSON.parse(fs.readFileSync(path.join(root, '_data', `${month}.json`), 'utf8'))
    for (const d of findDrift(readMonth(root, month), archive, month, known)) {
      problems.push(d.published
        ? `${month} ${d.table}: published "${d.published.name} | ${d.published.key}" is not in _data`
        : `${month} ${d.table}: _data has "${d.expected.name} | ${d.expected.key}", missing from the body`)
    }
  }
  for (const k of staleKnownDrift(root, known)) {
    problems.push(`KNOWN_DRIFT ${k.month} ${k.table} (${k.issue}) no longer matches — remove it`)
  }
  return problems
}

if (require.main === module) {
  const problems = checkRepo(path.join(__dirname, '..'))
  for (const p of problems) console.log(`::error::${p}`)
  console.log(problems.length ? `[check-report-drift] ${problems.length} problem(s).` : '[check-report-drift] every checked month matches its _data.')
  process.exit(problems.length ? 1 : 0)
}

module.exports = { EXCLUDED_MONTHS, RANK_UNCHECKED_MONTHS, KNOWN_DRIFT, incidentCountOf, scoreRows, incidentRows, monthRows, findDrift, staleKnownDrift, checkedMonths, checkRepo }
