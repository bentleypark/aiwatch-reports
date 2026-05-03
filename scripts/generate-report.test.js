const {
  fmtPercent,
  fmtMs,
  fmtDurationMin,
  competitionRank,
  buildWhy,
  gradeLabel,
  confidence,
  buildScoreTable,
  buildIncidentTable,
  buildUptimeTable,
  buildLatencyTable,
  buildBySourceTable,
  buildBySeverityTable,
  buildByServiceTable,
  buildTimelineDetails,
  buildTopFindings,
  buildSecuritySection,
  monthName,
  lastDayOfMonth,
  nextMonthName,
  replaceTableBody,
  fillTemplate,
} = require('./generate-report')
const assert = require('assert')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${err.message}`)
  }
}

function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

// ── Formatters ───────────────────────────────────────────
console.log('\nfmtPercent')
test('formats two decimals', () => eq(fmtPercent(99.987), '99.99%'))
test('handles null', () => eq(fmtPercent(null), '—'))
test('handles undefined', () => eq(fmtPercent(undefined), '—'))
test('handles NaN', () => eq(fmtPercent(NaN), '—'))

console.log('\nfmtMs')
test('rounds to integer', () => eq(fmtMs(123.7), '124ms'))
test('handles null', () => eq(fmtMs(null), '—'))

console.log('\nfmtDurationMin')
test('returns em dash for 0', () => eq(fmtDurationMin(0), '—'))
test('returns em dash for null', () => eq(fmtDurationMin(null), '—'))
test('formats minutes only', () => eq(fmtDurationMin(45), '45m'))
test('formats whole hours', () => eq(fmtDurationMin(120), '2h'))
test('formats hours + minutes', () => eq(fmtDurationMin(95), '1h 35m'))

// ── Ranking ──────────────────────────────────────────────
console.log('\ncompetitionRank')
test('unique values get sequential ranks', () => {
  const ranks = competitionRank([{ v: 100 }, { v: 90 }, { v: 80 }], x => x.v)
  eq(ranks[0].rankLabel, '1')
  eq(ranks[1].rankLabel, '2')
  eq(ranks[2].rankLabel, '3')
})
test('tied values get "N=" suffix', () => {
  const ranks = competitionRank([{ v: 100 }, { v: 100 }, { v: 99 }], x => x.v)
  eq(ranks[0].rankLabel, '1=')
  eq(ranks[1].rankLabel, '1=')
  eq(ranks[2].rankLabel, '3') // competition ranking: skip 2, next is 3
})
test('three-way tie', () => {
  const ranks = competitionRank([{ v: 86 }, { v: 86 }, { v: 86 }, { v: 75 }], x => x.v)
  eq(ranks[0].rankLabel, '1=')
  eq(ranks[1].rankLabel, '1=')
  eq(ranks[2].rankLabel, '1=')
  eq(ranks[3].rankLabel, '4')
})

// ── Why text ─────────────────────────────────────────────
console.log('\nbuildWhy')
test('zero incidents with uptime', () => {
  const w = buildWhy({ data: { incidents: 0, uptime: 100, avgResolutionMin: null } })
  eq(w, 'Zero incidents, 100.00% uptime')
})
test('zero incidents no uptime data', () => {
  const w = buildWhy({ data: { incidents: 0, uptime: null, avgResolutionMin: null } })
  eq(w, 'Zero incidents')
})
test('many incidents with fast recovery', () => {
  const w = buildWhy({ data: { incidents: 20, uptime: 99.5, avgResolutionMin: 25 } })
  assert.ok(w.includes('20 incidents'), `got: ${w}`)
  assert.ok(w.includes('fast recovery'), `got: ${w}`)
})

// ── Grade + confidence ───────────────────────────────────
console.log('\ngradeLabel')
test('capitalizes grade', () => eq(gradeLabel('excellent'), 'Excellent'))
test('handles null', () => eq(gradeLabel(null), '—'))

console.log('\nconfidence')
test('High when uptime + incidents present', () => {
  eq(confidence({ data: { uptime: 99.5, incidents: 3 } }), 'High')
})
test('Medium when uptime null', () => {
  eq(confidence({ data: { uptime: null, incidents: 3 } }), 'Medium')
})

// ── Date helpers ─────────────────────────────────────────
console.log('\nmonthName')
test('April', () => eq(monthName('2026-04'), 'April'))
test('December', () => eq(monthName('2026-12'), 'December'))

console.log('\nlastDayOfMonth')
test('Feb 2026 (non-leap)', () => eq(lastDayOfMonth('2026-02'), 28))
test('Apr 2026', () => eq(lastDayOfMonth('2026-04'), 30))
test('Mar 2026', () => eq(lastDayOfMonth('2026-03'), 31))

console.log('\nnextMonthName')
test('April → May', () => {
  const n = nextMonthName('2026-04')
  eq(n.name, 'May')
  eq(n.year, 2026)
})
test('December → January (year rollover)', () => {
  const n = nextMonthName('2026-12')
  eq(n.name, 'January')
  eq(n.year, 2027)
})

// ── Table builders ───────────────────────────────────────
const sampleServices = [
  { id: 'cohere', data: { score: 100, grade: 'excellent', uptime: 100.00, incidents: 0, avgResolutionMin: null, avgLatencyMs: 230 } },
  { id: 'openai', data: { score: 88, grade: 'excellent', uptime: 99.60, incidents: 1, avgResolutionMin: 176, avgLatencyMs: 310 } },
  { id: 'claude', data: { score: 59, grade: 'fair', uptime: 97.80, incidents: 9, avgResolutionMin: 216, avgLatencyMs: 280 } },
]
const sampleMeta = {
  cohere: { name: 'Cohere API' },
  openai: { name: 'OpenAI API' },
  claude: { name: 'Claude API' },
}

console.log('\nbuildScoreTable')
test('renders rows sorted by score desc', () => {
  const table = buildScoreTable(sampleServices, sampleMeta)
  const rows = table.split('\n')
  assert.ok(rows[0].includes('| Rank |'), `header missing: ${rows[0]}`)
  assert.ok(rows[2].includes('Cohere API'), `first row not Cohere: ${rows[2]}`)
  assert.ok(rows[2].includes('100'), `score 100 missing: ${rows[2]}`)
  assert.ok(rows[4].includes('Claude API'), `last row not Claude: ${rows[4]}`)
})

console.log('\nbuildIncidentTable')
test('excludes services with zero incidents from the table body', () => {
  const { tableRows, zeroIncLine } = buildIncidentTable(sampleServices, sampleMeta)
  assert.ok(!tableRows.includes('Cohere API'), 'zero-incident service should be excluded')
  assert.ok(tableRows.includes('Claude API'), 'non-zero-incident service should appear')
  assert.ok(zeroIncLine.includes('Cohere API'), 'zero-inc line should list Cohere')
  assert.ok(zeroIncLine.startsWith('**Zero incidents (1 services):**'), `got: ${zeroIncLine}`)
})
test('sorts by incident count desc', () => {
  const { tableRows } = buildIncidentTable(sampleServices, sampleMeta)
  const claudeIdx = tableRows.indexOf('Claude API')
  const openaiIdx = tableRows.indexOf('OpenAI API')
  assert.ok(claudeIdx > 0 && openaiIdx > 0, 'both should appear')
  assert.ok(claudeIdx < openaiIdx, 'Claude (9 inc) should appear before OpenAI (1 inc)')
})

console.log('\nbuildUptimeTable')
test('excludes services with null uptime', () => {
  const services = [
    ...sampleServices,
    { id: 'gemini', data: { score: 86, grade: 'excellent', uptime: null, incidents: 0, avgResolutionMin: null, avgLatencyMs: 200 } },
  ]
  const meta = { ...sampleMeta, gemini: { name: 'Gemini API' } }
  const rows = buildUptimeTable(services, meta)
  assert.ok(!rows.includes('Gemini API'), 'null-uptime service should be excluded')
  assert.ok(rows.includes('Cohere API'), 'real-uptime service should appear')
})
test('excludes hardcoded NO_PUBLIC_UPTIME even if archive returns a value', () => {
  // Defense: if archive wrongly returns uptime for mistral, still exclude from table
  const services = [
    { id: 'mistral', data: { score: 75, grade: 'good', uptime: 99.5, incidents: 7, avgResolutionMin: 6, avgLatencyMs: 420 } },
  ]
  const rows = buildUptimeTable(services, { mistral: { name: 'Mistral API' } })
  eq(rows, '')
})

console.log('\nbuildLatencyTable')
test('sorts by latency asc (fastest first)', () => {
  const table = buildLatencyTable(sampleServices, sampleMeta)
  // Only content rows (header starts with "| Rank", data rows start with "| N |")
  const dataRows = table.split('\n').filter(l => /^\| \d+ \|/.test(l))
  eq(dataRows.length, 3)
  assert.ok(dataRows[0].includes('Cohere API'), `fastest should be Cohere (230ms): ${dataRows[0]}`)
})
test('excludes NO_PROBE services', () => {
  const services = [
    { id: 'bedrock', data: { score: 90, grade: 'excellent', uptime: null, incidents: 0, avgResolutionMin: null, avgLatencyMs: 999 } },
  ]
  const table = buildLatencyTable(services, { bedrock: { name: 'Amazon Bedrock' } })
  assert.ok(!table.includes('Amazon Bedrock'), 'bedrock should be excluded')
})
test('uses competition ranking for ties (not sequential)', () => {
  // Two services tied at 230ms must both render with "N=" suffix; third slot skips to 3.
  const services = [
    { id: 'a', data: { avgLatencyMs: 230 } },
    { id: 'b', data: { avgLatencyMs: 230 } },
    { id: 'c', data: { avgLatencyMs: 310 } },
  ]
  const table = buildLatencyTable(services, { a: { name: 'A' }, b: { name: 'B' }, c: { name: 'C' } })
  const dataRows = table.split('\n').filter(l => l.startsWith('| 1') || l.startsWith('| 2') || l.startsWith('| 3'))
  // With competition ranking and ties at 230ms: "1=", "1=", "3"
  assert.ok(dataRows[0].trim().startsWith('| 1='), `first tied row should be "1=": ${dataRows[0]}`)
  assert.ok(dataRows[1].trim().startsWith('| 1='), `second tied row should be "1=": ${dataRows[1]}`)
  assert.ok(dataRows[2].trim().startsWith('| 3'), `third row should skip to "3": ${dataRows[2]}`)
})

// ── Template filling ─────────────────────────────────────
console.log('\nreplaceTableBody (markdown)')
test('replaces Rank markdown table body', () => {
  const template = `## Foo\n\n| Rank | X |\n|---|---|\n| 1 | |\n\nEnd`
  const out = replaceTableBody(template, 'Foo', '| Rank | X |\n|---|---|\n| 1 | new |')
  assert.ok(out.includes('| 1 | new |'), `got: ${out}`)
})

console.log('\nreplaceTableBody (HTML tbody)')
test('replaces HTML tbody content', () => {
  const template = `## Foo\n\n<table>\n<tbody>\n<tr><td></td></tr>\n</tbody>\n</table>\n`
  const out = replaceTableBody(template, 'Foo', '<tr><td>X</td></tr>')
  assert.ok(out.includes('<tr><td>X</td></tr>'), `got: ${out}`)
  assert.ok(!out.includes('<tr><td></td></tr>'), 'old empty row should be gone')
})
test('section boundary prevents cross-section bleed', () => {
  // Regression: early versions of replaceTableBody walked past ## to the next
  // section's <tbody>, so a markdown-table replacement for "AIWatch Score"
  // silently mutated the HTML tbody in "Incident Summary" instead.
  const template = [
    '## AIWatch Score',
    '',
    '| Rank | X |',
    '|---|---|',
    '| 1 | |',
    '',
    '## Incident Summary',
    '',
    '<tbody>',
    '<tr><td>should not be touched</td></tr>',
    '</tbody>',
  ].join('\n')
  const out = replaceTableBody(template, 'AIWatch Score', '| Rank | X |\n|---|---|\n| 1 | replaced |')
  assert.ok(out.includes('| 1 | replaced |'), `score row should be replaced: ${out}`)
  assert.ok(out.includes('should not be touched'), 'adjacent section tbody must remain untouched')
})

console.log('\nfillTemplate')
test('flips published flag to false', () => {
  const tmpl = `---\npublished: true\n---\n\n[MON] [YEAR]`
  const archive = { services: {}, daysCollected: 0 }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(out.includes('published: false'), `got: ${out}`)
  assert.ok(!out.match(/^published: true$/m), 'true flag should be replaced')
})
test('substitutes header placeholders', () => {
  const tmpl = `[MON] [YEAR] / [YYYY-MM] / [LAST_DAY]`
  const archive = { services: {}, daysCollected: 0 }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(out.includes('April 2026'), `got: ${out}`)
  assert.ok(out.includes('2026-04'), `YYYY-MM missing: ${out}`)
  assert.ok(out.includes('30'), `LAST_DAY missing: ${out}`)
})
test('PUBLISH_MONTH is deterministic (month after the report period), not today', () => {
  // Re-runs on any day must stamp the same "Published: May" for an April report.
  // Deriving from today's date would misleadingly claim "Published: June" on a June catch-up.
  const tmpl = `**Published**: [PUBLISH_MONTH] [YEAR]`
  const archive = { services: {}, daysCollected: 0 }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(out.includes('**Published**: May 2026'), `expected "May 2026", got: ${out}`)
})
test('NEXT_MONTH resolves year rollover correctly', () => {
  const tmpl = `**Next report**: [NEXT_MONTH] [YEAR]`
  const archive = { services: {}, daysCollected: 0 }
  const out = fillTemplate(tmpl, '2026-12', archive, {})
  assert.ok(out.includes('January'), `expected "January" after December: ${out}`)
})

// ── Security section (refs aiwatch#290 / aiwatch#291) ───────────────
console.log('\nbuildBySourceTable')
test('renders both sources when both fired', () => {
  const out = buildBySourceTable({ osv: 5, hackernews: 3 })
  assert.ok(out.includes('OSV.dev | 5'), `osv row: ${out}`)
  assert.ok(out.includes('Hacker News | 3'), `hn row: ${out}`)
})
test('hides zero-count rows so the table stays tight', () => {
  const out = buildBySourceTable({ osv: 5, hackernews: 0 })
  assert.ok(out.includes('OSV.dev | 5'))
  assert.ok(!out.includes('Hacker News'), `HN row should be hidden when count=0: ${out}`)
})
test('returns empty string when no source has alerts', () => {
  eq(buildBySourceTable({ osv: 0, hackernews: 0 }), '')
})

console.log('\nbuildBySeverityTable')
test('always shows all four severity buckets including zeros', () => {
  const out = buildBySeverityTable({ critical: 0, high: 2, medium: 5, low: 1 })
  assert.ok(out.includes('Critical | High | Medium | Low'), `header: ${out}`)
  assert.ok(out.includes('0 | 2 | 5 | 1'), `row: ${out}`)
})
test('returns empty string when all severities are zero', () => {
  eq(buildBySeverityTable({ critical: 0, high: 0, medium: 0, low: 0 }), '')
})
test('handles missing severity keys (treated as zero)', () => {
  const out = buildBySeverityTable({ high: 3 })
  assert.ok(out.includes('0 | 3 | 0 | 0'), `row: ${out}`)
})

console.log('\nbuildByServiceTable')
test('sorts by count desc and caps at 5 by default', () => {
  const counts = { a: 1, b: 5, c: 3, d: 7, e: 2, f: 6, g: 4 }
  const out = buildByServiceTable(counts)
  // Should include top 5: d(7), f(6), b(5), g(4), c(3)
  assert.ok(out.indexOf('d | 7') < out.indexOf('f | 6'), 'highest count first')
  assert.ok(out.indexOf('f | 6') < out.indexOf('c | 3'), 'descending throughout')
  assert.ok(!out.includes('a | 1'), 'should drop entries beyond limit')
  assert.ok(!out.includes('e | 2'), 'should drop entries beyond limit')
})
test('returns empty string when byService has only zero-count entries', () => {
  eq(buildByServiceTable({ a: 0, b: 0 }), '')
})
test('returns empty string for missing byService input', () => {
  eq(buildByServiceTable(undefined), '')
})

console.log('\nfmtIso edge cases')
test('returns em dash on null/undefined', () => {
  const { fmtIso } = require('./generate-report')
  eq(fmtIso(null), '—')
  eq(fmtIso(undefined), '—')
})
test('returns em dash for non-string objects (defensive against schema drift)', () => {
  const { fmtIso } = require('./generate-report')
  // Without sanitization, String({}) leaks "[object Object]" into a markdown table cell.
  eq(fmtIso({}), '—')
})
test('returns em dash for malformed dates so unsanitized text never hits a table cell', () => {
  const { fmtIso } = require('./generate-report')
  eq(fmtIso('not-a-date'), '—')
  eq(fmtIso('2026-04'), '—')   // partial date — no day
  eq(fmtIso('2026'), '—')      // year only
})

console.log('\nbuildTimelineDetails')
test('renders all stages in order with severity + fix version', () => {
  const out = buildTimelineDetails([
    { stage: 'detected', at: '2026-04-15T10:00:00Z', severity: 'high' },
    { stage: 'severity_changed', at: '2026-04-18T12:00:00Z', severity: 'critical' },
    { stage: 'fix_released', at: '2026-04-22T08:00:00Z', severity: 'critical', fixedVersion: '1.42.0' },
  ])
  assert.ok(out.includes('<details'), `wraps in details: ${out}`)
  assert.ok(out.includes('detected | 2026-04-15 | high | —'), `detected row: ${out}`)
  assert.ok(out.includes('fix_released | 2026-04-22 | critical | 1.42.0'), `fix row: ${out}`)
})
test('returns empty string when timeline is empty', () => {
  eq(buildTimelineDetails([]), '')
})
test('returns empty string when timeline is undefined', () => {
  eq(buildTimelineDetails(undefined), '')
})
test('renders em dash when severity or fix version is missing', () => {
  const out = buildTimelineDetails([{ stage: 'detected', at: '2026-04-15' }])
  assert.ok(out.includes('detected | 2026-04-15 | — | —'), `missing fields: ${out}`)
})
test('renders em dash for missing stage so undefined never appears in a table cell', () => {
  const out = buildTimelineDetails([{ at: '2026-04-15' }])
  assert.ok(!out.includes('undefined'), `stage fallback: ${out}`)
  assert.ok(out.includes('— | 2026-04-15 | — | —'), `stage = em dash: ${out}`)
})

console.log('\nbuildTopFindings')
test('renders OSV finding with timeline expansion', () => {
  const out = buildTopFindings([{
    title: 'GHSA-1234 langchain SSRF', url: 'https://example.com/x',
    source: 'osv', severity: 'high', service: 'langchain',
    detectedAt: '2026-04-10T12:00:00Z',
    timeline: [{ stage: 'detected', at: '2026-04-10T12:00:00Z', severity: 'high' }],
  }])
  assert.ok(out.includes('### Top Findings'), `top heading: ${out}`)
  assert.ok(out.includes('1. [GHSA-1234 langchain SSRF](https://example.com/x)'), `link title: ${out}`)
  assert.ok(out.includes('`high`'), `severity badge: ${out}`)
  assert.ok(out.includes('**Affected:** langchain'), `affected: ${out}`)
  assert.ok(out.includes('<details'), `timeline details: ${out}`)
})
test('omits timeline section for HN findings even if timeline field set (defensive)', () => {
  const out = buildTopFindings([{
    title: 'HN post', url: 'https://news.ycombinator.com/item?id=1',
    source: 'hackernews', severity: 'medium', detectedAt: '2026-04-12',
    timeline: [{ stage: 'detected', at: '2026-04-12' }], // shouldn't happen but be safe
  }])
  assert.ok(!out.includes('<details'), `HN must never render timeline: ${out}`)
})
test('renders unrated badge when severity missing', () => {
  const out = buildTopFindings([{
    title: 'foo', url: 'https://example.com',
    source: 'osv', detectedAt: '2026-04-10',
  }])
  assert.ok(out.includes('`unrated`'), `unrated fallback: ${out}`)
})
test('omits affected line when service missing', () => {
  const out = buildTopFindings([{
    title: 'foo', url: 'https://example.com',
    source: 'hackernews', detectedAt: '2026-04-10',
  }])
  assert.ok(!out.includes('**Affected:**'), `affected omitted when service is null: ${out}`)
})
test('returns empty string when findings is empty array', () => {
  eq(buildTopFindings([]), '')
})
test('renders a 15-item input as-is — the worker pre-caps at 10 and pre-sorts; generator does not duplicate', () => {
  // Documents the contract: this function trusts the upstream cap + sort. If a future
  // refactor adds slicing/sorting here it would silently drop the worker's authoritative ordering.
  const findings = Array.from({ length: 15 }, (_, i) => ({
    title: `f${i}`, url: `https://example.com/${i}`,
    source: 'osv', severity: 'low', service: 'svc', detectedAt: '2026-04-10',
  }))
  const out = buildTopFindings(findings)
  // All 15 numbered headings should be present
  for (let i = 1; i <= 15; i++) {
    assert.ok(out.includes(`#### ${i}.`), `index ${i} should appear: missing in ${out.slice(0, 100)}…`)
  }
})

console.log('\nbuildSecuritySection')
test('returns empty string when security is null', () => {
  eq(buildSecuritySection(null), '')
})
test('returns empty string when totalAlerts is 0', () => {
  eq(buildSecuritySection({
    totalAlerts: 0, bySource: { osv: 0, hackernews: 0 },
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, byService: {}, topFindings: [],
  }), '')
})
test('warns + omits when totalAlerts is missing on a non-empty archive (malformed input)', () => {
  const origWarn = console.warn
  const warnings = []
  console.warn = (...args) => { warnings.push(args.join(' ')) }
  try {
    const out = buildSecuritySection({
      // totalAlerts deliberately omitted; other fields populated
      bySource: { osv: 1, hackernews: 0 }, bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
      byService: { foo: 1 }, topFindings: [{ title: 't', url: 'u', source: 'osv', detectedAt: '2026-04-01' }],
    })
    eq(out, '')
    assert.ok(warnings.some(w => w.includes('totalAlerts missing')), `warning emitted: ${JSON.stringify(warnings)}`)
  } finally {
    console.warn = origWarn
  }
})
test('renders full section when totalAlerts > 0', () => {
  const out = buildSecuritySection({
    totalAlerts: 8,
    bySource: { osv: 5, hackernews: 3 },
    bySeverity: { critical: 1, high: 2, medium: 4, low: 1 },
    byService: { 'OpenAI Python SDK': 3, 'langchain': 2 },
    topFindings: [{
      title: 'GHSA-x foo', url: 'https://osv.dev/GHSA-x', source: 'osv',
      severity: 'critical', service: 'openai', detectedAt: '2026-04-01',
      timeline: [{ stage: 'detected', at: '2026-04-01', severity: 'critical' }],
    }],
  })
  assert.ok(out.startsWith('## Security Alerts'), `heading first: ${out.slice(0, 50)}`)
  assert.ok(out.includes('**Total alerts:** 8'), `total: ${out}`)
  assert.ok(out.includes('OSV.dev | 5'), `bySource rendered`)
  assert.ok(out.includes('Critical | High | Medium | Low'), `bySeverity rendered`)
  assert.ok(out.includes('OpenAI Python SDK | 3'), `byService rendered`)
  assert.ok(out.includes('### Top Findings'), `top findings rendered`)
  assert.ok(out.endsWith('---\n'), `terminating separator: ${JSON.stringify(out.slice(-10))}`)
})
test('omits subsections that have no data but still renders the heading + total', () => {
  const out = buildSecuritySection({
    totalAlerts: 2,
    bySource: { osv: 2, hackernews: 0 }, // only OSV
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, // no severities tagged
    byService: {}, // no service attribution
    topFindings: [], // no top findings
  })
  assert.ok(out.includes('**Total alerts:** 2'))
  assert.ok(out.includes('OSV.dev | 2'))
  // Note: the intro `> Note:` text mentions "Hacker News" as a data source — that's expected.
  // Test the absence of the table-row form ("Hacker News | <n>") instead.
  assert.ok(!/Hacker News \| \d/.test(out), 'HN table row should be hidden when count=0')
  assert.ok(!out.includes('**By severity**'), 'severity section omitted when all zero')
  assert.ok(!out.includes('**Most affected services**'), 'services section omitted when empty')
  assert.ok(!out.includes('### Top Findings'), 'top findings omitted when empty')
})

// ── fillTemplate × security ─────────────────────────────────────────
console.log('\nfillTemplate × security')
test('inserts the security block when archive.security has data', () => {
  const tmpl = `intro\n\n<!-- SECURITY_SECTION -->\n\n## Notable Incidents\noutro`
  const archive = {
    services: {}, daysCollected: 0,
    security: {
      totalAlerts: 1,
      bySource: { osv: 1, hackernews: 0 },
      bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
      byService: { langchain: 1 },
      topFindings: [{
        title: 'foo', url: 'https://example.com', source: 'osv',
        severity: 'high', service: 'langchain', detectedAt: '2026-04-10',
      }],
    },
  }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(out.includes('## Security Alerts'), `heading: ${out}`)
  assert.ok(out.includes('## Notable Incidents'), 'notable incidents preserved')
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'), 'placeholder removed')
})
test('strips the placeholder cleanly when archive.security is null', () => {
  const tmpl = `intro\n\n<!-- SECURITY_SECTION -->\n\n## Notable Incidents\noutro`
  const archive = { services: {}, daysCollected: 0, security: null }
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'), 'placeholder removed')
  assert.ok(!out.includes('## Security Alerts'), 'no heading injected')
  assert.ok(!/\n---\n+\n---\n/.test(out), 'no double horizontal rules introduced')
})
test('strips the placeholder cleanly when archive.security is missing entirely', () => {
  const tmpl = `intro\n\n<!-- SECURITY_SECTION -->\n\n## Notable Incidents\noutro`
  const archive = { services: {}, daysCollected: 0 } // no security key
  const out = fillTemplate(tmpl, '2026-04', archive, {})
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'))
  assert.ok(!out.includes('## Security Alerts'))
})

// ── Summary ──────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
