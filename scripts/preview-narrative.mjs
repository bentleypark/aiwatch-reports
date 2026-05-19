// Dev / verification tool — preview the Phase 3 AI-narrative rendering
// (aiwatch-reports#4 / aiwatch#426) without deploying the Worker or hitting an
// AI endpoint.
//
// Why this exists: the Worker bakes `archive.narrative` into the monthly
// archive at build time, and `generate-report.js` renders it into the Notable
// Incidents + Observations sections as fenced auto-draft blocks. Verifying that
// end-to-end against live data needs a redeployed Worker + an archive rebuild.
// This script short-circuits that: it splices a sample narrative into a local
// archive snapshot and runs the real render pipeline, so you can eyeball the
// operator-facing draft output offline.
//
// Usage:
//   node scripts/preview-narrative.mjs                 # uses _data/2026-04.json
//   node scripts/preview-narrative.mjs _data/2026-05.json
//
// The sample narrative is shaped exactly like the Worker's MonthlyNarrativeDraft
// (worker/src/monthly-narrative.ts) and its content is modeled on the published
// 2026-04 Notable Incidents, so the preview is faithful to a populated archive.
// Note: real archives written before aiwatch#426 carry no `narrative` field —
// against those, generate-report.js is a no-op and keeps the placeholders;
// this script injects a sample so there's something to look at.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const gr = require(path.join(REPO_ROOT, 'scripts/generate-report.js'))

// Sample narrative — MonthlyNarrativeDraft shape. Content mirrors the real
// published April 2026 Notable Incidents so the preview reads authentically.
const SAMPLE_NARRATIVE = {
  model: 'gemma',
  generatedAt: '2026-05-01T00:06:00Z',
  notableIncidents: [
    {
      service: 'Gemini API',
      title: 'Vertex API key rotation issue',
      affected: 'Gemini API — Vertex (EU + US regions)',
      durationLabel: '10 days',
      narrative: 'A key-rotation regression degraded Vertex authentication for ten days (Apr 17–28), the longest single incident of the month. Requests intermittently failed authorization until the rotation pipeline was corrected.',
    },
    {
      service: 'Deepgram',
      title: 'Voice agent degradation',
      affected: 'Deepgram streaming endpoints',
      durationLabel: '74h',
      narrative: 'Streaming voice-agent endpoints saw sustained elevated latency across roughly 74 hours. Batch transcription was largely unaffected; the degradation was concentrated on the real-time path.',
    },
    {
      service: 'OpenAI API',
      title: 'Apr 20 error-rate cluster',
      affected: 'OpenAI API (independent of the ChatGPT incident the same day)',
      durationLabel: '36h 2m',
      narrative: 'A 36-hour cluster of elevated API error rates on Apr 20, tracked separately from the same-day ChatGPT outage since they hit independent components.',
    },
    {
      service: 'GitHub Copilot',
      title: 'Recurring availability incidents',
      affected: 'GitHub Copilot',
      durationLabel: '84h 32m',
      narrative: 'Copilot recorded 26 separate incidents totaling 84h 32m of downtime — the highest incident count of any monitored service this month, pointing to a chronic stability pattern rather than a single event.',
    },
  ],
  observations: [
    'Prefer Claude or OpenAI for latency-sensitive production workloads — both held high scores with fast recovery.',
    'Treat Gemini Vertex as fallback-only until the key-rotation fix is confirmed stable across a full month.',
    "For coding-agent workloads, weight GitHub Copilot's 26-incident pattern heavily — Claude Code and Cursor were materially steadier.",
  ],
}

function sectionSlice(md, heading) {
  const start = md.indexOf(`## ${heading}`)
  if (start === -1) return `(section "${heading}" not found)`
  const rest = md.slice(start + heading.length + 3)
  const next = rest.indexOf('\n## ')
  return md.slice(start, next === -1 ? undefined : start + heading.length + 3 + next)
}

function main() {
  const archiveArg = process.argv[2] ?? '_data/2026-04.json'
  const archivePath = path.isAbsolute(archiveArg) ? archiveArg : path.join(REPO_ROOT, archiveArg)
  if (!fs.existsSync(archivePath)) {
    console.error(`[preview-narrative] archive snapshot not found: ${archivePath}`)
    process.exit(1)
  }

  const archive = JSON.parse(fs.readFileSync(archivePath, 'utf-8'))
  // Period is derived from the snapshot's own `period` field; fall back to the
  // filename stem (e.g. _data/2026-04.json → 2026-04).
  const period = archive.period ?? path.basename(archiveArg).replace(/\.json$/, '')

  // Splice in the sample narrative so there's something to render. A real
  // post-aiwatch#426 archive would already carry `archive.narrative`.
  if (!archive.narrative) {
    archive.narrative = SAMPLE_NARRATIVE
    console.log('[preview-narrative] archive has no narrative — injecting the sample fixture for preview.\n')
  } else {
    console.log('[preview-narrative] archive already carries a narrative — previewing it as-is.\n')
  }

  // Service id → display name. The archive doesn't carry display names; the
  // Worker passes them from services:latest. Locally, ids are good enough.
  const meta = {}
  for (const id of Object.keys(archive.services ?? {})) meta[id] = { name: id }

  const template = fs.readFileSync(path.join(REPO_ROOT, '_templates/monthly-report.md'), 'utf-8')

  let out = gr.fillTemplate(template, period, archive, meta)
  out = gr.applyAutoDraft(out, archive, meta, period)        // Phase 1: Summary / Key Insight
  out = gr.injectNarrativeDraft(out, archive.narrative)       // Phase 3: Notable Incidents / Observations

  const outPath = path.join(os.tmpdir(), `${period}-narrative-preview.md`)
  fs.writeFileSync(outPath, out)

  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  FULL PREVIEW: ${outPath}`)
  console.log('═══════════════════════════════════════════════════════════\n')
  console.log(sectionSlice(out, 'Notable Incidents'))
  console.log('\n───────────────────────────────────────────────────────────\n')
  console.log(sectionSlice(out, 'Observations'))
}

main()
