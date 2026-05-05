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
- **Riskiest this month**:
- **High incident count, fast recovery**:
- **Watch out**:

<details>
<summary><strong>Summary in Korean</strong></summary>
<ul>
<li><strong>가장 안정적</strong>: </li>
<li><strong>이번 달 가장 위험</strong>: </li>
<li><strong>잦은 장애, 빠른 복구</strong>: </li>
<li><strong>주의 필요</strong>: </li>
</ul>
</details>

---

## Recommendations

<table class="recommendations">
<thead>
<tr><th>Use Case</th><th>Recommended</th><th>Why</th></tr>
</thead>
<tbody>
<tr><td><strong>Production-critical</strong></td><td><em>(service)</em></td><td><em>(why)</em></td></tr>
<tr><td><strong>Low latency / cost</strong></td><td><em>(service)</em></td><td><em>(why)</em></td></tr>
<tr><td><strong>Coding Agents</strong></td><td><em>(service)</em></td><td><em>(why)</em></td></tr>
<tr><td><strong>Voice / audio</strong></td><td><em>(service)</em></td><td><em>(why)</em></td></tr>
<tr><td><strong>General purpose</strong></td><td><em>(service)</em></td><td><em>(why)</em></td></tr>
</tbody>
</table>

---

## Key Insight

<!-- Opening narrative: 1 sentence summarizing the month, then 3 patterns -->

- **Pattern 1**:
- **Pattern 2**:
- **Pattern 3**:

<details>
<summary><strong>Key Insight in Korean</strong></summary>
<p><!-- Opening narrative in Korean --></p>
<ul>
<li><strong>패턴 1</strong>: </li>
<li><strong>패턴 2</strong>: </li>
<li><strong>패턴 3</strong>: </li>
</ul>
</details>

![Daily Service Status](../assets/[YYYY-MM]/uptime-heatmap.svg)

---

## AIWatch Score — [MONTH] [YEAR] Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Combines four components — Uptime (40%), Incident affected days (25%), Recovery speed (15%), Responsiveness (20%, derived from p75 probe RTT). The per-service p75 RTT figures feeding Responsiveness are listed in the [API Response Time — Monthly p75](#api-response-time--monthly-p75) section below; full breakdown of weights, fallbacks, and penalties is in [About This Report](#about-this-report). [How it's calculated →](https://ai-watch.dev/#about-score)

| Rank | Service | Score | Grade | Uptime Source | Why |
|---|---|---|---|---|---|
| 1 | | | | | |

**Grade scale**: Excellent (90+) · Good (75+) · Fair (55+) · Degrading (40+) · Unstable (<40)

<!-- Generate with: node scripts/generate-charts.js [YYYY-MM]/index.md -->
![AIWatch Score Rankings](../assets/[YYYY-MM]/score-chart.svg)

<!-- Add this footnote only when the Score table has rows ending with " *" — a trailing
     asterisk marker for estimate-only services (services that do not publish a rolling
     30-day uptime metric and instead use an industry-average assumption).
     Footnote line begins with an escaped asterisk so it doesn't render as a list item:
*\* Estimate-based services* — [Service A] and [Service B] do not publish accessible uptime metrics; the Uptime component of their score uses an industry-average assumption (99.5%). Score reflects zero observed incidents, not measured availability.
-->

> **Uptime Source column**: **Official** (read directly from the service's status page) · **Estimate** (no official metric; only the Score input is computed — the % itself is not surfaced) · **Partial (Nd)** (service newly tracked mid-month). Full definitions: [About This Report → Uptime Source](#about-this-report).
> <!-- Cycle-specific notes (e.g. "Codex was added on 22 Apr, mid-month") can be appended after the Partial label. Keep this caption short — full definitions live in the About This Report methodology section to avoid duplication. -->

---

## Official Uptime (Primary Component)

> **Reference table.** Official 30-day uptime metrics from each service's status page (where published). The narrative-driven sections below (Incident Summary / Notable Incidents / Observations) cover what these numbers mean for vendor selection.

*Amazon Bedrock, Azure OpenAI, Deepgram, Gemini, Mistral, Perplexity, and xAI do not publish a rolling-30-day uptime percentage on their status pages — they're excluded from this table for that reason. (xAI's [status page](https://status.x.ai) does expose per-endpoint live success rates measured since their monitoring system's last restart, but those numbers are not directly comparable to the 30-day figures shown above.)*

<table class="uptime-cols">
<thead><tr><th>Service</th><th>Uptime</th></tr></thead>
<tbody>
<tr><td></td><td></td></tr>
</tbody>
</table>

---

## API Response Time — Monthly p75

<!-- Anchor below: substitute [month]/[year] with lowercase values (e.g. "april", "2026").
     Jekyll/Kramdown collapses the heading's em-dash (`— `) into a double hyphen in the
     slug — so the final anchor is e.g. "#aiwatch-score--april-2026-reliability-rankings". -->
These p75 figures are the input to the **Responsiveness** component (20% weight) of [AIWatch Score](#aiwatch-score--[month]-[year]-reliability-rankings). Lower is better. The two tables answer different questions: Score Rankings sorts by *which service is safest to rely on* (combining uptime, incidents, recovery, and responsiveness); this table sorts by *which service is fastest at the network layer*.

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 19 probe-covered API services. Non-probe services (Bedrock, Azure OpenAI, Pinecone) excluded. -->
<!-- p95 + Spikes are present in probe:daily:{date} (CLAUDE.md KV schema) but not yet
     surfaced by /api/report. vs-Last-Month additionally requires reading the previous
     month's archive:monthly:* and computing deltas. Re-add the columns once the
     report API carries them — file a tracking issue if not already open. -->

| Rank | Service | p75 (ms) |
|---|---|---|
| 1 | | |

> **Note**: Probe RTT measures direct API endpoint response time from Cloudflare Workers edge (5-min intervals). Values reflect network round-trip time, not inference latency. Services without probe coverage (Bedrock, Azure OpenAI, Pinecone) are excluded from rankings.

---

## Detection Lead

<!-- Include this section ONLY when archive:monthly:{YYYY-MM}.detectionLead is non-null
     (i.e., topExamples has entries). Omit the entire section for months with zero
     qualifying detections — April 2026 was omitted because the pre-aiwatch#369 daily
     keys (7d TTL) had already expired by archive time, so no rows were available. -->
<!-- Data source: GET /api/report?month=YYYY-MM → detectionLead.{count, avgLeadMs,
     medianLeadMs, maxLeadMs, byService, topExamples}. Backed by archive:monthly:*
     after aiwatch#369 (the 60d-TTL detection:lead:monthly:* accumulator). The older
     daily detected:{svcId} keys remain 7d TTL and are not month-complete. -->

| Incident | Service | Detected At (UTC) | Official Report (UTC) | Lead Time |
|---|---|---|---|---|
| | | | | |

**Average Detection Lead**: <!-- X min --> (across N incidents with probe spike detection)

> **Detection Lead** measures how much earlier AIWatch detected an issue (via probe RTT spike) compared to the official status page report. Only incidents where probe spike detection fired before the status page update are included.

---

## Incident Summary

> **Reading the count column**: Incident counts reflect all affected components per service, so providers that report per-model (e.g., Anthropic counts Opus / Sonnet / Haiku separately) show inflated totals vs. providers that report at the service level. Higher count ≠ lower reliability — adjust for granularity before comparing across providers. Full provider-by-provider rules: [About This Report → Incident Counting](#about-this-report).
>
> <!-- Cycle-specific data notes (excluded incidents, anomalies) go here. -->

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

## Notable Incidents

<!-- Top 5-6 notable incidents — the report's main narrative content. Place this
     section in the narrative cluster (Incident Summary → Notable Incidents →
     Observations) that follows the metrics cluster (Score → Official Uptime →
     API Response Time → Detection Lead). Each entry: title with key duration,
     affected component(s), and a short prose paragraph that explains scope +
     remediation/mitigation. -->

### 1. [Title]
**Affected**: <!-- Include region if applicable: e.g., "xAI API — EU (eu-west-1)" -->
**Duration**:

<!-- Description -->

---

## Observations

Actionable takeaways per service. Descriptive context for each event lives in earlier sections — [Summary](#summary), [Incident Summary](#incident-summary), and [Notable Incidents](#notable-incidents). This section is what to *do* with that data — keep each bullet prescriptive, not a recap.

- **If you build on [Service]**: <!-- one-sentence operational guidance -->
- **Quietly reliable picks within their own role**: <!-- 2-3 services with low-but-nonzero incident counts + fast recovery, each labelled with its actual category (e.g. "OSS model hosting", "serverless GPU compute", "LLM tier fallback"). Make the role explicit so readers don't misread the list as a single-tier fallback set. -->
<!-- Two cautions when picking these:
     (1) Avoid restating zero-incident services — those already live in
         Incident Summary's "Zero incidents recorded" note and the Official
         Uptime caveat (both above). Pick services with low-but-nonzero
         counts whose Score + recovery profile demonstrates resilience under
         real traffic, not just absence of incidents.
     (2) Don't lump cross-category services as a single "fallback set" —
         services in EXCLUDE_FALLBACK (Hugging Face, Modal, Replicate,
         Pinecone, etc.) are not drop-in LLM-API replacements. Always
         attach the use-case label so readers don't infer interchangeability. -->

---

## Security Alerts

<!-- Include this section ONLY when the month had security detections. Sources:
     OSV.dev (AI SDK package vulnerabilities), Hacker News (security posts
     mentioning monitored services). Section omitted entirely for months
     without detections. -->

> **Note:** Security alerts captured during the month from OSV.dev (AI SDK package vulnerabilities) and Hacker News (security posts mentioning monitored services). Section omitted for months without detections.

**Total alerts:** <!-- N -->

**By source**

| Source | Count |
|---|---|
| OSV.dev | |
| Hacker News | |

**By severity**

| Critical | High | Medium | Low |
| --- | --- | --- | --- |
| | | | |

**Most affected services**

| Service | Count |
|---|---|
| | |

### Top Findings

<!-- One block per finding. Surface only Fix Version inline — Stage / At / Severity
     are already in the heading + Detected line, so a Timeline <details> block
     would be pure duplication (April 2026 dropped them for that reason). -->

#### 1. [Title with link to advisory] · `severity`
- **Source:** OSV.dev
- **Affected:** [Service]
- **Detected:** [YYYY-MM-DD]
- **Fix Version:** [version]

---

## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 31 services are polled every **5 minutes** via Cloudflare Workers. Health check probes measure direct API response times (RTT) at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). Services without probe data use 80→100 score redistribution **plus a 5% penalty** to reflect the missing responsiveness signal. Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
* **Uptime Source:** *Official* = service publishes a rolling 30-day uptime metric AIWatch reads directly. *Estimate* = no official metric; AIWatch substitutes an industry-average assumption (99.5%) or its own poll-derived figure for the Score's Uptime input. *Partial (Nd)* = an official source exists but AIWatch's measurement window is shorter than the full month (e.g. service newly tracked mid-month). The label only describes the Uptime input quality — the Score itself is computed identically across all services.
* **Incident Counting:** Incident counts reflect all affected components per service. Providers differ in reporting granularity — Anthropic reports per-model incidents (Opus/Sonnet/Haiku each counted separately), while others report at the service level.
* **Uptime Metrics:** Uptime percentages reflect official single-component figures provided by the status pages. Services marked with "—" do not provide a publicly accessible uptime metric.
* **Timezone Standard:** All timestamps are recorded in **UTC**.

**Next report**: [NEXT_MONTH] [YEAR]

---

- **Live status** — [ai-watch.dev](https://ai-watch.dev)
- **Slack/Discord alerts** — [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
- **Score methodology** — [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
- **All reports** — [ai-watch.dev/reports](https://ai-watch.dev/reports/)

---

- *Have feedback or spotted an error?* [Open an issue](https://github.com/bentleypark/aiwatch/issues/new)
- *Want us to track a service?* [Request here](https://github.com/bentleypark/aiwatch/issues/new?template=service_request.md)
