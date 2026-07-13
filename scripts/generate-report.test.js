const {
  fmtPercent,
  fmtMs,
  fmtDurationMin,
  competitionRank,
  buildWhy,
  gradeLabel,
  confidence,
  uptimeSourceLabel,
  buildRankingNote,
  isStaleSource,
  isRecentlyAdded,
  buildScoreTable,
  buildIncidentTable,
  officialUptimeFor,
  findUptimeInconsistencies,
  emitUptimeWarnings,
  buildStaleSourceCaveat,
  buildUptimeTable,
  buildUptimeExclusionNote,
  kramdownAnchor,
  anchorForHeading,
  buildLatencyTable,
  buildBySourceTable,
  buildBySeverityTable,
  buildByServiceTable,
  buildTimelineDetails,
  buildTopFindings,
  buildSecuritySection,
  buildDetectionSection,
  buildComponentReliabilitySection,
  buildTrendSection,
  fmtLeadMin,
  monthName,
  lastDayOfMonth,
  nextMonthName,
  replaceTableBody,
  fillTemplate,
} = require('./generate-report')
const assert = require('assert')
const charts = require('./generate-charts')

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
test('zero incidents with uptime (official service)', () => {
  const w = buildWhy({ data: { incidents: 0, uptime: 100, avgResolutionMin: null } }, 'cohere')
  eq(w, 'Zero incidents, 100.00% uptime')
})
test('zero incidents no uptime data', () => {
  const w = buildWhy({ data: { incidents: 0, uptime: null, avgResolutionMin: null } }, 'cohere')
  eq(w, 'Zero incidents')
})
test('legacy archive: a NO_PUBLIC_UPTIME service must NOT assert "Zero incidents, X% uptime" (#29)', () => {
  // No `officialUptime` field → legacy archive → the maintained set is the only evidence we have.
  // The "30-day" qualifier is gone: status pages publish over different windows (aiwatch#951).
  const w = buildWhy({ data: { incidents: 0, uptime: 99.5, avgResolutionMin: null } }, 'perplexity')
  eq(w, 'Zero incidents (no published uptime)')
})
// aiwatch#951 — the "Why" text cites the OFFICIAL figure, never the daily-counter `uptime`.
test('modern archive: cites the official figure, not the measured one', () => {
  const w = buildWhy({ id: 'chatgpt', data: { incidents: 0, uptime: 72.78, officialUptime: 99.83, avgResolutionMin: null } }, 'chatgpt')
  eq(w, 'Zero incidents, 99.83% uptime')
})
test('modern archive: a service publishing no official uptime never quotes its measured 100%', () => {
  // The bug: OpenRouter read "Zero incidents, 100.00% uptime" beside a Score of 80 that was rescaled
  // over /60 because it has no uptime at all. Impossible under the formula (floor 80 WITH uptime).
  const w = buildWhy({ id: 'openrouter', data: { incidents: 0, uptime: 100, officialUptime: null, avgResolutionMin: null } }, 'openrouter')
  eq(w, 'Zero incidents (no published uptime)')
})
test('distinguishes "provider publishes none" from "we have no figure"', () => {
  const noFigure = buildWhy({ id: 'cohere', data: { incidents: 0, uptime: null, avgResolutionMin: null } }, 'cohere')
  eq(noFigure, 'Zero incidents')  // legacy archive, missing counters — say nothing about the provider
  const publishesNone = buildWhy({ id: 'stability', data: { incidents: 0, uptime: 100, officialUptime: null, avgResolutionMin: null } }, 'stability')
  eq(publishesNone, 'Zero incidents (no published uptime)')
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

console.log('\nconfidence (analyzer signal — still used by generate-summary)')
test('High when uptime + incidents present', () => {
  eq(confidence({ data: { uptime: 99.5, incidents: 3 } }), 'High')
})
test('Medium when uptime null', () => {
  eq(confidence({ data: { uptime: null, incidents: 3 } }), 'Medium')
})

console.log('\nuptimeSourceLabel (#29, rewritten for aiwatch#951)')
test('Official when the archive carries a status-page figure', () => {
  eq(uptimeSourceLabel({ id: 'cohere', data: { officialUptime: 100 } }), 'Official')
})
test('No official uptime when the archive says the provider publishes none', () => {
  eq(uptimeSourceLabel({ id: 'openrouter', data: { officialUptime: null, uptime: 100 } }), 'No official uptime')
  eq(uptimeSourceLabel({ id: 'stability', data: { officialUptime: null, uptime: 100 } }), 'No official uptime')
})
// The label used to come from a hand-maintained set, which had drifted in BOTH directions.
test('aiwatch#951: Mistral and Perplexity publish real uptime — no longer mislabelled', () => {
  eq(uptimeSourceLabel({ id: 'mistral', data: { officialUptime: 99.559 } }), 'Official')
  eq(uptimeSourceLabel({ id: 'perplexity', data: { officialUptime: 100 } }), 'Official')
})
test('aiwatch#951: bedrock/azureopenai stay excluded even if a stale archive carries a value', () => {
  eq(uptimeSourceLabel({ id: 'bedrock', data: { officialUptime: 100 } }), 'No official uptime')
  eq(uptimeSourceLabel({ id: 'azureopenai', data: { officialUptime: 100 } }), 'No official uptime')
})
test('legacy archive (no officialUptime field) falls back to the maintained set', () => {
  eq(uptimeSourceLabel({ id: 'perplexity', data: { uptime: 99.5 } }), 'No official uptime')
  eq(uptimeSourceLabel({ id: 'cohere', data: { uptime: 100 } }), 'Official')
})

console.log('\nbuildRankingNote (#29)')
test('names the score-withheld services excluded from the ranking', () => {
  const services = [
    { id: 'modal', data: { score: 97 } },
    { id: 'bedrock', data: { score: 90 } },
    { id: 'azureopenai', data: { score: 90 } },
  ]
  const meta = { modal: { name: 'Modal' }, bedrock: { name: 'Amazon Bedrock' }, azureopenai: { name: 'Azure OpenAI' } }
  const note = buildRankingNote(services, meta)
  assert.ok(note.includes('1 of 3 services ranked'), `got: ${note}`)
  assert.ok(note.includes('Amazon Bedrock and Azure OpenAI'), `got: ${note}`)
  assert.ok(note.includes('excluded from this ranking'), `got: ${note}`)
})
test('returns empty string when nothing is excluded', () => {
  const services = [{ id: 'modal', data: { score: 97 } }, { id: 'cohere', data: { score: 89 } }]
  eq(buildRankingNote(services, { modal: { name: 'Modal' }, cohere: { name: 'Cohere API' } }), '')
})

// #591 — stale-source services are excluded from the Score ranking (frozen feed inflates the Score).
console.log('\nisStaleSource (#591)')
test('archive flag drives staleness; STALE_SOURCE constant is empty since aiwatch#618', () => {
  eq(isStaleSource({ id: 'openai', data: { incidentSourceStale: true } }), true)   // archive flag
  eq(isStaleSource({ id: 'deepseek', data: { incidentSourceStale: true } }), true) // May archive: flag still set → stale
  eq(isStaleSource({ id: 'deepseek', data: {} }), false)                           // #618 — removed from STALE_SOURCE; absent flag ⇒ not stale (June+)
  eq(isStaleSource({ id: 'cohere', data: {} }), false)                             // neither
})

console.log('\naiwatch#993 — the ranking table and the trend use the SAME calendar-month score')
test('ranking table shows monthlyScore, matching what toMonthEntry feeds Notable Movers', () => {
  // The report normalizes at load (generate-report.js line ~959) via charts.resolveMonthlyScore, so
  // buildScoreTable receives the monthly value. Reproduce that mapping and assert the table shows 61
  // (monthly), not 44 (the build-day snapshot) — and that toMonthEntry hands the trend the same 61,
  // so the same month can never show two different scores.
  const archive = { services: { deepgram: { score: 44, grade: 'Degrading', monthlyScore: 61, monthlyGrade: 'Fair', uptime: 90, incidents: 6, avgResolutionMin: 456, officialUptime: 99 } } }
  const services = Object.entries(archive.services).map(([id, data]) => {
    const { score, grade } = charts.resolveMonthlyScore(data)
    return { id, data: { ...data, score, grade } }
  })
  const table = buildScoreTable(services, { deepgram: { name: 'Deepgram' } }, '2026-06')
  assert.ok(/\| 61 \|/.test(table), `ranking table must show the monthly score 61: ${table}`)
  assert.ok(!/\| 44 \|/.test(table), `must NOT show the snapshot score 44: ${table}`)

  const entry = charts.toMonthEntry('2026-06', archive)
  assert.strictEqual(entry.services.deepgram.score, 61, 'trend/Movers use the same monthly score')
})

console.log('\nbuildScoreTable + buildRankingNote — stale exclusion (#591)')
test('buildScoreTable drops a stale service from the ranking', () => {
  const services = [
    { id: 'cohere', data: { score: 89, grade: 'good', uptime: 100, incidents: 0, avgResolutionMin: null } },
    { id: 'deepseek', data: { score: 88, grade: 'good', uptime: 99.92, incidents: 3, avgResolutionMin: 18, incidentSourceStale: true } },
  ]
  const meta = { cohere: { name: 'Cohere API' }, deepseek: { name: 'DeepSeek API' } }
  const table = buildScoreTable(services, meta)
  assert.ok(table.includes('Cohere API'), 'non-stale service still ranked')
  assert.ok(!table.includes('DeepSeek API'), 'stale service dropped from the Score table')
})
test('buildRankingNote names stale + score-withheld in separate clauses with distinct reasons', () => {
  const services = [
    { id: 'modal', data: { score: 97 } },
    { id: 'bedrock', data: { score: 90 } },                       // SCORE_WITHHELD
    { id: 'deepseek', data: { score: 88, incidentSourceStale: true } }, // STALE_SOURCE
  ]
  const meta = { modal: { name: 'Modal' }, bedrock: { name: 'Amazon Bedrock' }, deepseek: { name: 'DeepSeek API' } }
  const note = buildRankingNote(services, meta)
  assert.ok(note.includes('1 of 3 services ranked'), `got: ${note}`)
  assert.ok(/Amazon Bedrock is excluded from this ranking/.test(note), `no-feed clause: ${note}`)
  // aiwatch-reports#75 — the reason is the WITHHELD SCORE, not a missing feed. Bedrock's incidents
  // come from the AWS Health events JSON (aiwatch#677) and are archived; Azure's from its RSS.
  assert.ok(!/no reliable incident feed/.test(note), `must not claim a missing feed: ${note}`)
  assert.ok(/no official uptime metric and no direct latency probe/.test(note), `reason: ${note}`)
  assert.ok(/withholds a Score/.test(note), note)
  assert.ok(/Incidents are still tracked/.test(note), note)
  // The singular must keep the negation — an earlier draft read "it publishes an official uptime metric".
  assert.ok(!/ publishes an official uptime metric/.test(note), `negation lost: ${note}`)
  assert.ok(/DeepSeek API is excluded from this ranking/.test(note), `stale clause: ${note}`)
  assert.ok(/incident feed is frozen/.test(note), `stale reason: ${note}`)
})

// ── reports#45 — full-month coverage gate (consumes aiwatch#809 addedAt) ──
console.log('\nisRecentlyAdded (#45)')
test('added in the report month → recently added (excluded)', () => {
  eq(isRecentlyAdded({ id: 'fal', data: { addedAt: '2026-06-24' } }, '2026-06'), true)
})
test('added in a PRIOR month → established (ranked)', () => {
  eq(isRecentlyAdded({ id: 'fal', data: { addedAt: '2026-06-24' } }, '2026-07'), false)
})
test('addedAt absent → established (ranked, no regression for old archives)', () => {
  eq(isRecentlyAdded({ id: 'claude', data: { score: 90 } }, '2026-06'), false)
})
test('no period → not gated (fail-open)', () => {
  eq(isRecentlyAdded({ id: 'fal', data: { addedAt: '2026-06-24' } }, undefined), false)
})

console.log('\nbuildScoreTable + buildRankingNote — coverage gate (#45)')
test('buildScoreTable drops a mid-month-added service for that month, keeps it the next', () => {
  const services = [
    { id: 'cohere', data: { score: 89, grade: 'good', uptime: 100, incidents: 0, avgResolutionMin: null } },
    { id: 'fal', data: { score: 95, grade: 'excellent', uptime: 100, incidents: 0, avgResolutionMin: null, addedAt: '2026-06-24' } },
  ]
  const meta = { cohere: { name: 'Cohere API' }, fal: { name: 'fal.ai' } }
  const june = buildScoreTable(services, meta, '2026-06')
  assert.ok(june.includes('Cohere API'), 'established service ranked')
  assert.ok(!june.includes('fal.ai'), 'mid-month-added service dropped for its first (partial) month')
  const july = buildScoreTable(services, meta, '2026-07')
  assert.ok(july.includes('fal.ai'), 'service rejoins the ranking once a full month accrues')
})
test('buildRankingNote flags the recently-added exclusion with a distinct reason', () => {
  const services = [
    { id: 'cohere', data: { score: 89 } },
    { id: 'fal', data: { score: 95, addedAt: '2026-06-24' } },
  ]
  const meta = { cohere: { name: 'Cohere API' }, fal: { name: 'fal.ai' } }
  const note = buildRankingNote(services, meta, '2026-06')
  assert.ok(note.includes('1 of 2 services ranked'), `got: ${note}`)
  assert.ok(/fal\.ai is excluded from this ranking/.test(note), `recent clause: ${note}`)
  assert.ok(/added to AIWatch mid-month/.test(note), `recent reason: ${note}`)
})
test('full-month services are unaffected — no note, all ranked (no regression)', () => {
  const services = [
    { id: 'cohere', data: { score: 89, grade: 'good', uptime: 100, incidents: 0, avgResolutionMin: null, addedAt: '2026-04-01' } },
    { id: 'claude', data: { score: 90, grade: 'excellent', uptime: 100, incidents: 0, avgResolutionMin: null } },
  ]
  const meta = { cohere: { name: 'Cohere API' }, claude: { name: 'Claude API' } }
  eq(buildRankingNote(services, meta, '2026-06'), '')
  const table = buildScoreTable(services, meta, '2026-06')
  assert.ok(table.includes('Cohere API') && table.includes('Claude API'), 'both full-month services ranked')
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
test('header is "Uptime Source" (not "Confidence"); the column reads the archive (#29, aiwatch#951)', () => {
  const services = [
    { id: 'modal', data: { score: 97, grade: 'excellent', uptime: 99.4, officialUptime: 99.4, incidents: 5, avgResolutionMin: 65 } },
    // Publishes none — the row that used to read "Official · 100.00% uptime" beside a /60 score.
    { id: 'openrouter', data: { score: 80, grade: 'good', uptime: 100, officialUptime: null, incidents: 0, avgResolutionMin: null } },
    // In the legacy NO_PUBLIC_UPTIME set, yet publishes real uptime — used to read "Estimate".
    { id: 'perplexity', data: { score: 68, grade: 'fair', uptime: 99.6, officialUptime: 100, incidents: 1, avgResolutionMin: 240 } },
  ]
  const meta = { modal: { name: 'Modal' }, openrouter: { name: 'OpenRouter' }, perplexity: { name: 'Perplexity' } }
  const table = buildScoreTable(services, meta)
  assert.ok(table.includes('| Rank | Service | Score | Grade | Uptime Source | Why |'), 'header must use Uptime Source')
  assert.ok(!table.includes('Confidence'), 'Confidence column must be gone')
  assert.ok(!table.includes('Estimate'), 'the "Estimate" label went with the estimate itself (aiwatch#713)')
  const openrouterRow = table.split('\n').find(r => r.includes('OpenRouter'))
  assert.ok(/\| No official uptime \|/.test(openrouterRow), `must not claim Official: ${openrouterRow}`)
  assert.ok(!/100\.00% uptime/.test(openrouterRow), `must not quote the measured uptime: ${openrouterRow}`)
  const perplexityRow = table.split('\n').find(r => r.includes('Perplexity'))
  assert.ok(/\| Official \|/.test(perplexityRow), `publishes real uptime → Official: ${perplexityRow}`)
  const modalRow = table.split('\n').find(r => r.includes('Modal'))
  assert.ok(/\| Official \|/.test(modalRow), `status-page service must be Official: ${modalRow}`)
})
test('excludes SCORE_WITHHELD services (Bedrock/Azure) from the ranking (#29)', () => {
  const services = [
    { id: 'modal', data: { score: 97, grade: 'excellent', uptime: 99.4, incidents: 5, avgResolutionMin: 65 } },
    { id: 'bedrock', data: { score: 90, grade: 'excellent', uptime: 100, incidents: 0, avgResolutionMin: null } },
    { id: 'azureopenai', data: { score: 90, grade: 'excellent', uptime: 99.9, incidents: 0, avgResolutionMin: null } },
  ]
  const meta = { modal: { name: 'Modal' }, bedrock: { name: 'Amazon Bedrock' }, azureopenai: { name: 'Azure OpenAI' } }
  const table = buildScoreTable(services, meta)
  assert.ok(!table.includes('Amazon Bedrock'), 'Bedrock must not be ranked')
  assert.ok(!table.includes('Azure OpenAI'), 'Azure must not be ranked')
  assert.ok(table.includes('Modal'), 'a ranked service still appears')
})

console.log('\nbuildIncidentTable')
test('excludes services with zero incidents from the table body', () => {
  const { tableRows, zeroIncLine } = buildIncidentTable(sampleServices, sampleMeta)
  assert.ok(!tableRows.includes('Cohere API'), 'zero-incident service should be excluded')
  assert.ok(tableRows.includes('Claude API'), 'non-zero-incident service should appear')
  assert.ok(zeroIncLine.includes('Cohere API'), 'zero-inc line should list Cohere')
  assert.ok(zeroIncLine.startsWith('**Zero incidents (1 service):**'), `singular agreement: ${zeroIncLine}`)
})
test('sorts by incident count desc', () => {
  const { tableRows } = buildIncidentTable(sampleServices, sampleMeta)
  const claudeIdx = tableRows.indexOf('Claude API')
  const openaiIdx = tableRows.indexOf('OpenAI API')
  assert.ok(claudeIdx > 0 && openaiIdx > 0, 'both should appear')
  assert.ok(claudeIdx < openaiIdx, 'Claude (9 inc) should appear before OpenAI (1 inc)')
})
test('every zero-incident service with a live feed is a confirmed zero (aiwatch-reports#75)', () => {
  const services = [
    { id: 'cohere', data: { score: 89, incidents: 0, uptime: 100, avgResolutionMin: null, totalDowntimeMin: null, longestIncidentMin: null } },
    { id: 'bedrock', data: { score: 90, incidents: 0, uptime: 100, avgResolutionMin: null, totalDowntimeMin: null, longestIncidentMin: null } },
  ]
  const meta = { cohere: { name: 'Cohere API' }, bedrock: { name: 'Amazon Bedrock' } }
  const { zeroIncLine } = buildIncidentTable(services, meta)
  // Official-uptime zero → confirmed; estimate-uptime zero (bedrock) → "No incident feed"
  // aiwatch-reports#75 — the "No incident feed" bucket is gone. Bedrock's feed is real (AWS Health
  // events JSON, aiwatch#677) and archived, so its zero is as observed as Cohere's.
  assert.ok(/\*\*Zero incidents \(2 services\):\*\* Cohere API, Amazon Bedrock — confirmed/.test(zeroIncLine), `confirmed line: ${zeroIncLine}`)
  assert.ok(!/No incident feed/.test(zeroIncLine), `bucket must be gone: ${zeroIncLine}`)
})

// aiwatch#507 — a status page that migrated to an unreachable platform freezes its feed, so neither
// a partial nonzero count nor a frozen zero is a verified picture. Since aiwatch#618 the STALE_SOURCE
// constant is empty (DeepSeek is readable again), so staleness is driven by the archive's
// `incidentSourceStale` flag — these tests set it explicitly (e.g. the frozen May 2026 archive).
test('STALE_SOURCE: caveat renders with a NONZERO count (3 partial-month incidents, flag set)', () => {
  const services = [
    { id: 'deepseek', data: { score: 82, incidents: 3, uptime: 99.92, avgResolutionMin: 18, totalDowntimeMin: 53, longestIncidentMin: 34, incidentSourceStale: true } },
  ]
  const meta = { deepseek: { name: 'DeepSeek API' } }
  const { tableRows, zeroIncLine } = buildIncidentTable(services, meta)
  assert.ok(tableRows.includes('DeepSeek API'), 'still listed in the incident table (data is real, just dated)')
  assert.ok(/\*\*Stale source \(1 service\):\*\* DeepSeek API — AIWatch can no longer read its incident feed/.test(zeroIncLine), `stale line: ${zeroIncLine}`)
  assert.ok(/floor rather than a verified picture\./.test(zeroIncLine), 'self-contained caveat')
  assert.ok(!/#\d+/.test(zeroIncLine), 'no reader-facing internal issue number')
})
test('STALE_SOURCE: a frozen ZERO count is NOT labelled "confirmed zero" (flag set)', () => {
  const services = [
    { id: 'cohere', data: { score: 89, incidents: 0, uptime: 100, avgResolutionMin: null } },
    { id: 'deepseek', data: { score: 82, incidents: 0, uptime: 99.92, avgResolutionMin: null, incidentSourceStale: true } },
  ]
  const meta = { cohere: { name: 'Cohere API' }, deepseek: { name: 'DeepSeek API' } }
  const { zeroIncLine } = buildIncidentTable(services, meta)
  // deepseek's zero must NOT appear in the confirmed list…
  assert.ok(/\*\*Zero incidents \(1 service\):\*\* Cohere API — confirmed/.test(zeroIncLine), `confirmed: ${zeroIncLine}`)
  assert.ok(!/Zero incidents.*DeepSeek/.test(zeroIncLine), 'deepseek not in confirmed-zero (frozen feed)')
  // …it appears in the stale-source caveat instead
  assert.ok(/\*\*Stale source \(1 service\):\*\* DeepSeek API/.test(zeroIncLine), `stale: ${zeroIncLine}`)
})
test('buildStaleSourceCaveat: singular vs plural agreement, empty → ""', () => {
  eq(buildStaleSourceCaveat([]), '')
  const one = buildStaleSourceCaveat(['DeepSeek API'])
  assert.ok(/\*\*Stale source \(1 service\):\*\* DeepSeek API — AIWatch can no longer read its incident feed, which is frozen/.test(one), `singular: ${one}`)
  const two = buildStaleSourceCaveat(['DeepSeek API', 'Foo API'])
  assert.ok(/\*\*Stale source \(2 services\):\*\* DeepSeek API, Foo API — AIWatch can no longer read their incident feeds, which are frozen/.test(two), `plural: ${two}`)
})
// The caveat used to assert a CAUSE and a SCORE, and was wrong about both.
test('buildStaleSourceCaveat claims no cause — the flag says frozen, not why', () => {
  const c = buildStaleSourceCaveat(['Character.AI'])
  // DeepSeek's status page was bot-walled (aiwatch#507); Character.AI's was 401-deactivated
  // (aiwatch#689/#800). One sentence cannot name both, so it names neither.
  assert.ok(!/migrated/.test(c), `must not guess the cause: ${c}`)
  assert.ok(!/platform/.test(c), c)
})
test('buildStaleSourceCaveat asserts nothing about whether a Score exists', () => {
  const c = buildStaleSourceCaveat(['Character.AI'])
  // The old line said the Score "reflects data up to that cutoff" — but a stale service may have no
  // Score at all (withheld at low confidence). Nor may we claim it IS withheld: a stale service with
  // a probe keeps a real number. Only the ranking exclusion is unconditionally true.
  assert.ok(!/Score reflect/.test(c), `must not claim a partial Score: ${c}`)
  assert.ok(!/withheld/.test(c), `must not claim the Score was withheld either: ${c}`)
  assert.ok(/removes the service from the Score ranking/.test(c), c)
  assert.ok(/floor/.test(c) && /cutoff/.test(c), c)
})
// The identical false cause lived one function up, where it was reachable for a stale service that
// still carries a score (DeepSeek, May 2026 — stale yet ranked #4 before the exclusion landed).
test('buildRankingNote names no cause for a stale service either', () => {
  const note = buildRankingNote(
    [{ id: 'deepseek', data: { score: 88, incidentSourceStale: true } }],
    { deepseek: { name: 'DeepSeek API' } },
    '2026-05',
  )
  assert.ok(/DeepSeek API is excluded from this ranking/.test(note), note)
  assert.ok(/incident feed is frozen/.test(note), note)
  assert.ok(!/migrated/.test(note), `must not guess the cause: ${note}`)
  assert.ok(!/platform/.test(note), note)
})
test('buildRankingNote no longer cites the industry-average assumption aiwatch#713 deleted', () => {
  const note = buildRankingNote(
    [{ id: 'bedrock', data: { score: 73 } }, { id: 'azureopenai', data: { score: 90 } }],
    { bedrock: { name: 'Amazon Bedrock' }, azureopenai: { name: 'Azure OpenAI' } },
    '2026-05',
  )
  assert.ok(/excluded from this ranking/.test(note), note)
  assert.ok(!/industry-average/.test(note), `AIWatch invents no uptime (aiwatch#713): ${note}`)
  assert.ok(!/assumption/.test(note), note)
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
  // Defense: if a LEGACY archive (no officialUptime field) wrongly returns uptime for mistral,
  // still exclude from table
  const services = [
    { id: 'mistral', data: { score: 75, grade: 'good', uptime: 99.5, incidents: 7, avgResolutionMin: 6, avgLatencyMs: 420 } },
  ]
  const rows = buildUptimeTable(services, { mistral: { name: 'Mistral API' } })
  eq(rows, '')
})

// #586 — Official Uptime table is driven by the status-page `officialUptime` field, not `uptime`.
console.log('\nofficialUptimeFor (#586)')
test('new archive: returns officialUptime (status-page), not the daily-counter uptime', () => {
  eq(officialUptimeFor({ id: 'chatgpt', data: { uptime: 72.78, officialUptime: 99.83 } }), 99.83)
})
test('new archive: officialUptime null → omitted (no comparable published metric)', () => {
  eq(officialUptimeFor({ id: 'chatgpt', data: { uptime: 72.78, officialUptime: null } }), null)
})
test('new archive: a number of 0 is honored (not treated as missing)', () => {
  eq(officialUptimeFor({ id: 'someapi', data: { uptime: 50, officialUptime: 0 } }), 0)
})
test('legacy archive (no field): chatgpt falls back to null, never the bad 72.78', () => {
  eq(officialUptimeFor({ id: 'chatgpt', data: { uptime: 72.78 } }), null)
})
test('legacy archive (no field): NO_PUBLIC_UPTIME service → null', () => {
  eq(officialUptimeFor({ id: 'mistral', data: { uptime: 99.5 } }), null)
})
test('legacy archive (no field): normal service → daily-counter uptime', () => {
  eq(officialUptimeFor({ id: 'cohere', data: { uptime: 100 } }), 100)
})
test('new archive: NO_PUBLIC_UPTIME estimate service (bedrock 100) → null (no #29 stray-100 row)', () => {
  eq(officialUptimeFor({ id: 'bedrock', data: { uptime: 100, officialUptime: 100 } }), null)
})
// aiwatch#951 — Mistral (Instatus) and Perplexity DO publish an official uptime. The old guard
// dropped them from the table and labelled them "Estimate"; a modern archive is authoritative.
test('new archive: mistral/perplexity keep their real official uptime', () => {
  eq(officialUptimeFor({ id: 'mistral', data: { uptime: 87.29, officialUptime: 99.559 } }), 99.559)
  eq(officialUptimeFor({ id: 'perplexity', data: { uptime: 99.98, officialUptime: 100 } }), 100)
})
test('new archive: a service publishing none is omitted, whatever its measured uptime', () => {
  eq(officialUptimeFor({ id: 'openrouter', data: { uptime: 100, officialUptime: null } }), null)
  eq(officialUptimeFor({ id: 'stability', data: { uptime: 100, officialUptime: null } }), null)
})
test('chatgpt is NOT in NO_PUBLIC_UPTIME — included via officialUptime despite uptimeSource=estimate', () => {
  // ChatGPT is also `uptimeSource: estimate` upstream, but must STAY in the table (the whole #586 point),
  // so the guard keys off NO_PUBLIC_UPTIME (which omits it not) rather than the estimate flag.
  eq(officialUptimeFor({ id: 'chatgpt', data: { uptime: 72.78, officialUptime: 99.23 } }), 99.23)
})

test('#586 buildUptimeTable: chatgpt included with officialUptime, sorted by it', () => {
  const services = [
    { id: 'openai', data: { uptime: 99.6, officialUptime: 99.60 } },
    { id: 'chatgpt', data: { uptime: 72.78, officialUptime: 99.83 } },
    { id: 'mistral', data: { uptime: 99.5, officialUptime: null } }, // no published metric → omit
  ]
  const meta = { openai: { name: 'OpenAI API' }, chatgpt: { name: 'ChatGPT' }, mistral: { name: 'Mistral API' } }
  const rows = buildUptimeTable(services, meta)
  assert.ok(rows.includes('<tr><td>ChatGPT</td><td>99.83%</td></tr>'), 'ChatGPT shows status-page 99.83%, not 72.78%')
  assert.ok(!rows.includes('72.78'), 'the pessimistic daily-counter value never appears')
  assert.ok(!rows.includes('Mistral API'), 'null-officialUptime service omitted')
  // sorted desc by officialUptime → ChatGPT (99.83) before OpenAI (99.60)
  assert.ok(rows.indexOf('ChatGPT') < rows.indexOf('OpenAI API'), 'sorted by officialUptime desc')
})

console.log('\nbuildLatencyTable')
test('sorts by latency asc (fastest first)', () => {
  const table = buildLatencyTable(sampleServices, sampleMeta)
  // Only content rows (header starts with "| Rank", data rows start with "| N |")
  const dataRows = table.split('\n').filter(l => /^\| \d+ \|/.test(l))
  eq(dataRows.length, 3)
  assert.ok(dataRows[0].includes('Cohere API'), `fastest should be Cohere (230ms): ${dataRows[0]}`)
})
test('emits only the p75 column — no empty p95/Spikes/vs-Last-Month placeholders (#17)', () => {
  const table = buildLatencyTable(sampleServices, sampleMeta)
  const lines = table.split('\n')
  eq(lines[0], '| Rank | Service | p75 (ms) |')
  eq(lines[1], '|---|---|---|')
  // No row may carry the old 6-column placeholder dashes.
  assert.ok(!table.includes('| — | — | — |'), 'must not emit empty placeholder columns')
  // Every data row has exactly 3 cells (4 pipes).
  const dataRows = lines.filter(l => /^\| \d+/.test(l))
  for (const row of dataRows) {
    eq((row.match(/\|/g) || []).length, 4, `row should have 3 columns (4 pipes): ${row}`)
  }
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
  // Needs a non-`detected` stage so the timeline renders at all (#87 progression gate); the
  // fix_released row omits severity + fixedVersion to exercise the em-dash fallback.
  const out = buildTimelineDetails([
    { stage: 'detected', at: '2026-04-15', severity: 'high' },
    { stage: 'fix_released', at: '2026-04-20' },
  ])
  assert.ok(out.includes('fix_released | 2026-04-20 | — | —'), `missing fields: ${out}`)
})
test('renders em dash for missing stage so undefined never appears in a table cell', () => {
  // A real progression stage makes the block render; the malformed stageless entry must still
  // print em-dash, not "undefined".
  const out = buildTimelineDetails([
    { stage: 'fix_released', at: '2026-04-20', severity: 'high', fixedVersion: '1.0.0' },
    { at: '2026-04-15' },
  ])
  assert.ok(!out.includes('undefined'), `stage fallback: ${out}`)
  assert.ok(out.includes('— | 2026-04-15 | — | —'), `stage = em dash: ${out}`)
})
// aiwatch-reports#87 — suppress single-`detected` timelines (no progression → noise, and a
// first-sighting `detected` date can contradict the this-month `Detected:` bullet).
test('suppresses a timeline whose only stage is the initial detected (#87)', () => {
  eq(buildTimelineDetails([{ stage: 'detected', at: '2026-05-13', severity: 'high' }]), '')
})
test('suppresses when no non-detected stage exists, even across multiple entries (#87)', () => {
  // a malformed stageless entry does not count as progression
  eq(buildTimelineDetails([{ stage: 'detected', at: '2026-05-13' }, { at: '2026-05-14' }]), '')
})
test('still renders once a non-detected stage appears — real progression (#87)', () => {
  const out = buildTimelineDetails([
    { stage: 'detected', at: '2026-05-13', severity: 'high' },
    { stage: 'fix_released', at: '2026-05-20', severity: 'high', fixedVersion: '0.8.0' },
  ])
  assert.ok(out.includes('<details'), `renders: ${out}`)
  assert.ok(out.includes('detected | 2026-05-13'), `keeps detected row: ${out}`)
  assert.ok(out.includes('fix_released | 2026-05-20 | high | 0.8.0'), `progression row: ${out}`)
})

console.log('\nbuildTopFindings')
test('renders OSV finding with timeline expansion', () => {
  const out = buildTopFindings([{
    title: 'GHSA-1234 langchain SSRF', url: 'https://example.com/x',
    source: 'osv', severity: 'high', service: 'langchain',
    detectedAt: '2026-04-10T12:00:00Z',
    // needs a non-`detected` stage to render at all (#87 progression gate)
    timeline: [
      { stage: 'detected', at: '2026-04-10T12:00:00Z', severity: 'high' },
      { stage: 'fix_released', at: '2026-04-14T12:00:00Z', severity: 'high', fixedVersion: '0.3.1' },
    ],
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
    // multi-stage so ONLY the HN source-gate can suppress it (not the #87 progression gate) —
    // proves the source check, not an incidental single-detected suppression
    timeline: [
      { stage: 'detected', at: '2026-04-12' },
      { stage: 'fix_released', at: '2026-04-15', fixedVersion: '2.0.0' },
    ], // shouldn't happen but be safe
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

// ── buildDetectionSection (#28) ─────────────────────────────────────
console.log('\nfmtLeadMin')
test('formats ms → whole minutes', () => eq(fmtLeadMin(900000), '15m'))
test('handles null', () => eq(fmtLeadMin(null), '—'))

console.log('\nbuildDetectionSection (#28)')
const detMeta = { deepgram: { name: 'Deepgram' }, mistral: { name: 'Mistral API' }, gemini: { name: 'Gemini API' } }
test('omits the whole section when no degradation and no detectionLead', () => {
  eq(buildDetectionSection({}, detMeta), '')
  eq(buildDetectionSection({ degradation: { total: 0 }, detectionLead: { topExamples: [] } }, detMeta), '')
  eq(buildDetectionSection({ degradation: null, detectionLead: null }, detMeta), '')
})
test('renders RTT Degradation from archive.degradation', () => {
  const out = buildDetectionSection({
    degradation: { total: 12, noStatusTotal: 8, byService: { deepgram: 5, mistral: 4 }, noStatusByService: { deepgram: 4, mistral: 3 } },
  }, detMeta)
  assert.ok(out.startsWith('## Detection & RTT Degradation'), `heading first: ${out.slice(0, 40)}`)
  assert.ok(out.includes('### Detection Latency'), 'keeps the static Detection Latency blurb')
  assert.ok(/flagged \*\*12\*\* latency degradations/.test(out), `total: ${out}`)
  assert.ok(/\*\*8\*\* were \*\*not reflected/.test(out), 'noStatus total rendered')
  assert.ok(/\| Deepgram \| 5 \| 4 \|/.test(out), 'degradation row rendered with display name')
  assert.ok(!out.includes('### Early RTT Detections'), 'no Early RTT subsection without leads')
  assert.ok(out.trimEnd().endsWith('---'), 'section ends with its own trailing separator')
})
test('renders Early RTT Detections + Official Update = detectedAt + leadMs', () => {
  const out = buildDetectionSection({
    detectionLead: { count: 6, avgLeadMs: 480000, topExamples: [
      { svcId: 'mistral', incId: '01ABC', leadMs: 900000, detectedAt: '2026-04-12T14:30:00Z' },
    ] },
  }, detMeta)
  assert.ok(out.includes('### Early RTT Detections'), 'Early RTT subsection rendered')
  assert.ok(/\| 01ABC \| Mistral API \| 2026-04-12 14:30 UTC \| 2026-04-12 14:45 UTC \| 15m \|/.test(out), `row: ${out}`)
  assert.ok(/\*\*Average early detection\*\*: 8m \(across 6 events\)/.test(out), 'average shown when count >= 5')
  assert.ok(!out.includes('### RTT Degradation Detection'), 'no degradation subsection without degradation data')
})
test('drops the Average line below the sample-size gate (count < 5)', () => {
  const out = buildDetectionSection({
    detectionLead: { count: 3, avgLeadMs: 480000, topExamples: [
      { svcId: 'gemini', incId: '01DEF', leadMs: 300000, detectedAt: '2026-04-18T09:05:00Z' },
    ] },
  }, detMeta)
  assert.ok(out.includes('### Early RTT Detections'), 'still shows per-event rows')
  assert.ok(!out.includes('**Average early detection**'), 'no averaged figure below MIN_LEAD_SAMPLE_SIZE')
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

// ── injectAutoDraft (refs aiwatch-reports#4) ─────────────────────────
//
// Contract: replaces the Key Insight opening-narrative comment with the
// generated opening; fences the TL;DR with BEGIN/END markers inside `## Summary`
// without touching the placeholder bullets that the operator will fill.

const { injectAutoDraft, archiveToAnalysisRows, applyAutoDraft, SUMMARY_OPEN_MARKER, SUMMARY_CLOSE_MARKER } = require('./generate-report')

console.log('\narchiveToAnalysisRows')

test('emits one incidents row per service (including zero-incident services)', () => {
  // Critical to NOT use the rendered Incident Summary table as the source: that
  // table only contains incident-bearing services. Feeding the analyzer from
  // the table would collapse `totalServices` and `zeroIncidents` to the bearing
  // subset and the Opening would say "0 services recorded zero incidents" on
  // an actually-calm month. archiveToAnalysisRows must surface ALL services.
  const archive = {
    services: {
      claude:  { score: 90, grade: 'excellent', incidents: 2, totalDowntimeMin: 30, avgResolutionMin: 15, uptime: 99.9 },
      openai:  { score: 80, grade: 'good', incidents: 0, totalDowntimeMin: 0, avgResolutionMin: 0, uptime: 100 },
      gemini:  { score: 70, grade: 'fair', incidents: 0, totalDowntimeMin: 0, avgResolutionMin: 0, uptime: 100 },
    },
  }
  const meta = { claude: { name: 'Claude' }, openai: { name: 'OpenAI' }, gemini: { name: 'Gemini' } }
  const { scores, incidents } = archiveToAnalysisRows(archive, meta)
  assert.strictEqual(incidents.length, 3, 'all 3 services in incidents rows')
  assert.strictEqual(scores.length, 3, 'all 3 services in score rows')
  const zeroes = incidents.filter(r => r.Incidents === '0')
  assert.strictEqual(zeroes.length, 2, `2 zero-incident services expected, got ${zeroes.length}`)
})

test('scores are sorted descending (so analyzer.top / bottom slicing works)', () => {
  const archive = {
    services: {
      a: { score: 55, grade: 'fair', incidents: 5 },
      b: { score: 95, grade: 'excellent', incidents: 0 },
      c: { score: 75, grade: 'good', incidents: 1 },
    },
  }
  const { scores } = archiveToAnalysisRows(archive, {})
  assert.deepStrictEqual(scores.map(s => s.Score), ['95', '75', '55'])
})

test('omits services without a score from scores rows but keeps them in incidents', () => {
  // Estimate-only services have `score: null` — they should not anchor rankings,
  // but their incident count (typically 0 by definition) still feeds totals.
  const archive = {
    services: {
      bedrock:    { score: null, incidents: 0 },
      azureoai:   { score: null, incidents: 0 },
      claude:     { score: 90, incidents: 1, totalDowntimeMin: 5, avgResolutionMin: 5 },
    },
  }
  const { scores, incidents } = archiveToAnalysisRows(archive, {})
  assert.strictEqual(scores.length, 1, 'only scored service appears in scores')
  assert.strictEqual(scores[0].Service, 'claude')
  assert.strictEqual(incidents.length, 3, 'all 3 services contribute to total / zero counts')
})

test('row shape matches generate-summary.analyze() expectations exactly', () => {
  // Coupling check — if generate-summary's analyze adds a new column read in the
  // future (e.g. r['Longest']), this test won't catch it, but at least we pin
  // the columns that today's analyze() reads: Service, Score, Confidence,
  // Incidents, Total Downtime, Avg Resolution.
  const archive = { services: { claude: { score: 100, grade: 'excellent', incidents: 0, uptime: 100 } } }
  const { scores, incidents } = archiveToAnalysisRows(archive, { claude: { name: 'Claude' } })
  const scoreKeys = Object.keys(scores[0]).sort()
  const incKeys = Object.keys(incidents[0]).sort()
  assert.deepStrictEqual(scoreKeys, ['Confidence', 'Grade', 'Score', 'Service'])
  assert.deepStrictEqual(incKeys, ['Avg Resolution', 'Incidents', 'Service', 'Total Downtime'])
})

console.log('\ninjectAutoDraft')

const SAMPLE_FILLED = [
  '---',
  'published: false',
  '---',
  '',
  '## Summary',
  '',
  '- **Most reliable**:',
  '- **Riskiest this month**:',
  '',
  '## Recommendations',
  '',
  'placeholder',
  '',
  '## Key Insight',
  '',
  '<!-- Opening narrative: 1 sentence summarizing the month, then 3 patterns -->',
  '',
  '- **Pattern 1**:',
  '',
  '## Incident Summary',
  '',
  'unrelated section the regex must not splice into',
].join('\n')

test('Opening replaces the Key Insight placeholder comment exactly once', () => {
  const out = injectAutoDraft(SAMPLE_FILLED, 'OPENING_TEXT_HERE', '- **TLDR bullet**')
  assert.ok(out.includes('OPENING_TEXT_HERE'), 'opening text injected')
  assert.ok(!out.includes('<!-- Opening narrative: 1 sentence summarizing the month, then 3 patterns -->'),
    'original placeholder comment removed')
  // Opening must land inside Key Insight, not Summary.
  const summaryIdx = out.indexOf('## Summary')
  const recsIdx = out.indexOf('## Recommendations')
  const openingIdx = out.indexOf('OPENING_TEXT_HERE')
  assert.ok(openingIdx > recsIdx, `opening must follow Recommendations; got idx=${openingIdx} vs recs=${recsIdx}`)
  assert.ok(openingIdx < out.indexOf('## Incident Summary'), 'opening must precede Incident Summary')
  assert.ok(openingIdx > summaryIdx, 'opening must be after Summary heading')
})

test('TL;DR fence lands inside `## Summary` only', () => {
  const tldr = '- **Most reliable**: ClaudeAI (100/100 — perfect uptime)'
  const out = injectAutoDraft(SAMPLE_FILLED, 'opening', tldr)
  assert.ok(out.includes(SUMMARY_OPEN_MARKER), 'open marker present')
  assert.ok(out.includes(SUMMARY_CLOSE_MARKER), 'close marker present')
  assert.ok(out.includes(tldr), 'tldr body present')
  // Both markers must sit strictly between `## Summary` and `## Recommendations`.
  const summaryIdx = out.indexOf('## Summary')
  const recsIdx = out.indexOf('## Recommendations')
  const openIdx = out.indexOf(SUMMARY_OPEN_MARKER)
  const closeIdx = out.indexOf(SUMMARY_CLOSE_MARKER)
  assert.ok(openIdx > summaryIdx && openIdx < recsIdx, `open marker position: ${openIdx} (summary=${summaryIdx}, recs=${recsIdx})`)
  assert.ok(closeIdx > openIdx && closeIdx < recsIdx, `close marker position: ${closeIdx}`)
})

test('does NOT touch sections whose heading contains "Summary" but is not `## Summary`', () => {
  // `## Incident Summary` shares the substring; the regex must use the line anchor `^...$`
  // to skip it. Inject + verify Incident Summary block is byte-identical to input.
  const out = injectAutoDraft(SAMPLE_FILLED, 'opening', 'tldr')
  const incBlock = out.slice(out.indexOf('## Incident Summary'))
  assert.ok(incBlock.startsWith('## Incident Summary\n\nunrelated section'),
    `Incident Summary block was mutated. Got: ${incBlock.slice(0, 80)}`)
  // Sanity: only ONE auto-draft fence in the whole document
  const openCount = (out.match(new RegExp(SUMMARY_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  assert.strictEqual(openCount, 1, `expected 1 open marker, got ${openCount}`)
})

test('placeholder bullets inside `## Summary` are preserved (operator fills them)', () => {
  const out = injectAutoDraft(SAMPLE_FILLED, 'opening', 'tldr')
  assert.ok(out.includes('- **Most reliable**:'), 'placeholder #1 retained')
  assert.ok(out.includes('- **Riskiest this month**:'), 'placeholder #2 retained')
})

test('multi-line TL;DR with nested markdown survives interpolation unchanged', () => {
  const tldr = [
    '- **Most reliable**: ClaudeAI (100/100)',
    '- **Riskiest this month**: Gemini (61/100, 5h downtime)',
    '',
    '**Recommendations**',
    '- **Primary**: ClaudeAI or OpenAI',
    '',
    '**Recovery performance**: Fastest — Cohere (12m avg). Slowest — Gemini (5h avg).',
  ].join('\n')
  const out = injectAutoDraft(SAMPLE_FILLED, 'opening', tldr)
  // Every non-blank line of tldr must appear between the markers in order.
  const between = out.slice(out.indexOf(SUMMARY_OPEN_MARKER), out.indexOf(SUMMARY_CLOSE_MARKER))
  for (const line of tldr.split('\n')) {
    if (line === '') continue
    assert.ok(between.includes(line), `TL;DR line lost: "${line}"`)
  }
})

test('double-inject is idempotent — exactly ONE Summary fence and the first injection wins', () => {
  // Workflow uses force-with-lease + branch reset (generate-report.yml) so a
  // double-call shouldn't happen in CI. But an operator re-running the script
  // locally on an already-injected PR branch must not stack two AUTO-DRAFT
  // fences inside `## Summary` — that would publish a confusing diff. The
  // injectAutoDraft idempotency guard (presence check on SUMMARY_OPEN_MARKER)
  // makes the second call a no-op for both halves: Opening's placeholder
  // comment is gone after first call (regex misses), and the marker presence
  // check short-circuits the Summary fence insert.
  const once = injectAutoDraft(SAMPLE_FILLED, 'first-opening', 'first-tldr')
  const twice = injectAutoDraft(once, 'second-opening', 'second-tldr')

  // First Opening survives (placeholder already consumed → second is a no-op).
  assert.ok(twice.includes('first-opening'), 'first opening preserved')
  assert.ok(!twice.includes('second-opening'), 'second opening did NOT overwrite')

  // First TL;DR body survives; second was rejected by the marker guard.
  assert.ok(twice.includes('first-tldr'), 'first tldr preserved')
  assert.ok(!twice.includes('second-tldr'), 'second tldr did NOT replace or stack')

  // Exactly one fence — not zero, not two.
  const markerRe = new RegExp(SUMMARY_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
  const openCount = (twice.match(markerRe) || []).length
  assert.strictEqual(openCount, 1, `expected exactly 1 SUMMARY_OPEN_MARKER after double-inject, got ${openCount}`)
})

// ── applyAutoDraft (failure-isolation contract) ──────────────────────
//
// Pins the "narrative-generation failure never blocks the deterministic data
// pipeline" promise documented in generate-report.js. The catch arm exists in
// case generate-summary's analyze() ever becomes strict and throws; today the
// analyzer is lenient, so the catch is dead code. These tests lock the
// non-throwing contract in place so a future analyzer rewrite that adds
// validation doesn't silently fail the workflow.

console.log('\napplyAutoDraft')

const SAMPLE_ARCHIVE = {
  services: {
    claude: { score: 92, grade: 'excellent', incidents: 1, totalDowntimeMin: 20, avgResolutionMin: 20, uptime: 99.95 },
    openai: { score: 80, grade: 'good', incidents: 0, totalDowntimeMin: 0, avgResolutionMin: 0, uptime: 100 },
    gemini: { score: 55, grade: 'fair', incidents: 5, totalDowntimeMin: 300, avgResolutionMin: 60, uptime: 98.5 },
  },
}
const SAMPLE_META = {
  claude: { name: 'Claude' }, openai: { name: 'OpenAI' }, gemini: { name: 'Gemini' },
}

test('happy path — applies opening + fence on a normal archive', () => {
  const out = applyAutoDraft(SAMPLE_FILLED, SAMPLE_ARCHIVE, SAMPLE_META, '2026-04')
  assert.ok(out !== SAMPLE_FILLED, 'output must differ from input on happy path')
  assert.ok(out.includes(SUMMARY_OPEN_MARKER), 'fence injected')
  assert.ok(!out.includes('<!-- Opening narrative: 1 sentence summarizing'), 'opening placeholder consumed')
})

test('returns filled unchanged when archive.services is empty (skip guard)', () => {
  const out = applyAutoDraft(SAMPLE_FILLED, { services: {} }, {}, '2026-04')
  assert.strictEqual(out, SAMPLE_FILLED, 'no-op when nothing to summarize')
})

test('returns filled unchanged when archive has no services key', () => {
  const out = applyAutoDraft(SAMPLE_FILLED, {}, {}, '2026-04')
  assert.strictEqual(out, SAMPLE_FILLED, 'no-op when archive.services missing')
})

test('returns filled unchanged when archive.services is null (defensive read)', () => {
  const out = applyAutoDraft(SAMPLE_FILLED, { services: null }, {}, '2026-04')
  assert.strictEqual(out, SAMPLE_FILLED, 'no-op when archive.services is null')
})

test('catches analyzer throw and returns filled unchanged (failure isolation)', () => {
  // Stub a throwing analyzer. Today analyze() is lenient by construction; this
  // test locks the contract so a future strict-validating rewrite doesn't quietly
  // start failing the workflow step.
  const throwingStub = {
    analyze() { throw new Error('synthetic analyzer failure') },
    generateOpening() { throw new Error('should not be called') },
    generateTldr() { throw new Error('should not be called') },
  }
  const out = applyAutoDraft(SAMPLE_FILLED, SAMPLE_ARCHIVE, SAMPLE_META, '2026-04', throwingStub)
  assert.strictEqual(out, SAMPLE_FILLED, 'analyzer throw must not corrupt the deterministic draft')
})

test('catches generateOpening throw and returns filled unchanged', () => {
  const stub = {
    analyze() { return { /* shape unused by stub */ } },
    generateOpening() { throw new Error('opening failure') },
    generateTldr() { return 'tldr' },
  }
  const out = applyAutoDraft(SAMPLE_FILLED, SAMPLE_ARCHIVE, SAMPLE_META, '2026-04', stub)
  assert.strictEqual(out, SAMPLE_FILLED)
})

// ── Integration: real 2026-04 archive end-to-end ─────────────────────
//
// Catches worker-side schema drift (MonthlyServiceData column changes) at the
// consumer level without depending on a live `/api/report` fetch. `_data/2026-04.json`
// is a long-lived snapshot committed for exactly this reason (see _data/README.md).
// The assertions are specific enough that a column rename or null-handling change
// would surface as a numerical mismatch rather than a vague flake.

console.log('\nintegration: 2026-04 archive end-to-end')

const fs = require('fs')
const path = require('path')

  test('archiveToAnalysisRows narrates the monthly score, not the snapshot (aiwatch#993 bypass)', () => {
    // The auto-draft Summary/TL;DR is built from these rows. If they carried the snapshot score, the
    // draft would say "84/100" while the ranking table shows the monthly 77 — the two-window
    // disagreement #993 removes. Reverting the resolveMonthlyScore call here reintroduces it.
    const archive = { services: {
      openai: { score: 84, grade: 'good', monthlyScore: 77, monthlyGrade: 'good', incidents: 1, officialUptime: 99 },
    } }
    const { scores } = archiveToAnalysisRows(archive, { openai: { name: 'OpenAI API' } })
    const row = scores.find(r => r.Service === 'OpenAI API')
    assert.ok(row, 'openai must appear in the analysis rows')
    assert.strictEqual(row.Score, '77', `must narrate the monthly score, got ${row.Score}`)
  })


test('archiveToAnalysisRows on the real April snapshot yields expected counts', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  const { scores, incidents } = archiveToAnalysisRows(archive, {})
  // 31 total services in the April archive (per its own `Object.keys(services).length`)
  assert.strictEqual(incidents.length, 31, `expected 31 services in incidents rows, got ${incidents.length}`)
  // 7 services recorded zero incidents that month
  const zeroes = incidents.filter(r => r.Incidents === '0').length
  assert.strictEqual(zeroes, 7, `expected 7 zero-incident services in April, got ${zeroes}`)
  // Score column passes through as a numeric string the analyzer can parseInt
  for (const s of scores) assert.ok(/^\d+$/.test(s.Score), `non-integer Score leaked: ${s.Score}`)
})

  test('full render uses monthlyScore in the ranking table (aiwatch#993 wiring at load)', () => {
    // End-to-end guard for the line-~959 normalization: inject a monthlyScore that differs from the
    // snapshot on a ranked service and confirm the RENDERED Score table shows the monthly value.
    // Reverting the load-point normalization makes this fail (the table would show 84, the snapshot).
    const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
    archive.services.openai = { ...archive.services.openai, score: 84, grade: 'good', monthlyScore: 77, monthlyGrade: 'good' }
    const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
    const meta = {}
    for (const id of Object.keys(archive.services)) meta[id] = { name: id }
    const { fillTemplate } = require('./generate-report')
    const out = fillTemplate(tmpl, '2026-04', archive, meta)
    const openaiRow = out.split('\n').find(l => l.startsWith('|') && /openai/.test(l))
    assert.ok(openaiRow, 'openai must have a ranking row')
    assert.ok(/\| 77 \|/.test(openaiRow), 'ranking row must show the monthly score 77: ' + openaiRow)
    assert.ok(!/\| 84 \|/.test(openaiRow), 'must not show the snapshot score 84: ' + openaiRow)
  })

test('full pipeline against real April archive — Opening reflects 24 of 31, no "undefined" leakage', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
  const meta = {}
  for (const id of Object.keys(archive.services)) meta[id] = { name: id }
  const { fillTemplate } = require('./generate-report')
  const filled = fillTemplate(tmpl, '2026-04', archive, meta)
  const out = applyAutoDraft(filled, archive, meta, '2026-04')

  // Fence sits inside `## Summary` (the regex correctly skips `## Incident Summary`).
  const sumIdx = out.indexOf('## Summary')
  const recsIdx = out.indexOf('## Recommendations')
  const incSumIdx = out.indexOf('## Incident Summary')
  const fenceIdx = out.indexOf(SUMMARY_OPEN_MARKER)
  assert.ok(fenceIdx > sumIdx && fenceIdx < recsIdx, `fence must be inside ## Summary; got ${fenceIdx}`)
  assert.ok(fenceIdx < incSumIdx, 'fence must precede ## Incident Summary')

  // Sanity on the analyzer output landing in the document.
  assert.ok(/24 out of 31/.test(out), 'opening should mention "24 out of 31 services recorded ... incident"')

  // The load-bearing failure mode the integration test exists for — Critical Gap #2
  // (regress the skip guard or break archive shape → analyzer emits "undefined"
  // literals into the published narrative). Pin its absence.
  const fenceBlock = out.slice(out.indexOf(SUMMARY_OPEN_MARKER), out.indexOf(SUMMARY_CLOSE_MARKER) + SUMMARY_CLOSE_MARKER.length)
  assert.ok(!/undefined/.test(fenceBlock), `auto-draft must not contain literal "undefined"; got: ${fenceBlock.slice(0, 300)}`)

  // #27 — the Security Alerts section auto-renders from archive.security via the
  // SECURITY_SECTION marker. (Previously the template shipped a hand-authored block and
  // NO marker, so buildSecuritySection never fired and every month was filled by hand.)
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'),
    'fillTemplate should consume the SECURITY_SECTION marker')
  assert.ok(!out.includes('Do not hand-author'),
    'the marker explainer comment must not leak into the rendered report')
  assert.ok(out.includes('## Security Alerts'),
    'April archive has detections → the Security Alerts section must render')
  assert.ok(new RegExp(`\\*\\*Total alerts:\\*\\* ${archive.security.totalAlerts}\\b`).test(out),
    'rendered Total alerts must match archive.security.totalAlerts')
  assert.ok(!/---\s*\n\s*---/.test(out),
    'no double horizontal rule around the auto-rendered security section')
})

test('security section omitted with no double `---` when archive.security is null — real template', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  archive.security = null
  const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
  const meta = {}
  for (const id of Object.keys(archive.services)) meta[id] = { name: id }
  const { fillTemplate } = require('./generate-report')
  const out = fillTemplate(tmpl, '2026-04', archive, meta)
  assert.ok(!out.includes('## Security Alerts'), 'no Security section when archive.security is null')
  assert.ok(!out.includes('<!-- SECURITY_SECTION -->'), 'marker removed on omission')
  assert.ok(!out.includes('Do not hand-author'), 'explainer comment removed on omission')
  assert.ok(!/---\s*\n\s*---/.test(out), 'the marker + its separator collapse without leaving a double rule')
})

// ── fillTemplate × detection (#28) ──────────────────────────────────
console.log('\nfillTemplate × detection')
test('real template: Detection section omitted (no double rule) when archive has no detection data', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  // 2026-04 has neither degradation nor detectionLead — the common ≤2026-05 case.
  const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
  const meta = {}
  for (const id of Object.keys(archive.services)) meta[id] = { name: id }
  const out = fillTemplate(tmpl, '2026-04', archive, meta)
  assert.ok(!out.includes('## Detection & RTT Degradation'), 'no Detection section without data')
  assert.ok(!out.includes('<!-- DETECTION_SECTION -->'), 'marker consumed on omission')
  assert.ok(!out.includes('buildDetectionSection)'), 'explainer comment removed on omission')
  assert.ok(!/---\s*\n\s*---/.test(out), 'no double horizontal rule after omission')
  assert.ok(/## API Response[\s\S]*?\n---\n[\s\S]*?## Incident Summary/.test(out), 'API Response → Incident Summary stay separated by one rule')
})
test('real template: Detection section renders when degradation/detectionLead present', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-04.json'), 'utf-8'))
  archive.degradation = { total: 12, noStatusTotal: 8, byService: { deepgram: 5 }, noStatusByService: { deepgram: 4 } }
  archive.detectionLead = { count: 6, avgLeadMs: 480000, topExamples: [{ svcId: 'mistral', incId: '01ABC', leadMs: 900000, detectedAt: '2026-04-12T14:30:00Z' }] }
  const tmpl = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
  const meta = {}
  for (const id of Object.keys(archive.services)) meta[id] = { name: id }
  const out = fillTemplate(tmpl, '2026-04', archive, meta)
  assert.ok(out.includes('## Detection & RTT Degradation'), 'section renders')
  assert.ok(!out.includes('<!-- DETECTION_SECTION -->'), 'marker consumed')
  assert.ok(!out.includes('buildDetectionSection)'), 'explainer not leaked')
  assert.ok(!/---\s*\n\s*---/.test(out.slice(out.indexOf('## API Response'), out.indexOf('## Incident Summary'))), 'no double rule around the section')
})

// ── injectNarrativeDraft (refs aiwatch-reports#4 Phase 3 / aiwatch#426) ──
//
// Renders archive.narrative (AI retrospective draft baked in by the Worker)
// into the Notable Incidents + Observations sections as fenced auto-draft
// blocks. Must be forward-compatible: archives without `narrative` keep their
// placeholders untouched.

const {
  injectNarrativeDraft,
  buildNotableIncidentsDraft,
  buildObservationsDraft,
  NOTABLE_OPEN_MARKER,
  NOTABLE_CLOSE_MARKER,
  OBSERVATIONS_OPEN_MARKER,
  OBSERVATIONS_CLOSE_MARKER,
} = require('./generate-report')

console.log('\ninjectNarrativeDraft')

const NARRATIVE_FILLED = [
  '## Incident Summary',
  '',
  '<tbody></tbody>',
  '',
  '## Notable Incidents',
  '',
  '<!-- Top 5-6 notable incidents -->',
  '',
  '### 1. [Title]',
  '',
  '## Observations',
  '',
  'Actionable takeaways per service.',
  '',
  '- **If you build on [Service]**:',
  '',
  '## Security Alerts',
].join('\n')

const SAMPLE_NARRATIVE = {
  model: 'gemma',
  generatedAt: '2026-06-01T00:05:00Z',
  notableIncidents: [
    { service: 'Gemini API', title: 'Vertex API key issue', affected: 'Gemini API — EU', durationLabel: '10 days', narrative: 'A key-rotation bug degraded Vertex auth.' },
    { service: 'Deepgram', title: 'Voice agent degradation', affected: 'Deepgram streaming', durationLabel: '74h', narrative: 'Streaming endpoints saw elevated latency.' },
  ],
  observations: [
    'Prefer Claude for latency-sensitive workloads this month.',
    'Treat Deepgram streaming as fallback-only until the fix is confirmed.',
  ],
}

test('returns filled unchanged when narrative is null/undefined (forward-compat)', () => {
  eq(injectNarrativeDraft(NARRATIVE_FILLED, null), NARRATIVE_FILLED)
  eq(injectNarrativeDraft(NARRATIVE_FILLED, undefined), NARRATIVE_FILLED)
})

test('returns filled unchanged when narrative is not an object (malformed)', () => {
  eq(injectNarrativeDraft(NARRATIVE_FILLED, 'oops'), NARRATIVE_FILLED)
  eq(injectNarrativeDraft(NARRATIVE_FILLED, 42), NARRATIVE_FILLED)
})

test('injects Notable Incidents block after the heading with each incident as a ### entry', () => {
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  assert.ok(out.includes(NOTABLE_OPEN_MARKER), 'notable open marker present')
  assert.ok(out.includes(NOTABLE_CLOSE_MARKER), 'notable close marker present')
  // Both incidents rendered, with their fields.
  assert.ok(out.includes('### 1. Vertex API key issue'), 'incident 1 heading')
  assert.ok(out.includes('### 2. Voice agent degradation'), 'incident 2 heading')
  assert.ok(out.includes('**Affected**: Gemini API — EU'))
  assert.ok(out.includes('**Duration**: 10 days'))
  assert.ok(out.includes('A key-rotation bug degraded Vertex auth.'))
  // Block sits inside ## Notable Incidents — before ## Observations.
  const notableIdx = out.indexOf(NOTABLE_OPEN_MARKER)
  const obsHeadingIdx = out.indexOf('## Observations')
  const notableHeadingIdx = out.indexOf('## Notable Incidents')
  assert.ok(notableIdx > notableHeadingIdx && notableIdx < obsHeadingIdx, 'block is inside Notable Incidents section')
})

test('injects Observations block after the heading with each observation as a bullet', () => {
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  assert.ok(out.includes(OBSERVATIONS_OPEN_MARKER), 'observations open marker present')
  assert.ok(out.includes(OBSERVATIONS_CLOSE_MARKER), 'observations close marker present')
  assert.ok(out.includes('- Prefer Claude for latency-sensitive workloads this month.'))
  assert.ok(out.includes('- Treat Deepgram streaming as fallback-only until the fix is confirmed.'))
})

test('does not touch ## Incident Summary (substring overlap with "Incidents")', () => {
  // `^## Notable Incidents$` line-anchored — must NOT splice into `## Incident Summary`.
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  const incSummaryBlock = out.slice(out.indexOf('## Incident Summary'), out.indexOf('## Notable Incidents'))
  assert.ok(!incSummaryBlock.includes(NOTABLE_OPEN_MARKER), 'Incident Summary section untouched')
})

test('preserves the template placeholders below each injected block (operator fills them)', () => {
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  assert.ok(out.includes('### 1. [Title]'), 'Notable Incidents placeholder retained')
  assert.ok(out.includes('- **If you build on [Service]**:'), 'Observations placeholder retained')
})

test('model label appears in the draft attribution line', () => {
  const out = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  assert.ok(out.includes('(gemma)'), 'gemma model attribution shown')
})

test('injects only Observations when notableIncidents is empty', () => {
  const obsOnly = { model: 'sonnet', notableIncidents: [], observations: ['Use X.'] }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, obsOnly)
  assert.ok(!out.includes(NOTABLE_OPEN_MARKER), 'no notable block when incidents empty')
  assert.ok(out.includes(OBSERVATIONS_OPEN_MARKER), 'observations block present')
})

test('injects only Notable Incidents when observations is empty', () => {
  const incOnly = { model: 'gemma', notableIncidents: SAMPLE_NARRATIVE.notableIncidents, observations: [] }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, incOnly)
  assert.ok(out.includes(NOTABLE_OPEN_MARKER), 'notable block present')
  assert.ok(!out.includes(OBSERVATIONS_OPEN_MARKER), 'no observations block when empty')
})

test('handles non-array notableIncidents / observations without crashing', () => {
  const bad = { model: 'gemma', notableIncidents: 'nope', observations: null }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, bad)
  eq(out, NARRATIVE_FILLED, 'malformed arrays → no-op')
})

test('skips malformed incident elements rather than emitting the string "undefined"', () => {
  // The Worker's parseMonthlyNarrative validates rows, but a KV round-trip +
  // manual workflow_dispatch makes a hand-edited / partial archive reachable.
  // Rows missing the load-bearing title / narrative fields must be dropped, not
  // rendered as "### 1. undefined".
  const mixed = {
    model: 'gemma',
    notableIncidents: [
      {},                                                            // all missing → skip
      { title: 'Has title only' },                                   // missing narrative → skip
      { service: 'X', title: 'Good one', narrative: 'Real prose.' },  // valid
    ],
    observations: [],
  }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, mixed)
  assert.ok(out.includes(NOTABLE_OPEN_MARKER), 'block injected (one valid row remains)')
  assert.ok(out.includes('### 1. Good one'), 'valid row rendered')
  assert.ok(!out.includes('undefined'), 'no literal "undefined" leaked into the report')
  // Soft fields absent on the valid row → em-dash fallback, not "undefined".
  assert.ok(out.includes('**Affected**: —'), 'missing affected falls back to em-dash')
  assert.ok(out.includes('**Duration**: —'), 'missing durationLabel falls back to em-dash')
})

test('skips the Notable Incidents section entirely when every incident row is malformed', () => {
  const allBad = { model: 'gemma', notableIncidents: [{}, { title: 'no narrative' }], observations: [] }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, allBad)
  assert.ok(!out.includes(NOTABLE_OPEN_MARKER), 'no fence when zero valid rows')
  assert.ok(!out.includes('undefined'), 'no "undefined" leak')
  eq(out, NARRATIVE_FILLED, 'whole-doc no-op when nothing valid')
})

test('filters non-string / empty observations rather than rendering "- null" / "- 42"', () => {
  const noisy = { model: 'sonnet', notableIncidents: [], observations: ['real bullet', null, 42, '', '  '] }
  const out = injectNarrativeDraft(NARRATIVE_FILLED, noisy)
  assert.ok(out.includes('- real bullet'), 'valid observation rendered')
  assert.ok(!out.includes('- null') && !out.includes('- 42'), 'non-string observations dropped')
})

test('idempotent — a second injection does not stack a duplicate fence', () => {
  const once = injectNarrativeDraft(NARRATIVE_FILLED, SAMPLE_NARRATIVE)
  const twice = injectNarrativeDraft(once, SAMPLE_NARRATIVE)
  const notableMarkers = (twice.match(new RegExp(NOTABLE_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  const obsMarkers = (twice.match(new RegExp(OBSERVATIONS_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  eq(notableMarkers, 1, 'exactly one Notable Incidents fence after double-inject')
  eq(obsMarkers, 1, 'exactly one Observations fence after double-inject')
})

test('buildNotableIncidentsDraft / buildObservationsDraft are fenced + carry the model label', () => {
  const nb = buildNotableIncidentsDraft(SAMPLE_NARRATIVE.notableIncidents, 'sonnet')
  assert.ok(nb.startsWith(NOTABLE_OPEN_MARKER) && nb.endsWith(NOTABLE_CLOSE_MARKER), 'notable draft fenced')
  assert.ok(nb.includes('(sonnet)'))
  const ob = buildObservationsDraft(SAMPLE_NARRATIVE.observations, 'sonnet')
  assert.ok(ob.startsWith(OBSERVATIONS_OPEN_MARKER) && ob.endsWith(OBSERVATIONS_CLOSE_MARKER), 'observations draft fenced')
})

// ── buildTrendSection (aiwatch-reports#41) — exclusion wiring (round-2 fix) ──
console.log('\nbuildTrendSection')

const fsT = require('fs')
const osT = require('os')
const pathT = require('path')

// Write two prior-month _data snapshots to a temp dir, then render the section for a current
// month supplied via the archive arg. The archive carries a normal mover (codex, declining hard)
// AND an excluded estimate-only mover (bedrock, SCORE_WITHHELD) that ALSO moves hard.
function withTrendFixture(fn) {
  const dir = fsT.mkdtempSync(pathT.join(osT.tmpdir(), 'trend-test-'))
  try {
    fsT.writeFileSync(pathT.join(dir, '2026-04.json'), JSON.stringify({
      period: '2026-04', daysCollected: 30, services: {
        codex: { score: 86, grade: 'Good', avgResolutionMin: 83, totalDowntimeMin: 578 },
        bedrock: { score: 90, grade: 'Good', avgResolutionMin: null, totalDowntimeMin: null },
      },
    }))
    fsT.writeFileSync(pathT.join(dir, '2026-05.json'), JSON.stringify({
      period: '2026-05', daysCollected: 31, services: {
        codex: { score: 82, grade: 'Good', avgResolutionMin: 468, totalDowntimeMin: 3277 },
        bedrock: { score: 90, grade: 'Good', avgResolutionMin: null, totalDowntimeMin: null },
      },
    }))
    return fn(dir)
  } finally {
    fsT.rmSync(dir, { recursive: true, force: true })
  }
}

const TREND_META = { codex: { name: 'Codex' }, bedrock: { name: 'Amazon Bedrock' } }
// Current month (2026-06): codex keeps declining; bedrock's estimate-only score swings hard.
const TREND_ARCHIVE = {
  period: '2026-06', daysCollected: 30, services: {
    codex: { score: 70, grade: 'Fair', avgResolutionMin: 600, totalDowntimeMin: 5000 },
    bedrock: { score: 55, grade: 'Fair', avgResolutionMin: null, totalDowntimeMin: null },
  },
}

test('renders a ## 3-Month Trend section with the Notable Movers list', () => {
  withTrendFixture(dir => {
    const out = buildTrendSection('2026-06', TREND_ARCHIVE, TREND_META, dir)
    assert.ok(out.includes('## 3-Month Trend'), 'has the section heading')
    assert.ok(out.includes('### Notable Movers'), 'has the Notable Movers list')
    assert.ok(out.includes('Codex'), 'normal mover present')
  })
})

test('excludes a SCORE_WITHHELD service (bedrock) from the rendered movers — the round-2 fix', () => {
  withTrendFixture(dir => {
    const out = buildTrendSection('2026-06', TREND_ARCHIVE, TREND_META, dir)
    assert.ok(!out.includes('Amazon Bedrock'), 'estimate-only bedrock must NOT surface as a trend mover')
  })
})

test('returns empty when fewer than 2 months of data exist', () => {
  const dir = fsT.mkdtempSync(pathT.join(osT.tmpdir(), 'trend-empty-'))
  try {
    // No prior _data files in dir → only the current (archive) month → <2 months.
    eq(buildTrendSection('2026-06', TREND_ARCHIVE, TREND_META, dir), '')
  } finally {
    fsT.rmSync(dir, { recursive: true, force: true })
  }
})

// ── Narrative recurrence check (aiwatch-reports#54) ──────────────────
const {
  extractNarrativeSubjects,
  detectRecurrence,
  buildRecurrenceBlock,
  injectRecurrenceCheck,
  buildMomIncidentDeltas,
  loadPriorNarrative,
  RECURRENCE_OPEN_MARKER,
  RECURRENCE_CLOSE_MARKER,
} = require('./generate-report')
const osR = require('os')
const chartsR = require('./generate-charts')
const { computeCurrentSubjects } = require('./generate-report')

// A minimal published-report fixture: a Score table (the self-contained lexicon) plus
// the three narrative slots, mirroring the real report structure.
function sampleReport({ highIncident, keyInsight, affected }) {
  return [
    '# Report',
    '',
    '## Summary',
    '',
    '- **Most reliable**: Modal (97/100)',
    `- **High incident count, fast recovery**: ${highIncident}`,
    '',
    '## Key Insight',
    '',
    keyInsight,
    '',
    '## AIWatch Score — Test 2026 Rankings',
    '',
    '| Rank | Service | Score | Grade |',
    '|------|---------|-------|-------|',
    '| 1 | Modal | 97 | Excellent |',
    '| 2 | Together AI | 84 | Good |',
    '| 3 | Mistral API | 78 | Good |',
    '| 4 | ChatGPT | 70 | Good |',
    '| 5 | Gemini API | 64 | Fair |',
    '',
    '## Notable Incidents',
    '',
    '### 1. Something broke',
    `**Affected**: ${affected}`,
    '**Duration**: 2h',
    '',
    '## Observations',
    '',
    '- done',
  ].join('\n')
}

console.log('\nextractNarrativeSubjects (aiwatch-reports#54)')

test('pulls the High-incident bullet subjects (name-before-stats)', () => {
  const md = sampleReport({
    highIncident: 'Together AI (85 incidents, 43m avg) and Mistral API (78 incidents, 19m avg)',
    keyInsight: '- **Pattern 1**: nothing',
    affected: 'Gemini API',
  })
  const s = extractNarrativeSubjects(md)
  eq(s.summary.join('|'), 'Together AI|Mistral API')
})

test('High-incident subjects are canonicalized to the lexicon (Mistral → Mistral API)', () => {
  // The flagship false-negative: a bare "Mistral" one month must fold onto "Mistral API"
  // so it matches a "Mistral API" subject next month (both are the same Score row).
  const md = sampleReport({
    highIncident: 'Mistral (97 incidents) and Together AI (139 incidents)',
    keyInsight: '- x',
    affected: 'Gemini API',
  })
  const s = extractNarrativeSubjects(md)
  eq(s.summary.join('|'), 'Mistral API|Together AI')
})

test('Key Insight subjects come from bold-lead bullets (Pattern OR free-form label), not prose', () => {
  const md = sampleReport({
    highIncident: 'Together AI (85 incidents)',
    keyInsight: [
      'Prose mentioning ChatGPT that must NOT count as a subject.',
      '',
      '- **Pattern 1 — counts**: Gemini API drove the month; unrelated Foobar ignored.',
      '- **Major-LLM concentration risk, two months running**: Mistral API stayed elevated.',
    ].join('\n'),
    affected: 'Gemini API',
  })
  const s = extractNarrativeSubjects(md)
  assert.ok(s.keyInsight.includes('Gemini API'), 'Pattern-labelled bullet subject found')
  assert.ok(s.keyInsight.includes('Mistral API'), 'free-form bold-label bullet subject found (not just "Pattern N")')
  assert.ok(!s.keyInsight.includes('ChatGPT'), 'prose-only mention excluded (scoped to bold-lead bullets)')
  assert.ok(!s.keyInsight.includes('Foobar'), 'non-lexicon token excluded')
})

test('Notable Affected expands "(also …)" and filters description noise to the lexicon', () => {
  const md = sampleReport({
    highIncident: 'Together AI (85 incidents)',
    keyInsight: '- x',
    affected: 'Gemini API (newly-created keys), Mistral API (also ChatGPT)',
  })
  const s = extractNarrativeSubjects(md)
  eq(s.notable.join('|'), 'Gemini API|Mistral API|ChatGPT')
})

test('missing sections and garbage input degrade to [] without throwing', () => {
  const empty = extractNarrativeSubjects('## Nothing here')
  eq(`${empty.summary.length}${empty.keyInsight.length}${empty.notable.length}`, '000')
  const junk = extractNarrativeSubjects(null)
  eq(`${junk.summary.length}${junk.keyInsight.length}${junk.notable.length}`, '000')
})

console.log('\ndetectRecurrence (aiwatch-reports#54)')

const PRIORS_3 = [
  { month: '2026-03', subjects: { summary: ['Together AI'], keyInsight: [], notable: [] } },
  { month: '2026-04', subjects: { summary: ['Together AI', 'Mistral API'], keyInsight: [], notable: [] } },
  { month: '2026-05', subjects: { summary: ['together ai'], keyInsight: ['ChatGPT'], notable: [] } },
]

test('flags a subject that filled the same slot in ≥2 of the last 3 months', () => {
  const flags = detectRecurrence({ summary: ['Together AI'], keyInsight: [], notable: [] }, PRIORS_3)
  eq(flags.length, 1)
  eq(flags[0].service, 'Together AI')
  eq(flags[0].slot, 'summary')
  eq(flags[0].monthsSeen.join(','), '2026-03,2026-04,2026-05') // case-insensitive match on 05
})

test('does NOT flag a subject seen in only 1 month', () => {
  const flags = detectRecurrence({ summary: ['Mistral API'], keyInsight: [], notable: [] }, PRIORS_3)
  eq(flags.length, 0)
})

test('slots are isolated — a summary repeat does not flag the notable slot', () => {
  const flags = detectRecurrence({ notable: ['Together AI'], summary: [], keyInsight: [] }, PRIORS_3)
  eq(flags.length, 0)
})

test('window caps the look-back — a 4th-oldest month is ignored', () => {
  const priors = [
    ...PRIORS_3,
    { month: '2026-02', subjects: { summary: ['Cohere API'], keyInsight: [], notable: [] } },
  ]
  // 'Cohere API' only in the 2026-02 entry, which is the 4th → outside the window of 3.
  eq(detectRecurrence({ summary: ['Cohere API'], keyInsight: [], notable: [] }, priors).length, 0)
})

test('empty prior history yields no flags', () => {
  eq(detectRecurrence({ summary: ['Together AI'] }, []).length, 0)
})

console.log('\nbuildRecurrenceBlock / injectRecurrenceCheck (aiwatch-reports#54)')

test('no flags → empty block (clean omission)', () => {
  eq(buildRecurrenceBlock([]), '')
  eq(buildRecurrenceBlock([], { currentMonth: '2026-06' }), '')
})

test('block carries the delete-before-merge fence + MoM hint', () => {
  const block = buildRecurrenceBlock(
    [{ service: 'Together AI', slot: 'summary', monthsSeen: ['2026-04', '2026-05'] }],
    { currentMonth: '2026-06', priorCount: 2, momByService: { 'Together AI': { prev: 133, curr: 85 } } },
  )
  assert.ok(block.startsWith(RECURRENCE_OPEN_MARKER), 'opens with fence marker')
  assert.ok(block.includes('DELETE this entire block before merge'), 'delete-before-merge instruction present')
  assert.ok(block.trim().endsWith(RECURRENCE_CLOSE_MARKER), 'closes with fence marker')
  assert.ok(block.includes('Together AI'), 'names the subject')
  assert.ok(block.includes('133 → this month 85'), 'MoM delta rendered')
})

test('injects the block above "## Summary" and is idempotent', () => {
  const block = buildRecurrenceBlock(
    [{ service: 'Together AI', slot: 'summary', monthsSeen: ['2026-04', '2026-05'] }],
    { currentMonth: '2026-06', priorCount: 2 },
  )
  const once = injectRecurrenceCheck('intro\n\n## Summary\n\n- bullet', block)
  assert.ok(once.indexOf(RECURRENCE_OPEN_MARKER) < once.indexOf('## Summary'), 'block sits above Summary')
  const twice = injectRecurrenceCheck(once, block)
  eq(twice, once) // idempotent — open marker already present
  const markerCount = (twice.match(new RegExp(RECURRENCE_OPEN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  eq(markerCount, 1)
})

test('empty block is a no-op injection', () => {
  eq(injectRecurrenceCheck('## Summary\n\n- x', ''), '## Summary\n\n- x')
})

console.log('\nbuildMomIncidentDeltas + loadPriorNarrative (aiwatch-reports#54)')

test('buildMomIncidentDeltas pairs this-month vs last-month incident counts', () => {
  const dir = fsT.mkdtempSync(pathT.join(osR.tmpdir(), 'mom-'))
  try {
    const togetherId = chartsR.nameToId('Together AI')
    // prev month for '2026-06' is '2026-05'
    fsT.writeFileSync(pathT.join(dir, '2026-05.json'), JSON.stringify({
      archive: { services: { [togetherId]: { incidents: 133 } } },
    }))
    const archive = { services: { [togetherId]: { score: 84, grade: 'good', incidents: 85, totalDowntimeMin: 60, avgResolutionMin: 40 } } }
    const meta = { [togetherId]: { name: 'Together AI' } }
    const map = buildMomIncidentDeltas(archive, meta, '2026-06', { dataDir: dir })
    eq(map['Together AI'].curr, 85)
    eq(map['Together AI'].prev, 133)
  } finally {
    fsT.rmSync(dir, { recursive: true, force: true })
  }
})

test('buildMomIncidentDeltas returns {} when the prior _data archive is absent (graceful)', () => {
  const dir = fsT.mkdtempSync(pathT.join(osR.tmpdir(), 'mom-empty-'))
  try {
    const archive = { services: { together: { score: 84, incidents: 85 } } }
    eq(Object.keys(buildMomIncidentDeltas(archive, { together: { name: 'Together AI' } }, '2026-06', { dataDir: dir })).length, 0)
  } finally {
    fsT.rmSync(dir, { recursive: true, force: true })
  }
})

test('computeCurrentSubjects derives slots from archive data (top-incident → summary)', () => {
  const dir = fsT.mkdtempSync(pathT.join(osR.tmpdir(), 'cur-'))
  try {
    const mid = chartsR.nameToId('Mistral API')
    const tid = chartsR.nameToId('Together AI')
    const archive = { services: {
      [mid]: { score: 78, grade: 'good', incidents: 155, totalDowntimeMin: 60, avgResolutionMin: 19 },
      [tid]: { score: 84, grade: 'good', incidents: 133, totalDowntimeMin: 90, avgResolutionMin: 43 },
    } }
    const meta = { [mid]: { name: 'Mistral API' }, [tid]: { name: 'Together AI' } }
    const s = computeCurrentSubjects(archive, meta, '2026-06', { dataDir: dir }) // no _data → movers drop
    eq(s.summary.slice().sort().join('|'), 'Mistral API|Together AI') // top-2 incident counts
    assert.ok(s.keyInsight.includes('Mistral API'), 'top-incident feeds keyInsight too')
  } finally {
    fsT.rmSync(dir, { recursive: true, force: true })
  }
})

test('computeCurrentSubjects returns empty slots for an empty archive (no throw)', () => {
  const s = computeCurrentSubjects({ services: {} }, {}, '2026-06', { dataDir: fsT.mkdtempSync(pathT.join(osR.tmpdir(), 'cur-empty-')) })
  eq(`${s.summary.length}${s.keyInsight.length}${s.notable.length}`, '000')
})

test('loadPriorNarrative skips months with no index.md (never throws)', () => {
  const root = fsT.mkdtempSync(pathT.join(osR.tmpdir(), 'prior-'))
  try {
    // Only 2026-05 exists; 2026-03/04 are absent → skipped, not thrown.
    fsT.mkdirSync(pathT.join(root, '2026-05'))
    fsT.writeFileSync(pathT.join(root, '2026-05', 'index.md'), sampleReport({
      highIncident: 'Together AI (133 incidents)', keyInsight: '- x', affected: 'Gemini API',
    }))
    const prior = loadPriorNarrative('2026-06', { rootDir: root })
    eq(prior.length, 1)
    eq(prior[0].month, '2026-05')
    eq(prior[0].subjects.summary.join('|'), 'Together AI')
  } finally {
    fsT.rmSync(root, { recursive: true, force: true })
  }
})

// ── buildComponentReliabilitySection (aiwatch#605 Phase 3b) ─────────
console.log('\nbuildComponentReliabilitySection (#605 Phase 3b)')
const crMeta = { services: {} }
// aiwatch-reports#73 — per-component counting is younger than the report, and a service whose status
// page goes dark stops contributing days. The intro must not call the window "monthly".
test('the intro claims no monthly window (the ratio covers only the readable days)', () => {
  const out = buildComponentReliabilitySection(
    { services: { deepgram: { components: [{ id: 'a', name: 'A', uptime: 65.81 }, { id: 'b', name: 'B', uptime: 100 }] } } },
    { deepgram: { name: 'Deepgram' } },
  )
  assert.ok(out.includes('## Component Reliability'), out)
  assert.ok(!/monthly per-component/.test(out), `the window is not the month: ${out.slice(0, 300)}`)
  assert.ok(/over the days AIWatch could read its status page/.test(out), out)
  // …and it must point the reader at the definition, since this number is not the service uptime.
  assert.ok(/About This Report/.test(out), out)
})
test('omits the section when no service has components', () => {
  eq(buildComponentReliabilitySection({ services: { openai: { score: 90 } } }, crMeta), '')
  eq(buildComponentReliabilitySection({}, crMeta), '')
  eq(buildComponentReliabilitySection(null, crMeta), '')
})
test('omits a service whose weakest component is >= 99.9% (all-healthy → no row)', () => {
  const out = buildComponentReliabilitySection({ services: {
    groq: { components: [{ id: 'a', name: 'API', uptime: 99.95 }, { id: 'b', name: 'Console', uptime: 100 }] },
  } }, crMeta)
  eq(out, '') // both healthy → nothing qualifies
})
test('renders one weakest-component row per qualifying service, weakest-first', () => {
  const out = buildComponentReliabilitySection({ services: {
    openai: { components: [{ id: 'l', name: 'Login', uptime: 99.66 }, { id: 'c', name: 'Chat Completions', uptime: 99.98 }] },
    chatgpt: { components: [{ id: 'conv', name: 'Conversations', uptime: 99.20 }, { id: 'x', name: 'Sync', uptime: 99.99 }] },
    groq: { components: [{ id: 'a', name: 'API', uptime: 100 }, { id: 'b', name: 'Console', uptime: 100 }] }, // all healthy → skipped
  } }, { openai: { name: 'OpenAI API' }, chatgpt: { name: 'ChatGPT' }, groq: { name: 'Groq Cloud' } })
  assert.ok(out.includes('## Component Reliability'), 'has heading')
  assert.ok(out.trimEnd().endsWith('---'), 'ends with a rule')
  // ChatGPT (99.20) before OpenAI (99.66); groq absent
  const rowOrder = [...out.matchAll(/\| (ChatGPT|OpenAI API|Groq[^|]*) \|/g)].map(m => m[1].trim())
  assert.deepStrictEqual(rowOrder, ['ChatGPT', 'OpenAI API'])
  assert.ok(out.includes('| ChatGPT | Conversations | 99.20% | 2 |'), 'weakest component + uptime + count')
  assert.ok(!out.includes('Groq'), 'all-healthy service skipped')
})
test('skips a single-component service (needs >=2)', () => {
  eq(buildComponentReliabilitySection({ services: {
    solo: { components: [{ id: 'a', name: 'API', uptime: 98 }] },
  } }, crMeta), '')
})
test('threshold boundary: a component at exactly 99.9 is omitted (>= is exclusive of the table)', () => {
  eq(buildComponentReliabilitySection({ services: {
    svc: { components: [{ id: 'a', name: 'API', uptime: 99.9 }, { id: 'b', name: 'Web', uptime: 100 }] },
  } }, { svc: { name: 'Svc' } }), '')
})
test('a NaN / non-finite weakest uptime is dropped (no NaN% row)', () => {
  const out = buildComponentReliabilitySection({ services: {
    bad: { components: [{ id: 'a', name: 'API', uptime: NaN }, { id: 'b', name: 'Web', uptime: 100 }] },
    ok: { components: [{ id: 'c', name: 'Core', uptime: 98.5 }, { id: 'd', name: 'Edge', uptime: 100 }] },
  } }, { bad: { name: 'Bad' }, ok: { name: 'Ok' } })
  assert.ok(!out.includes('NaN'), 'no NaN cell')
  assert.ok(out.includes('| Ok | Core | 98.50% | 2 |') && !out.includes('| Bad |'), 'bad dropped, ok kept')
})
test('escapes a literal pipe in a component name so the row is not broken', () => {
  const out = buildComponentReliabilitySection({ services: {
    svc: { components: [{ id: 'a', name: 'A | B', uptime: 97 }, { id: 'b', name: 'Web', uptime: 100 }] },
  } }, { svc: { name: 'Svc' } })
  assert.ok(out.includes('A \\| B'), 'pipe escaped')
})

// ── aiwatch#951: the archive is trusted, so an untrustworthy archive must be LOUD ────────
console.log('\nfindUptimeInconsistencies / emitUptimeWarnings (aiwatch#951)')
const MODERN_OK = [
  { id: 'groq', data: { officialUptime: 100, scoreConfidence: 'high' } },
  { id: 'openrouter', data: { officialUptime: null, scoreConfidence: 'medium', uptime: 100 } },
]
test('a correct modern archive produces no warnings', () => {
  eq(findUptimeInconsistencies(MODERN_OK).length, 0)
})
test('flags an official uptime the Score did not consume (the #951 shape)', () => {
  const msgs = findUptimeInconsistencies([
    { id: 'stability', data: { officialUptime: 100, scoreConfidence: 'medium' } },
  ])
  eq(msgs.length, 1)
  assert.ok(msgs[0].includes('stability'), msgs[0])
  assert.ok(msgs[0].includes('scoreConfidence="medium"'), msgs[0])
})
test('flags an archive built before aiwatch#962 as UNVERIFIED (no scoreConfidence)', () => {
  // Concretely: the aiwatch#962 deploy slipping past 2026-08-01 would let the OLD worker write
  // July's archive with the sticky-last-non-null contamination, which looks identical to a good one.
  const msgs = findUptimeInconsistencies([
    { id: 'groq', data: { officialUptime: 100 } },
    { id: 'stability', data: { officialUptime: 100 } },
  ])
  eq(msgs.length, 1)
  assert.ok(msgs[0].includes('UNVERIFIED'), msgs[0])
})
test('a legacy archive with no officialUptime at all is not flagged (nothing to distrust)', () => {
  eq(findUptimeInconsistencies([{ id: 'cohere', data: { uptime: 100 } }]).length, 0)
})
test('bedrock is never flagged — the hard guard already forces it to null', () => {
  eq(findUptimeInconsistencies([{ id: 'bedrock', data: { officialUptime: 100, scoreConfidence: 'low' } }]).length, 0)
})
test('a partially-migrated archive still flags its contradictory rows', () => {
  // `hasProvenance` is true (one service carries the field), so the UNVERIFIED line is suppressed —
  // but a contradictory row must still be caught. Field-less rows are simply undecidable.
  const msgs = findUptimeInconsistencies([
    { id: 'groq', data: { officialUptime: 100, scoreConfidence: 'high' } },
    { id: 'stability', data: { officialUptime: 100, scoreConfidence: 'medium' } },
    { id: 'legacy', data: { officialUptime: 99 } },
  ])
  eq(msgs.length, 1)
  assert.ok(msgs[0].includes('stability'), msgs[0])
  assert.ok(!msgs.some(m => m.includes('UNVERIFIED')), 'provenance exists → no archive-level warning')
})

// FAIL-SAFE, not fail-loud: a warning in a CI log is not seen by whoever reviews the draft PR.
// A value the Score never consumed is wrong by construction, so it must never reach the page.
console.log('\ncontradictory archive rows are WITHHELD, not merely warned about (aiwatch#951)')
const CONTRADICTORY = { id: 'stability', data: { incidents: 0, uptime: 100, officialUptime: 100, scoreConfidence: 'medium' } }
test('officialUptimeFor withholds the value', () => {
  eq(officialUptimeFor(CONTRADICTORY), null)
})
test('uptimeSourceLabel does not claim "Official"', () => {
  eq(uptimeSourceLabel(CONTRADICTORY), 'No official uptime')
})
test('buildWhy does not quote the withheld figure, and claims nothing about the provider', () => {
  // The archive DID carry a figure; we withheld it because it contradicted the Score. Saying
  // "no published uptime" would assert a provider fact the archive contradicts — the same class of
  // false claim as the "Official · 100.00%" this issue removes. Say only what we know.
  eq(buildWhy(CONTRADICTORY, 'stability'), 'Zero incidents')
})
test('buildUptimeTable omits the row', () => {
  eq(buildUptimeTable([CONTRADICTORY], { stability: { name: 'Stability AI' } }), '')
})
test('the caption does not call a withheld service a non-publisher', () => {
  eq(buildUptimeExclusionNote([CONTRADICTORY], { stability: { name: 'Stability AI' } }), '')
})
test('a legacy regeneration never calls ChatGPT a non-publisher', () => {
  // chatgpt is suppressed from a legacy table because its daily-counter `uptime` is known-bad, NOT
  // because it publishes nothing (it publishes ~99%). The old hardcoded caption never listed it.
  const legacy = [{ id: 'chatgpt', data: { uptime: 72.78 } }, { id: 'gemini', data: { uptime: 94 } }]
  const note = buildUptimeExclusionNote(legacy, { chatgpt: { name: 'ChatGPT' }, gemini: { name: 'Gemini API' } })
  eq(officialUptimeFor(legacy[0]), null)  // still out of the table…
  assert.ok(!note.includes('ChatGPT'), `…but not a non-publisher: ${note}`)
  assert.ok(note.includes('Gemini API'), note)
})
test('a consistent high-confidence row is untouched', () => {
  const ok = { id: 'groq', data: { incidents: 0, uptime: 100, officialUptime: 100, scoreConfidence: 'high' } }
  eq(officialUptimeFor(ok), 100)
  eq(uptimeSourceLabel(ok), 'Official')
  eq(buildWhy(ok, 'groq'), 'Zero incidents, 100.00% uptime')
})

// The caption under the Official Uptime table used to hardcode the NO_PUBLIC_UPTIME names in prose —
// a third copy of the taxonomy. It said "Mistral … excluded from this table" while Mistral sat IN it.
console.log('\nbuildUptimeExclusionNote is rendered from the same gate as the table (aiwatch#951)')
const NOTE_META = { bedrock: { name: 'Amazon Bedrock' }, xai: { name: 'xAI' }, openrouter: { name: 'OpenRouter' }, groq: { name: 'Groq Cloud' }, mistral: { name: 'Mistral API' } }
test('names exactly the services the table omits, alphabetically', () => {
  const svcs = [
    { id: 'groq', data: { officialUptime: 100 } },
    { id: 'mistral', data: { officialUptime: 99.559 } },
    { id: 'bedrock', data: { officialUptime: 100 } },
    { id: 'openrouter', data: { officialUptime: null } },
  ]
  const note = buildUptimeExclusionNote(svcs, NOTE_META)
  assert.ok(note.includes('Amazon Bedrock, and OpenRouter') || note.includes('Amazon Bedrock and OpenRouter'), note)
  assert.ok(!note.includes('Mistral'), `Mistral is IN the table now — the caption must not exclude it: ${note}`)
  assert.ok(!note.includes('Groq'), note)
})
test('never contradicts buildUptimeTable — a service is never in both', () => {
  // "Never both" is the real invariant, not "exactly one": a row we withhold (chatgpt legacy
  // suppression, or a figure contradicting the Score) is in neither, and must not be explained as
  // a provider that publishes nothing.
  const svcs = [
    { id: 'groq', data: { officialUptime: 100 } },
    { id: 'mistral', data: { officialUptime: 99.559 } },
    { id: 'openrouter', data: { officialUptime: null } },
    { id: 'bedrock', data: { officialUptime: 100 } },
  ]
  const rows = buildUptimeTable(svcs, NOTE_META)
  const note = buildUptimeExclusionNote(svcs, NOTE_META)
  for (const s of svcs) {
    const name = NOTE_META[s.id].name
    const inTable = rows.includes(`<td>${name}</td>`)
    const inNote = note.includes(name)
    assert.ok(!(inTable && inNote), `${name}: listed in the table AND named as a non-publisher`)
    assert.ok(inTable || inNote, `${name}: this fixture has no withheld rows, so it must appear somewhere`)
  }
})
test('keeps the xAI explainer only when xAI is actually excluded', () => {
  const withXai = buildUptimeExclusionNote([{ id: 'xai', data: { officialUptime: null } }], NOTE_META)
  assert.ok(withXai.includes('status.x.ai'), withXai)
  assert.ok(/xAI does not publish .* on its status page — it's excluded/.test(withXai), `singular grammar: ${withXai}`)
  const withoutXai = buildUptimeExclusionNote([{ id: 'openrouter', data: { officialUptime: null } }], NOTE_META)
  assert.ok(!withoutXai.includes('status.x.ai'), withoutXai)
})
test('collapses to an empty string when every service publishes uptime', () => {
  eq(buildUptimeExclusionNote([{ id: 'groq', data: { officialUptime: 100 } }], NOTE_META), '')
})

// aiwatch-reports#74 — the template used to hand-slug this anchor and ask a human to substitute a
// lowercase [month]/[year] that the generator never replaced. April and May were substituted by hand;
// June shipped `#aiwatch-score--[month]-[year]-reliability-rankings`, a dead link.
console.log('\nkramdownAnchor / anchorForHeading (aiwatch-reports#74)')
test('reproduces the ids Jekyll actually emitted for the June 2026 report', () => {
  // Captured from the rendered HTML — all 22 heading ids matched this rule.
  eq(kramdownAnchor('AIWatch Score — June 2026 Reliability Rankings'), 'aiwatch-score--june-2026-reliability-rankings')
  eq(kramdownAnchor('API Response Time — Monthly p75'), 'api-response-time--monthly-p75')
  eq(kramdownAnchor('Official Uptime (Primary Component)'), 'official-uptime-primary-component')
})
test('an em-dash (and an &) is DELETED, so its surrounding spaces become a double hyphen', () => {
  // The gotcha the old template comment tried to explain in prose, now executable.
  eq(kramdownAnchor('A — B'), 'a--b')
  eq(kramdownAnchor('Detection & RTT Degradation'), 'detection--rtt-degradation')
})
test('leading digits survive', () => {
  eq(kramdownAnchor('3-Month Trend'), '3-month-trend')
  eq(kramdownAnchor('1. Codex — one incident'), '1-codex--one-incident')
})
test('anchorForHeading derives from the heading that actually shipped', () => {
  const md = '# t\n\n## AIWatch Score — May 2026 Reliability Rankings\n\nbody\n'
  eq(anchorForHeading(md, /^## (AIWatch Score .*)$/m), 'aiwatch-score--may-2026-reliability-rankings')
})
test('anchorForHeading throws rather than emitting a dead link', () => {
  assert.throws(() => anchorForHeading('# nothing here\n', /^## (AIWatch Score .*)$/m), /no heading matched/)
})

console.log('\nNEVER_PUBLISHES_UPTIME stays in lockstep with SCORE_WITHHELD')
test('the two sets encode the same providers (incident-feed-only → no uptime to publish)', () => {
  // They live in different files for different reasons; if a future gcloud-incident-only service is
  // added to one but not the other, the #29 stray-row / mislabel class of bug comes straight back.
  const { SCORE_WITHHELD } = require('./generate-charts')
  assert.deepEqual([...SCORE_WITHHELD].sort(), ['azureopenai', 'bedrock'])
})
test('emitUptimeWarnings annotates on stdout in CI, warns on stderr locally', () => {
  // The annotation goes to stdout (matching lint-recurrence.js / @actions/core); the local
  // fallback goes to stderr. Capture both channels separately so a swap can't pass silently.
  const out = [], err = []
  const realLog = console.log, realWarn = console.warn
  console.log = m => out.push(m); console.warn = m => err.push(m)
  let counts
  try {
    counts = [emitUptimeWarnings(['boom'], { GITHUB_ACTIONS: 'true' }), emitUptimeWarnings(['boom'], {})]
  } finally { console.log = realLog; console.warn = realWarn }
  eq(out.length, 1); eq(err.length, 1)
  assert.ok(out[0].startsWith('::warning::'), out[0])
  assert.ok(err[0].startsWith('[generate-report] WARNING: '), err[0])
  assert.deepEqual(counts, [1, 1])
})

console.log('\nofficialUptimeFor — legible failure on the pre-#951 signature')
test('throws a clear TypeError when handed a bare id string', () => {
  assert.throws(() => officialUptimeFor('bedrock'), /expects a \{ id, data \} service/)
})

console.log('\nbuildUptimeTable row membership (aiwatch#951)')
test('mistral/perplexity appear; openrouter/stability do not', () => {
  const services = [
    { id: 'mistral', data: { uptime: 87.29, officialUptime: 99.559 } },
    { id: 'perplexity', data: { uptime: 99.98, officialUptime: 100 } },
    { id: 'openrouter', data: { uptime: 100, officialUptime: null } },
    { id: 'stability', data: { uptime: 100, officialUptime: null } },
    { id: 'bedrock', data: { uptime: 100, officialUptime: 100 } },
  ]
  const meta = { mistral: { name: 'Mistral API' }, perplexity: { name: 'Perplexity' }, openrouter: { name: 'OpenRouter' }, stability: { name: 'Stability AI' }, bedrock: { name: 'Amazon Bedrock' } }
  const rows = buildUptimeTable(services, meta)
  assert.ok(rows.includes('Mistral API'), 'mistral publishes real uptime → row')
  assert.ok(rows.includes('Perplexity'), 'perplexity publishes real uptime → row')
  assert.ok(!rows.includes('OpenRouter'), 'openrouter publishes none → no row')
  assert.ok(!rows.includes('Stability AI'), 'stability publishes none → no row')
  assert.ok(!rows.includes('Amazon Bedrock'), 'hard guard survives a contaminated archive')
})

console.log('\nzero-incident split keys off the INCIDENT feed, not the uptime taxonomy (aiwatch#951)')
test('perplexity with a zero-incident month is a confirmed zero', () => {
  const services = [
    { id: 'perplexity', data: { incidents: 0, officialUptime: 100, scoreConfidence: 'high' } },
    { id: 'bedrock', data: { incidents: 0, officialUptime: null, scoreConfidence: 'low' } },
  ]
  const { zeroIncLine } = buildIncidentTable(services, { perplexity: { name: 'Perplexity' }, bedrock: { name: 'Amazon Bedrock' } })
  assert.ok(/Zero incidents \(2 services\):\*\* Perplexity, Amazon Bedrock — confirmed/.test(zeroIncLine), zeroIncLine)
  assert.ok(!/No incident feed/.test(zeroIncLine), `the bucket rested on a false premise: ${zeroIncLine}`)
})


// ── report-wide ratchet (aiwatch-reports#75) ────────────────────────────────
// The per-function `!/…/` guards elsewhere pin a claim's absence from ONE builder's output. Half the
// ten corrected claims live in _templates/monthly-report.md — static prose no builder produces, so
// nothing stopped them returning there. fillTemplate splices every builder INTO that template, so a
// single full render ratchets both surfaces at once.
console.log('\nreport-wide false-claim ratchet (#75)')

const REAL_TEMPLATE = fs.readFileSync(path.join(__dirname, '..', '_templates', 'monthly-report.md'), 'utf-8')
const REAL_ARCHIVE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_data', '2026-05.json'), 'utf-8'))

const RETIRED_CLAIMS = [
  [/no reliable incident feed/i,          'bedrock reads AWS Health events JSON (aiwatch#677); azureopenai an Azure RSS'],
  [/migrated to a platform/i,             'cause-free stale caveat — we do not know why a feed froze'],
  [/industry-average/i,                   'aiwatch#713 deleted the invented uptime estimate'],
  [/monthly per-component/i,              'Component Reliability is a poll ratio, not a monthly per-component figure'],
  [/derived from p75 probe RTT/i,         'computeResponsiveness reads ProbeSummary.p50 + cvCombined; ProbeSummary has no p75'],
  [/reflect all affected components per service/i, 'counts are published incidents; Anthropic is single-component but posts per model'],
  [/single-component figures/i,           'parseIncidentIoUptime is worst-of a component LIST; BetterStack averages resources'],
  [/scored — and ranked — on what can actually be measured/i, 'a low-confidence service is withheld, not ranked'],
  [/Score reflect/i,                      'removed overclaim'],
  [/still has a probe \(Gemini, xAI, OpenRouter\)/, 'the medium-confidence set was 7 services in June 2026, not 3'],
  [/neither uptime nor a probe \(Amazon Bedrock, Azure OpenAI\)/, 'characterai joined that set in June 2026'],
  [/without probe coverage \([^)]*\) are excluded from rankings/, 'no probe alone never unranks a service — Modal ranked #2 in June 2026 without one'],
  [/Partial \(Nd\)/,                     'uptimeSourceLabel emits only Official / No official uptime; #45 excludes short-window services instead'],
]

/**
 * The real 2026-05 archive has no stale-flagged service and no `components`, so a render of it
 * never emits the stale caveat or the Component Reliability intro — three of the nine regexes below
 * would pass vacuously. Force every conditional section to render.
 */
function archiveExercisingEverySection(base) {
  const a = JSON.parse(JSON.stringify(base))
  const ids = Object.keys(a.services)
  a.services[ids[0]].incidentSourceStale = true            // → stale caveat + stale ranking clause
  a.services[ids[1]].components = [                        // → Component Reliability section
    { name: 'API', uptime: 98.7 }, { name: 'Console', uptime: 99.99 },
  ]
  a.services[ids[2]] = { ...a.services[ids[2]], score: null, scoreConfidence: 'low' } // → withheld clause (data path)
  return a
}

test('no retired false claim survives a full report render', () => {
  const out = fillTemplate(REAL_TEMPLATE, '2026-05', REAL_ARCHIVE, {})
  for (const [re, why] of RETIRED_CLAIMS) assert.ok(!re.test(out), `retired claim resurfaced (${why}): ${re}`)
})

test('the ratchet actually exercises every conditional section', () => {
  // Guard the guard: if a future template change drops one of these sections, the regexes that
  // target it start passing for the wrong reason.
  const out = fillTemplate(REAL_TEMPLATE, '2026-05', archiveExercisingEverySection(REAL_ARCHIVE), {})
  assert.match(out, /excluded from this ranking/, 'withheld/stale ranking clause must render')
  assert.match(out, /no longer read/, 'stale caveat must render')
  assert.match(out, /Component Reliability/, 'component reliability section must render')
  for (const [re, why] of RETIRED_CLAIMS) assert.ok(!re.test(out), `retired claim resurfaced (${why}): ${re}`)
})

test('a full render leaves no unresolved placeholder or dead anchor', () => {
  const out = fillTemplate(REAL_TEMPLATE, '2026-05', REAL_ARCHIVE, {})
  const leftovers = out.match(/\[[A-Z_]{4,}\]/g) || []
  assert.deepStrictEqual(leftovers, [], `unsubstituted placeholders: ${leftovers.join(', ')}`)
  assert.ok(!/#aiwatch-score--\[/.test(out), 'the AIWatch Score anchor must not embed a placeholder')
})

console.log('\nwithheld membership tracks the DATA, not a hardcoded id-set (#75)')

const mkSvc = (id, score, conf) => ({ id, data: { score, grade: score ? 'good' : null, uptime: null, incidents: 0, avgResolutionMin: null, ...(conf ? { scoreConfidence: conf } : {}) } })
const WMETA = { modal: { name: 'Modal' }, bedrock: { name: 'Amazon Bedrock' }, azureopenai: { name: 'Azure OpenAI' }, newlow: { name: 'New Low Svc' } }

test('a modern archive (score=null, confidence=low) still explains the exclusion', () => {
  // aiwatch#713 withholds by emitting score:null; `scored = filter(score !== null)` dropped them
  // FIRST, so the note collapsed to '' — the ranking lost bedrock/azureopenai with no reason given.
  // The June 2026 archive already has this shape.
  const note = buildRankingNote([mkSvc('modal', 97, 'high'), mkSvc('bedrock', null, 'low'), mkSvc('azureopenai', null, 'low')], WMETA, '2026-07')
  assert.notStrictEqual(note, '', 'the note must not collapse on a modern archive')
  assert.ok(note.includes('Amazon Bedrock') && note.includes('Azure OpenAI'), note)
  assert.match(note, /1 of 3 services ranked/, 'the denominator counts every service considered')
})

test('the withheld clause keeps its negation in the PLURAL branch', () => {
  // SCORE_WITHHELD has two members, so production always renders the plural — the singular guard
  // never runs on the shipped sentence.
  const note = buildRankingNote([mkSvc('modal', 97, 'high'), mkSvc('bedrock', null, 'low'), mkSvc('azureopenai', null, 'low')], WMETA, '2026-07')
  assert.ok(/are excluded/.test(note), `plural branch not taken: ${note}`)
  assert.ok(!/ publish an official uptime metric/.test(note), `plural negation lost: ${note}`)
  assert.ok(!/ have (a )?direct latency probe/.test(note), `plural negation lost: ${note}`)
  assert.ok(/no official uptime/.test(note) && /no direct latency probe/.test(note), note)
})

test('a NEW low-confidence service is named even though the id-set is stale', () => {
  const note = buildRankingNote([mkSvc('modal', 97, 'high'), mkSvc('newlow', null, 'low')], WMETA, '2026-07')
  assert.ok(note.includes('New Low Svc'), `a low-confidence service outside SCORE_WITHHELD vanished silently: ${note}`)
})

test('a legacy archive (score=90, no scoreConfidence) still uses the id-set', () => {
  const note = buildRankingNote([mkSvc('modal', 97), mkSvc('bedrock', 90)], WMETA, '2026-07')
  assert.ok(note.includes('Amazon Bedrock'), `the id-set must still cover pre-scoreConfidence archives: ${note}`)
  assert.match(note, /1 of 2 services ranked/)
})

test('the stale clause agrees in number', () => {
  const st = id => ({ id, data: { score: 70, grade: 'good', uptime: null, incidents: 0, avgResolutionMin: null, incidentSourceStale: true } })
  const ok = { id: 'm', data: { score: 90, grade: 'excellent', uptime: 99, incidents: 0, avgResolutionMin: null } }
  const meta = { a: { name: 'DeepSeek API' }, b: { name: 'Character.AI' }, m: { name: 'Modal' } }
  assert.match(buildRankingNote([ok, st('a')], meta, '2026-07'), /its incident feed is frozen/)
  const two = buildRankingNote([ok, st('a'), st('b')], meta, '2026-07')
  assert.match(two, /their incident feeds are frozen/)
  assert.ok(!/their incident feed is/.test(two), 'plural subject took a singular verb')
})


test('a frozen-feed service with a null Score is still named and still counted', () => {
  // The twin of the withheld bug: `stale = scored.filter(...)` also ran behind a `score !== null`
  // prefilter, so Character.AI (frozen feed, no uptime, no probe that month → null Score) vanished
  // from the ranking, from the stale clause, AND from the denominator. June 2026 printed
  // "30 of 38 services ranked" for an archive holding 41.
  const frozenNull = { id: 'characterai', data: { score: null, grade: null, uptime: null, incidents: 0, avgResolutionMin: null, incidentSourceStale: true } }
  const ok = { id: 'modal', data: { score: 90, grade: 'excellent', uptime: 99, incidents: 0, avgResolutionMin: null } }
  const meta = { characterai: { name: 'Character.AI' }, modal: { name: 'Modal' } }
  const note = buildRankingNote([ok, frozenNull], meta, '2026-07')
  assert.ok(note.includes('Character.AI'), `a null-Score stale service vanished: ${note}`)
  assert.match(note, /1 of 2 services ranked/, 'it must remain in the denominator')
  assert.match(note, /its incident feed is frozen/, 'and be explained by the STALE clause, not the withheld one')
})

test('every service lands in exactly one group — ranked, withheld, stale, or recent', () => {
  const mk = (id, over) => ({ id, data: { score: 80, grade: 'good', uptime: 99, incidents: 0, avgResolutionMin: null, ...over } })
  const services = [
    mk('modal'),                                                     // ranked
    mk('bedrock', { score: null, scoreConfidence: 'low' }),          // withheld (data)
    mk('azureopenai', { score: 88 }),                                // withheld (legacy id-set)
    mk('characterai', { score: null, incidentSourceStale: true }),   // stale, null score
    mk('deepseek', { incidentSourceStale: true }),                   // stale, has score
    mk('newsvc', { addedAt: '2026-07-15' }),                         // recent (field is addedAt)
  ]
  const meta = Object.fromEntries(services.map(s => [s.id, { name: s.id }]))
  const note = buildRankingNote(services, meta, '2026-07')
  // 6 services: 1 ranked + 2 withheld + 2 stale + 1 recent
  assert.match(note, /1 of 6 services ranked/, note)
  for (const id of ['bedrock', 'azureopenai', 'characterai', 'deepseek', 'newsvc']) {
    assert.ok(note.includes(id), `${id} was excluded without explanation: ${note}`)
  }
  // A withheld service must not ALSO appear in the stale clause.
  const staleClause = note.slice(note.indexOf('can no longer read'))
  assert.ok(!staleClause.includes('bedrock'), 'withheld service double-listed as stale')
})


test('uptimeSourceLabel emits exactly two labels — there is no Partial', () => {
  // The template taught a third label the generator cannot produce. Its one historical use was
  // hand-typed as "Partial (9-day)" (not the "(Nd)" the legend showed), and reports#45 now excludes
  // a short-window service from the ranking entirely rather than labelling its row.
  const labels = new Set([
    uptimeSourceLabel({ id: 'groq', data: { officialUptime: 100, scoreConfidence: 'high' } }, 'groq'),
    uptimeSourceLabel({ id: 'openrouter', data: { officialUptime: null } }, 'openrouter'),
    uptimeSourceLabel({ id: 'bedrock', data: {} }, 'bedrock'),
  ])
  assert.deepStrictEqual([...labels].sort(), ['No official uptime', 'Official'])
  for (const l of labels) assert.ok(!/Partial/.test(l), `unexpected label: ${l}`)
})


test('every About This Report link names the bullet it points at', () => {
  // The bullets carry no anchors of their own (kramdown only auto-ids headings), so the link lands
  // at the section top and the "→ Bullet" suffix is the only thing telling a reader where to look.
  // Three of six references omitted it.
  const out = fillTemplate(REAL_TEMPLATE, '2026-05', archiveExercisingEverySection(REAL_ARCHIVE), {})
  const links = [...out.matchAll(/\[([^\]]*About This Report[^\]]*)\]\(#about-this-report\)/g)].map(m => m[1])
  assert.ok(links.length >= 3, `expected several methodology links, found ${links.length}`)
  for (const text of links) {
    assert.match(text, /^About This Report → \S/, `link text must name its bullet: "${text}"`)
  }
})


test('the stale caveat truncates the incident COUNT, never the uptime', () => {
  // AIWatch keeps polling a stale-feed service: Character.AI's June incident feed froze on 15 Jun,
  // yet its daily ok/total counters were recorded all 30 days (measured uptime 98.03). An official
  // uptime, when the page stops publishing one, goes ABSENT rather than partial. The old caveat
  // said "the incident count and uptime cover only the window up to that cutoff" — the data says no.
  const caveat = buildStaleSourceCaveat(['Character.AI'])
  assert.match(caveat, /The incident count covers only the window/)
  assert.ok(!/count and uptime/.test(caveat), 'uptime is not truncated by a frozen incident feed')
  assert.ok(!/treat them as a floor/.test(caveat), 'one truncated quantity takes a singular pronoun')
  assert.match(caveat, /treat it as a floor/)
})


test('the Score is named and linked where a reader first meets a number', () => {
  // Summary is three sections above the AIWatch Score heading, yet it opens with bare figures like
  // "44/100". A first-time reader met the numbers before the metric had a name.
  const out = fillTemplate(REAL_TEMPLATE, '2026-05', REAL_ARCHIVE, {})
  const summary = out.slice(out.indexOf('## Summary'), out.indexOf('## Recommendations'))
  assert.match(summary, /\*\*AIWatch Score\*\* \(0–100\)/, 'Summary must name the metric')
  assert.match(summary, /\(#aiwatch-score--/, 'and link to its definition')
  assert.ok(!summary.includes('[SCORE_ANCHOR]'), 'the anchor placeholder must resolve')
  // The definition must precede the first score in the body.
  assert.ok(summary.indexOf('AIWatch Score') < summary.indexOf('- **Most reliable**'), 'definition comes first')
})


test('the API Response Time section carries ONE prose block, and it is true', () => {
  // The intro and a trailing "> **Note**:" footnote grew separately around the same table, each
  // half-explaining the method. Merged into the intro; the footnote is gone.
  // June 2026: 13 of 41 services had no probe; 10 of them were ranked, Modal at #2 with a 95.
  // The old footnote named three of the thirteen and claimed all were "excluded from rankings".
  const out = fillTemplate(REAL_TEMPLATE, '2026-05', REAL_ARCHIVE, {})
  const start = out.indexOf('## API Response Time')
  const section = out.slice(start, out.indexOf('\n## ', start + 5))
  assert.ok(!/^> \*\*Note\*\*: Probe RTT/m.test(section), 'the footnote must not return')

  const intro = section.split('\n').find(l => l.startsWith('These p75 figures'))
  assert.ok(intro, 'the section must open with its one prose block')
  // Everything the footnote used to carry now lives here, once.
  assert.match(intro, /Cloudflare Workers edge every 5 minutes/, 'measurement method')
  assert.match(intro, /not inference latency/, 'the disclaimer readers need')
  assert.match(intro, /median \(p50\) probe RTT/, 'and the p75-is-not-the-Score-input correction')
  assert.match(intro, /no row here/, 'a probe-less service is absent from THIS table')
  assert.match(intro, /does not drop it from the Score ranking/, 'and that is all this needs to say')
  assert.ok(!/are excluded from rankings/.test(intro), 'the false causal claim must stay dead')
  // Never claim the Score is "unaffected": `unsupported` drops the Responsiveness component and
  // rescales the remaining 80 points onto 100. Composition changes; only the penalty is absent.
  assert.ok(!/unaffected|costs it nothing/.test(intro), `no-probe still reshapes the Score: ${intro}`)
  assert.ok(!/withheld/.test(intro), 'the withheld rule belongs to the ranking note, not here')
  for (const name of ['Bedrock', 'Azure OpenAI', 'Modal']) {
    assert.ok(!intro.includes(name), `hardcoded service name in a rule that should be derived: ${name}`)
  }
})


test('every resolved SCORE_ANCHOR link keeps its leading #', () => {
  // `[SCORE_ANCHOR]` resolves to a bare id, so the template must write `(#[SCORE_ANCHOR])`.
  // Omitting the # yields `](aiwatch-score--june-…)` — a relative-path link that 404s silently.
  const out = fillTemplate(REAL_TEMPLATE, '2026-05', REAL_ARCHIVE, {})
  const links = [...out.matchAll(/\]\(([^)]*aiwatch-score--[^)]*)\)/g)].map(m => m[1])
  assert.ok(links.length >= 2, `expected several Score links, found ${links.length}`)
  for (const href of links) assert.ok(href.startsWith('#'), `anchor link lost its #: ${href}`)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
