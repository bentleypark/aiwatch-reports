# AIWatch Monthly Reports

> Monthly AI service reliability reports covering uptime, incidents, and performance across 30 major AI services.

**Live site**: [reports.ai-watch.dev](https://reports.ai-watch.dev)
**Data source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring

---

## Reports

| Month | Link | Services | Status |
|---|---|---|---|
| March 2026 | [View →](https://reports.ai-watch.dev/2026-03/) | 27 | Published |

---

## What's Inside

Each monthly report includes:

- **AIWatch Score Rankings** — Composite reliability score (uptime + incidents + recovery time)
- **Incident Summary** — Total downtime and incident counts per service
- **Official Uptime** — Provider-reported uptime figures
- **Notable Incidents** — Top 5 incidents with root cause and impact
- **Observations** — Developer recommendations based on the data

---

## Methodology

- **31 services monitored**: 14 LLM APIs, 9 voice & inference, 3 AI apps, 5 coding agents
- **Data sources**: Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, AWS Health Dashboard, Azure Status RSS, OnlineOrNot
- **AIWatch Score**: Weighted composite of uptime (40pts), incident affected days (25pts), recovery time (15pts), and probe-based responsiveness (20pts). Services without probe data use 80→100 score redistribution.
- **Uptime figures**: Official status page metrics — single primary component basis where available, platform-wide average otherwise
- **Incident counts**: Per-component aggregation — some providers (e.g., Anthropic) report per model, so counts may exceed distinct outages
- **API probe**: Direct RTT measurement every 5 minutes to 19 services with public endpoints (supplementary monitoring data)

Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)

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
node scripts/generate-report.js 2026-04   # writes 2026-04/index.md with published: false
node scripts/generate-charts.js 2026-04/index.md
```

**GitHub Actions** (`.github/workflows/generate-report.yml`):
1. Open the workflow's "Run workflow" page
2. Enter the report month (YYYY-MM) or leave empty to default to the previous calendar month
3. The workflow generates the draft + charts and opens a draft PR for review

After generation, fill in the narrative sections (`Summary`, `Recommendations`, `Key Insight`, `Notable Incidents`, `Observations`), flip `published: false` → `true`, and merge.

---

## About AIWatch

AIWatch is an AI service status monitoring dashboard that aggregates real-time status from 30 major AI services.

- **Live dashboard**: [ai-watch.dev](https://ai-watch.dev)
- **Source code**: [github.com/bentleypark/aiwatch](https://github.com/bentleypark/aiwatch) (AGPL-3.0)

---

*Reports are published at the end of each month. Data may differ from official vendor reports due to monitoring methodology differences.*
