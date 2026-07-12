---
layout: page
title: "[MON] [YEAR] AI Reliability Report"
description: "Monthly reliability report for 43 AI services including OpenAI, Anthropic Claude, Gemini, Amazon Bedrock, Pinecone, and more. Uptime, incidents, and AIWatch Score rankings."
date: [YYYY-MM-DD]
published: true
---

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: [MONTH] 1–[LAST_DAY], [YEAR]
> **Published**: [PUBLISH_MONTH] [YEAR]
> **Services monitored**: 43 — 33 API services, 6 coding agents, 4 AI apps

## Summary

> Every score in this report is the **AIWatch Score** (0–100): one number combining uptime, incident load, recovery speed and responsiveness. Higher is better. [How it's built →](#[SCORE_ANCHOR])

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

<!-- TREND_SECTION -->
<!-- ^ Auto-rendered by generate-report.js (buildTrendSection) from the current archive +
     committed _data/{YYYY-MM}.json snapshots of prior months (aiwatch-reports#41). Emits the
     whole "## N-Month Trend" section (ending in its own `---`) when ≥2 months of history exist
     and there's a Score mover, else nothing — the case for the first 1–2 reports. The slope-chart
     SVG is written by generate-charts.js under the same gate. Do not hand-author. -->

## AIWatch Score — [MONTH] [YEAR] Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Combines four components — Uptime (40%), Incident affected days (25%), Recovery speed (15%), Responsiveness (20%, derived from each service's median (p50) probe RTT and its RTT stability). The [API Response Time — Monthly p75](#api-response-time--monthly-p75) table below is a separate network-latency reference, not the Responsiveness input; full breakdown of weights, fallbacks, and penalties is in [About This Report → AIWatch Score](#about-this-report). [How it's calculated →](https://ai-watch.dev/#about-score)

<!-- SCORE_RANKING_NOTE -->

| Rank | Service | Score | Grade | Uptime Source | Why |
|---|---|---|---|---|---|
| 1 | | | | | |

**Grade scale**: Excellent (90+) · Good (75+) · Fair (55+) · Degrading (40+) · Unstable (<40)

<!-- Generate with: node scripts/generate-charts.js [YYYY-MM]/index.md -->
![AIWatch Score Rankings](../assets/[YYYY-MM]/score-chart.svg)

> **Uptime Source column**: **Official** (read directly from the service's status page) · **No official uptime** (the provider publishes none; the Score is computed from the remaining signals). A service tracked for less than the full month is excluded from the ranking, not labelled — see the note above the table. Full definitions: [About This Report → Uptime Source](#about-this-report).
> <!-- Keep this caption short — full definitions live in the About This Report methodology section to avoid duplicating them here. -->

---

## Official Uptime (Primary Component)

> **Reference table.** The uptime percentage each service publishes on its own status page, where it publishes one (the window varies by page — 30 or 90 days). The narrative-driven sections below (Incident Summary / Notable Incidents / Observations) cover what these numbers mean for vendor selection.

<!-- UPTIME_EXCLUSION_NOTE -->

<table class="uptime-cols">
<thead><tr><th>Service</th><th>Uptime</th></tr></thead>
<tbody>
<tr><td></td><td></td></tr>
</tbody>
</table>

---

<!-- COMPONENT_RELIABILITY_SECTION -->

## API Response Time — Monthly p75

These p75 figures are a network-latency reference: direct API-endpoint round-trip time, probed from the Cloudflare Workers edge every 5 minutes — not inference latency. Lower is better. They are **not** the Score's Responsiveness input, which reads each service's median (p50) probe RTT and its stability. So this table ranks *which service is fastest on the network*, while [AIWatch Score](#[SCORE_ANCHOR]) ranks *which is safest to rely on*. A service AIWatch does not probe has no row here; that alone does not drop it from the Score ranking.

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 32 probe targets: 30 API services (incl. twelvelabs) + cursor (coding agent) + characterai (app, detail-card only, aiwatch#921). A service AIWatch does not probe simply has no row here (13 of 41 in June 2026, ten of them ranked); that alone does not affect its Score. -->
<!-- p95 + Spikes are present in probe:daily:{date} (CLAUDE.md KV schema) but not yet
     surfaced by /api/report. vs-Last-Month additionally requires reading the previous
     month's archive:monthly:* and computing deltas. Re-add the columns once the
     report API carries them — file a tracking issue if not already open. -->

| Rank | Service | p75 (ms) |
|---|---|---|
| 1 | | |


---

<!-- DETECTION_SECTION -->
<!-- ^ Auto-rendered by generate-report.js (buildDetectionSection) from archive.degradation
     (aiwatch#511) + archive.detectionLead (aiwatch#369). Emits the whole "## Detection & RTT
     Degradation" section ending in its own `---` when there's data, and is omitted entirely
     otherwise (the case for any month ≤ 2026-05). #464 framing is fixed — detection latency
     (MTTD) + RTT degradation, never a "faster than the official status page" claim. Do not
     hand-author. -->

## Incident Summary

> **Reading the count column**: The count is how many incidents a provider published for that service. Granularity differs — Anthropic posts a separate incident per model ("Elevated errors for Claude Opus 4.7", "Degraded performance for Claude Sonnet 4.6"), and Together AI's status page tracks each model as its own resource — so both show higher totals than providers that post one incident per event. Higher count ≠ lower reliability — adjust for granularity before comparing across providers. Full provider-by-provider rules: [About This Report → Incident Counting](#about-this-report).
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
     API Response Time → Detection & RTT Degradation). Each entry: title with key duration,
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

<!-- SECURITY_SECTION -->
<!-- ^ Auto-rendered by generate-report.js (buildSecuritySection), which emits the section
     ending in its own `---` separator (or nothing when there are no detections). Do not hand-author. -->

## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 43 services are polled every **5 minutes** via Cloudflare Workers. Health check probes measure direct API response times (RTT) at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). A service with no probe endpoint is scored on the remaining components rescaled to 100, with **no penalty**. A service that has a probe but fewer than 7 days of samples gets that same rescale **plus a 5% penalty** until its probe data matures. Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
* **Uptime Source:** *Official* = the service publishes a rolling uptime % that AIWatch reads directly from its status page (the window varies by page — 30 or 90 days). *No official uptime* = the provider publishes no comparable figure. AIWatch **invents none**: the Score simply drops its 40-point Uptime component and is rescaled over the remaining signals (incidents, recovery, responsiveness), A service that still has a probe is scored and ranked on what can be measured; one with **neither** uptime **nor** a probe has too little signal, so its Score is withheld and it is not ranked. The note above the Score table names whichever services that is — the membership is read from the data, not fixed here. A service AIWatch tracked for only part of the month is **excluded from the ranking** rather than labelled (aiwatch-reports#45) — its partial-month Score would rest on insufficient coverage. The label describes the Uptime input, not the Score's rigour.
* **Incident Counting:** Counts are the incidents each provider published, attributed to the service they affected. Providers differ in granularity, and in *where* that granularity lives: Anthropic maps to a single status-page component but posts one incident **per model**; Together AI tracks each model as its own **resource**, so one event can surface as several incidents. Others post one incident per event at the service level. Compare counts only across providers with comparable granularity.
* **Uptime Metrics:** Uptime percentages are the official figure each status page exposes — read from the page directly, or aggregated by AIWatch from the per-component availabilities it publishes — for some services a single component, for others a worst-of across a component set, for others still an upstream platform average, depending on what the page exposes. Services marked with "—" publish no accessible uptime metric.
* **Component Reliability:** A **different measurement** from every other uptime figure in this report — do not compare them. AIWatch polls each service's status page every 5 minutes and, per component, counts a poll as good **only** when that component reads `operational`; `degraded` and `partial outage` both count against it, with no weighting by incident severity (severity is recorded per *service*, not per component). The percentage is that ratio of good polls, over the days AIWatch could read the page. Only components AIWatch surfaces for that service are counted — billing, docs and compliance surfaces are excluded — and a service needs at least two of them to appear at all. The table lists only each service's **weakest** component, and only when it fell below 99.9%: it is a list of where to look, not a ranking of everything.
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
