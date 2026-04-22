---
layout: page
title: "[MON] [YEAR] AI Reliability Report"
description: "Monthly reliability report for 31 AI services including OpenAI, Anthropic Claude, Gemini, Amazon Bedrock, Pinecone, and more. Uptime, incidents, and AIWatch Score rankings."
date: [YYYY-MM-DD]
published: true
---

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: [MONTH] 1–[LAST_DAY], [YEAR]
> **Published**: [PUBLISH_MONTH] [YEAR]
> **Services monitored**: 31 — 23 API services, 5 coding agents, 3 AI apps

## Summary

- **Most reliable**:
- **Best balance (stability + ecosystem)**:
- **Riskiest this month**:
- **High incident noise**:
- **Watch out**:

<details markdown="1">
<summary><strong>Summary in Korean</strong></summary>

- **가장 안정적**:
- **안정성 + 생태계 균형**:
- **이번 달 가장 위험**:
- **인시던트 수 주의**:
- **주의 필요**:

</details>

## Recommendations

| Use Case | Recommended | Why |
|---|---|---|
| **Production-critical** | | |
| **Low latency / cost** | | |
| **Coding workflows** | | |
| **Voice / audio** | | |
| **General purpose** | | |

---

## Key Insight

<!-- Opening narrative: 1 sentence summarizing the month, then 3 patterns -->

- **Pattern 1**:
- **Pattern 2**:
- **Pattern 3**:

<details markdown="1">
<summary><strong>Key Insight in Korean</strong></summary>

- **패턴 1**:
- **패턴 2**:
- **패턴 3**:

</details>

![Daily Service Status](../assets/[YYYY-MM]/uptime-heatmap.svg)

---

## AIWatch Score — [MONTH] [YEAR] Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Unlike raw uptime %, it incorporates incident frequency (how often things break), recovery time (how fast they fix it), and real downtime impact — making it a more realistic reliability signal for developers. All formulas are publicly documented. [How it's calculated →](https://ai-watch.dev/#about-score)

| Rank | Service | Score | Grade | Confidence | Why |
|---|---|---|---|---|---|
| 1 | | | | | |

**Grade scale**: Excellent (85+) · Good (70+) · Fair (55+) · Degrading (40+) · Unstable (<40)

<!-- Generate with: node scripts/generate-charts.js [YYYY-MM]/index.md -->
![AIWatch Score Rankings](../assets/[YYYY-MM]/score-chart.svg)

> **Confidence** reflects data completeness: High = full uptime + incident data available; Medium = uptime not published (industry average assumed) or partial monitoring period.
> <!-- Additional scoring notes and caveats go here -->

---

## Incident Summary

> **Note on methodology**: Incident counts and downtime reflect all affected components per service (e.g., Claude API counts Opus, Sonnet, and Haiku separately). Official uptime % is based on a single primary component. These two metrics are not directly comparable.
>
> **A higher incident count does not necessarily indicate lower reliability.** Providers differ in reporting granularity — Anthropic reports per-model incidents (Opus/Sonnet/Haiku each counted separately), while others report at the service level. Direct comparisons should account for this difference.
>
> <!-- Additional data notes (excluded incidents, anomalies, etc.) -->

<table>
<thead>
<tr><th>Service</th><th>Inc</th><th>Downtime (longest)</th><th class="hide-mobile">Longest</th><th class="hide-mobile">Avg Resolution</th></tr>
</thead>
<tbody>
<tr><td></td><td></td><td></td><td class="hide-mobile"></td><td class="hide-mobile"></td></tr>
</tbody>
</table>

**Zero incidents (N services):** <!-- List services with zero incidents inline -->

---

## Official Uptime (Primary Component)

*Azure OpenAI, Deepgram, Gemini, Mistral, Perplexity, and xAI do not publish accessible uptime metrics on their status pages.*

<table class="uptime-cols">
<thead><tr><th>Service</th><th>Uptime</th></tr></thead>
<tbody>
<tr><td></td><td></td></tr>
</tbody>
</table>

---

## API Response Time — Monthly p75

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 17 probe-covered API services. Non-probe services (Bedrock, Azure OpenAI, Pinecone) excluded. -->

| Rank | Service | p75 (ms) | p95 (ms) | Spikes | vs Last Month |
|---|---|---|---|---|---|
| 1 | | | | | |

**Spike definition**: RTT > 3× daily median or connection failure (rtt = -1).

> **Note**: Probe RTT measures direct API endpoint response time from Cloudflare Workers edge (5-min intervals). Values reflect network round-trip time, not inference latency. Services without probe coverage (Bedrock, Azure OpenAI, Pinecone) are excluded from rankings.

---

## Detection Lead

<!-- Data source: detected:{svcId} KV timestamps vs official incident start times -->
<!-- Only applicable when probe spike detection fires before status page update -->

| Incident | Service | Detected At (UTC) | Official Report (UTC) | Lead Time |
|---|---|---|---|---|
| | | | | |

**Average Detection Lead**: <!-- X min --> (across N incidents with probe spike detection)

> **Detection Lead** measures how much earlier AIWatch detected an issue (via probe RTT spike) compared to the official status page report. Only incidents where probe spike detection fired before the status page update are included.

---

## Notable Incidents

<!-- Top 5-6 notable incidents with raw vs adjusted duration where applicable -->

### 1. [Title]
**Affected**: <!-- Include region if applicable: e.g., "xAI API — EU (eu-west-1)" -->
**Duration**:

<!-- Description -->

---

## Observations

### If you build on [Service]
-

### Generally stable this month
<!-- List stable services with downtime figures -->

---

## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 31 services are polled every **5 minutes** via Cloudflare Workers. Health check probes measure direct API response times (RTT) at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). Services without probe data use 80→100 score redistribution. Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
* **Confidence Levels:** *High* = official uptime data available; *Medium* = uptime not published (industry average 99.5% assumed) or estimate-based. Confidence reflects uptime data quality. Probe data status (Responsiveness) is shown separately on each service's dashboard.
* **Incident Counting:** Incident counts reflect all affected components per service. Providers differ in reporting granularity — Anthropic reports per-model incidents (Opus/Sonnet/Haiku each counted separately), while others report at the service level.
* **Uptime Metrics:** Uptime percentages reflect official single-component figures provided by the status pages. Services marked with "—" do not provide a publicly accessible uptime metric.
* **Timezone Standard:** All timestamps are recorded in **UTC**.

**Next report**: [NEXT_MONTH] [YEAR]

---

- **Live status** — [ai-watch.dev](https://ai-watch.dev)
- **Slack/Discord alerts** — [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
- **Score methodology** — [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
- **All reports** — [reports.ai-watch.dev](https://reports.ai-watch.dev)

---

- *Have feedback or spotted an error?* [Open an issue](https://github.com/bentleypark/aiwatch/issues/new)
- *Want us to track a service?* [Request here](https://github.com/bentleypark/aiwatch/issues/new?template=service_request.md)
