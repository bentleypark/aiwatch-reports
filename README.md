# AIWatch Monthly Reports

> Monthly AI service reliability reports covering uptime, incidents, and performance across 41 major AI services.

**Live site**: [ai-watch.dev/reports](https://ai-watch.dev/reports/) (served via Vercel rewrite; legacy `reports.ai-watch.dev` self-redirects to the canonical path — #264)
**Data source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring

---

## Reports

| Month | Link | Services | Status |
|---|---|---|---|
| March 2026 | [View →](https://ai-watch.dev/reports/2026-03/) | 27 | Published |

---

## What's Inside

Each monthly report includes:

- **AIWatch Score Rankings** — Composite reliability score (uptime + incidents + recovery time)
- **3-Month Trend** — Score direction over the trailing 3 months (slope chart), plus **Notable Movers**: the services whose Score, recovery time (MTTR), or total downtime changed most, so a flat Score can't hide a recovery-time regression. Auto-rendered once ≥2 months of archive exist; omitted otherwise. (Uptime is intentionally not trended — see *Methodology*.)
- **Incident Summary** — Total downtime and incident counts per service
- **Official Uptime** — Provider-reported uptime figures
- **Notable Incidents** — Top 5 incidents with root cause and impact
- **Observations** — Developer recommendations based on the data

---

## Methodology

- **43 services monitored**: 15 LLM APIs, 18 voice & inference, 4 AI apps, 6 coding agents
- **Data sources**: Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, AWS Health Dashboard, Azure Status RSS, OnlineOrNot
- **AIWatch Score**: Weighted composite of uptime (40pts), incident affected days (25pts), recovery time (15pts), and probe-based responsiveness (20pts). Services without probe data use 80→100 score redistribution.
- **Uptime figures**: Official status page metrics — single primary component basis where available, platform-wide average otherwise
- **Incident counts**: Per-component aggregation — some providers (e.g., Anthropic) report per model, so counts may exceed distinct outages
- **API probe**: Direct RTT measurement every 5 minutes to 31 probe targets with public endpoints (supplementary monitoring data)
- **3-Month Trend (Notable Movers)**: ranked by the largest single change across **Score / MTTR / total downtime** over the window — incident-feed *measured* metrics. Uptime is deliberately excluded: the archive's `uptime` field mixes per-service sources (status-page group aggregates, estimate/poll-derived figures) so a cross-service uptime delta is misleading (a 3-month official-uptime trend awaits aiwatch#586 + ≥3 months of the clean `officialUptime` field). Direction (🔺/🔻) follows the bold *headline* metric, not Score. Services the Score ranking excludes (no-incident-feed / stale source) are excluded from movers too. The first point is flagged when its month is partial (mid-month onboarding); MTTR/downtime are measured over the months that have incident data.

Full methodology: [ai-watch.dev/methodology#score](https://ai-watch.dev/methodology#score)

---

## Data Preservation

Monthly archive data is stored in two locations:

- **Cloudflare KV**: `archive:monthly:{YYYY-MM}` (permanent, auto-generated on 1st of each month)
- **Git**: `_data/{YYYY-MM}.json` (fetched via `scripts/fetch-archive.sh`)

---

## Generating a Report Draft

New monthly reports are generated from the permanent archive — no live-data fallback, by design. The cron fires on the 1st of the following month at 00:00 UTC; after that the draft can be produced either locally or via GitHub Actions.

**Local:**
```bash
node scripts/generate-report.js 2026-04   # writes 2026-04/index.md (incl. the 3-Month Trend section)
node scripts/generate-charts.js 2026-04/index.md   # writes score-chart.svg, uptime-heatmap.svg, trend-chart.svg
```

The trend section + chart read the trailing months from `_data/` (prior months) plus the current report (this month), so they auto-populate once `_data/` holds ≥2 consecutive months; the first one or two reports render without the section. The first fully-comparable 3-month window is **2026-06** (Apr/May/Jun all full months).

**GitHub Actions** (`.github/workflows/generate-report.yml`):
1. Open the workflow's "Run workflow" page
2. Enter the report month (YYYY-MM) or leave empty to default to the previous calendar month
3. The workflow generates the draft + charts and opens a draft PR for review

After generation, fill in the narrative sections (`Summary`, `Recommendations`, `Key Insight`, `Notable Incidents`, `Observations`), flip `published: false` → `true`, and merge.

**Narrative recurrence check** (aiwatch-reports#54): when a likely narrative subject (a top-incident service, the slowest-recovery service, or a Notable Mover) also filled the **same slot** — the Summary "High incident count" bullet, a Key Insight pattern, or Notable Incidents — in ≥2 of the last 3 published months, the generator injects a `RECURRENCE CHECK` block above `## Summary` (e.g. *"Together AI led the Summary 'High incident count' bullet in 2 of the last 2 published months … (last month 133 → this month 85)"*). It has no memory of prior months otherwise, so the same framing recurred unnoticed (Together AI three months running). **Reframe around the month-over-month change, then delete the block** — it uses the same delete-before-merge fence as AUTO-DRAFT, and a leaked fence hard-fails the pre-publish lint. The auto-drafted "Most incidents" bullet is also MoM-framed by default (`155 incidents … — 97 last month (+58)`).

**Pre-publish recurrence lint** (aiwatch-reports#55): the publish-time enforcement of the same signal. `.github/workflows/lint-recurrence.yml` runs `scripts/lint-recurrence.js` on any PR that changes a `NNNN-NN/index.md`, reusing #54's `extractNarrativeSubjects`/`detectRecurrence` (single source of truth). On a `published: true` report it **fails** if any AUTO-DRAFT / RECURRENCE CHECK fence survived (draft scaffolding must never publish) and **warns** (PR annotation) when a service fills the same narrative slot as the immediately prior month — so a genuine recurrence can proceed after the author acknowledges it, but never *silently*. A `published: false` draft is exempt.

---

## About AIWatch

AIWatch is an AI service status monitoring dashboard that aggregates real-time status from 41 major AI services.

- **Live dashboard**: [ai-watch.dev](https://ai-watch.dev)
- **Source code**: [github.com/bentleypark/aiwatch](https://github.com/bentleypark/aiwatch) (AGPL-3.0)

---

*Reports are published at the end of each month. Data may differ from official vendor reports due to monitoring methodology differences.*
