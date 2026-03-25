# AIWatch Monthly Reports

> Monthly AI service reliability reports covering uptime, incidents, and performance across 20 major AI services.

**Live site**: [bentleypark.github.io/aiwatch-reports](https://bentleypark.github.io/aiwatch-reports)
**Data source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring

---

## Reports

| Month | Link | Services | Status |
|---|---|---|---|
| March 2026 | [View →](https://bentleypark.github.io/aiwatch-reports/2026-03/) | 21 | Publishing March 31 |

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

- **22 services monitored**: 12 LLM APIs, 4 coding agents, 2 web apps, 4 voice & inference
- **Data sources**: Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, RSS feeds
- **AIWatch Score**: Weighted composite of uptime (50pts), incident affected days (30pts), recovery time (20pts)
- **Uptime figures**: Official single-component metrics from each provider's status page
- **Incident counts**: Per-component aggregation — some providers (e.g., Anthropic) report per model, so counts may exceed distinct outages

Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)

---

## About AIWatch

AIWatch is an AI service status monitoring dashboard that aggregates real-time status from 20 major AI services.

- **Live dashboard**: [ai-watch.dev](https://ai-watch.dev)
- **Source code**: [github.com/bentleypark/aiwatch](https://github.com/bentleypark/aiwatch) (AGPL-3.0)

---

*Reports are published at the end of each month. Data may differ from official vendor reports due to monitoring methodology differences.*
