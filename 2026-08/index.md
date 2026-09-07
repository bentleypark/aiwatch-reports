---
layout: page
title: "August 2026 AI Reliability Report"
description: "Monthly reliability report for 45 AI services including OpenAI, Anthropic Claude, Gemini, Amazon Bedrock, Pinecone, and more. Uptime, incidents, and AIWatch Score rankings."
date: 2026-09-07
published: false
---

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: August 1–31, 2026
> **Published**: September 2026
> **Services monitored**: 45 — 16 LLM APIs, 8 inference & infra, 6 coding agents, 5 AI apps, 3 voice & transcription, 3 observability, 2 video, 2 image

<!-- AUTHORING SELF-CHECK — read before writing prose; these are the recurring misses:
     1. CLAIMS BACKED BY DATA, AT THE RIGHT SCOPE. Every superlative/absolute ("the slowest", "the most",
        "worst month", "the only", "never") must be TRUE over the scope you state. Qualify to what the
        measurement supports: p75 is an edge-RTT probe to ONE endpoint, not "the slowest SERVICE"; a
        "worst month" must hold on the metric you mean (Score? downtime?) and beat EVERY peer — check the
        data, a lower-scoring sibling breaks "worst coding agent". Prefer "highest edge-probe RTT among
        probed services" / "most downtime of any coding agent" to a bare superlative. Soften unprovable
        absolutes ("never" -> "rarely").
     2. ONE HOME PER FACT — don't over-emphasise. A specific figure/superlative (e.g. one service's p75)
        belongs in ONE analytical home (its Notable Incident, or the data table), not restated across
        Summary + Notable Incidents + Observations. Weight a factor by its real contribution, not by how
        many times you can repeat it.
     3. ADVISORY != OUTAGE. Before calling something an outage, read the incident TITLE + impact, not just
        its duration. A usage-limits / billing / model-access / policy notice (often impact:minor) is an
        ADVISORY, not downtime — label it so (as the Anthropic entries do). If the archive counted such a
        notice as downtime it inflates the Score drop (a worker-side classification bug, cf. aiwatch#707);
        flag it. A long duration alone does not make an availability incident. -->

<!-- BEGIN RECURRENCE CHECK — review, reframe around the change, then DELETE this entire block before merge -->
_Narrative repeated vs prior months — lead with the month-over-month change or a fresh lens, then delete this block._

- ⚠️ **Fireworks AI** — led a Key Insight pattern in 2 of the last 3 published months (2026-05, 2026-07) + this month (2026-08). (last month 34 → this month 138) → Reframe around the change or pick a fresh lens.
- ⚠️ **Codex** — led a Key Insight pattern in 3 of the last 3 published months (2026-05, 2026-06, 2026-07) + this month (2026-08). (last month 8 → this month 2) → Reframe around the change or pick a fresh lens.
- ⚠️ **Mistral API** — led Notable Incidents in 2 of the last 3 published months (2026-05, 2026-06) + this month (2026-08). (last month 28 → this month 70) → Reframe around the change or pick a fresh lens.
- ⚠️ **Codex** — led Notable Incidents in 2 of the last 3 published months (2026-05, 2026-06) + this month (2026-08). (last month 8 → this month 2) → Reframe around the change or pick a fresh lens.

<!-- END RECURRENCE CHECK -->

## Summary
<!-- BEGIN AUTO-DRAFT — review, then DELETE this entire block before merge -->
_Auto-generated narrative draft — English only; translate for the KO `<details>` block below._

- **Most reliable**: Windsurf (100 — zero incidents, perfect uptime)
- **Best balance (stability + ecosystem)**: Junie (96, only 10m downtime)
- **Riskiest this month**: Mistral API (37, 145h 14m total downtime)
- **Most incidents**: Fireworks AI (138 incidents, 133h 48m downtime — 34 last month (+104))

**Recommendations**
- **Primary**: Windsurf or Junie
- **Fallback**: Groq Cloud or Modal (19m avg resolution)

**Recovery performance**: Fastest — Cerebras Inference (1m avg). Slowest — Voyage AI (11h 20m avg).

> _Ranking language above excludes Gemini API, xAI API, Deepgram — no official uptime, so their Score is not on the same scale and they are ranked in their own table (aiwatch-reports#106). Services excluded from the ranking entirely are named in the note above the Score table. Name any of them by hand if the month warrants it._

<!-- END AUTO-DRAFT -->

> Every score in this report is the **AIWatch Score** (0–100): one number combining uptime, incident load, recovery speed and responsiveness. Higher is better. [How it's built →](#aiwatch-score--august-2026-reliability-rankings)

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

August 2026 showed a clear divide: Windsurf, Junie, and Groq Cloud remained highly stable, while Mistral API (37) experienced the most challenges. 35 out of 45 services recorded at least one incident, with a combined downtime of 1007h 21m.

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

![Daily Service Status](../assets/2026-08/uptime-heatmap.svg)

---

## 3-Month Trend

AIWatch Score direction over the last 3 months (2026-06 → 2026-08). The lines plot each service's composite Score. **Notable Movers** below are NOT ranked by these lines — a service earns its place, and its order, by the largest change on *any* of three axes (Score, recovery time, or total downtime), which is why one with a small Score move can top the list on a downtime swing the chart cannot show.

![AIWatch Score 3-month trend](../assets/2026-08/trend-chart.svg)

### Notable Movers

*The 5 services whose **Score, recovery time (MTTR), or total downtime** changed most over the window (ranked by the largest single change, not a fixed threshold). The metric in **bold** is the change that ranked each service here; 🔺 / 🔻 mark whether that headline metric improved or worsened — so a service can show a small Score gain yet land here, and read 🔻, because its downtime regressed.*

- 🔻 **Helicone** — Score 58 → 57 (−1) · **MTTR 5h 46m → 40h 35m (+34h 49m)** · downtime 23h 4m → 71h 26m (+48h 22m)
- 🔻 **Fireworks AI** — Score 82 → 75 (−7) · MTTR 6m → 58m (+52m) · **downtime 1h 58m → 133h 48m (+131h 50m)**
- 🔻 **Voyage AI** — Score 85 → 74 (−11) · **MTTR 14m → 11h 20m (+11h 6m)** · downtime 14m → 11h 20m (+11h 6m)
- 🔻 **Mistral API** — Score 78 → 37 (−41) · MTTR 1h 24m → 2h 4m (+40m) · **downtime 54h 55m → 145h 14m (+90h 19m)**
- 🔺 **Codex** — Score 76 → 86 (+10) · MTTR 11h 25m → 1h 1m (−10h 24m) · **downtime 91h 21m → 2h 2m (−89h 19m)**

> **Partial month**: 2026-08 had fewer than a full month of monitoring — its point is indicative, not a full-month comparison. MTTR / downtime show "—" for any month a service recorded zero incidents.

---


## AIWatch Score — August 2026 Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Combines four components — Uptime (40%), Incident affected days (25%), Recovery speed (15%), Responsiveness (20%, the p50 RTT + stability figures shown under [Responsiveness Inputs](#responsiveness-inputs-score-component)). The separate [API Response Time — Monthly p75](#api-response-time--monthly-p75) table is a network-latency reference that does *not* feed the Score; full breakdown of weights, fallbacks, and penalties is in [About This Report → AIWatch Score](#about-this-report). [How it's calculated →](https://ai-watch.dev/methodology#score)

*41 of 45 services ranked — 38 in the table below, 3 with no official uptime ranked separately under it. **Amazon Bedrock, Azure OpenAI, Grok are excluded from this ranking** — no official uptime metric and no direct latency probe, so AIWatch can measure only two of the Score's four components and withholds a Score rather than rank on insufficient signal. Incidents are still tracked (see [Incident Summary](#incident-summary)). **Character.AI is excluded from this ranking** — its incident feed is frozen, so the Score would rest on a partial month (see "Stale source" under [Incident Summary](#incident-summary)).*

| Rank | Service | Score | Grade | Uptime Source | Why |
|---|---|---|---|---|---|
| 1 | Windsurf | 100 | Excellent | Official | Zero incidents, 100.00% uptime |
| 2 | Junie | 96 | Excellent | Official | 1 incident, 10m |
| 3 | Groq Cloud | 92 | Excellent | Official | Zero incidents, 100.00% uptime |
| 4 | Modal | 91 | Excellent | Platform | 12 incidents, fast recovery (avg 19m) |
| 5 | Cerebras Inference | 89 | Good | Official | 1 incident, 1m |
| 6= | OpenRouter | 87 | Good | Official | 2 incidents, avg 1h 22m |
| 6= | Hugging Face | 87 | Good | Platform | 3 incidents, avg 2h 42m |
| 6= | DeepSeek App | 87 | Good | Official | 7 incidents, fast recovery (avg 26m) |
| 9= | Cohere API | 86 | Good | Official | 1 incident, 58m |
| 9= | fal.ai | 86 | Good | Official | Zero incidents, 100.00% uptime |
| 9= | Stability AI | 86 | Good | Official | Zero incidents, 100.00% uptime |
| 9= | Twelve Labs | 86 | Good | Official | 3 incidents |
| 9= | Codex | 86 | Good | Official | 2 incidents, avg 1h 1m |
| 14 | Luma (Dream Machine) | 85 | Good | Platform | Zero incidents, 100.00% uptime |
| 15= | ElevenLabs | 83 | Good | Official | 6 incidents, avg 3h 24m |
| 15= | Pinecone | 83 | Good | Official | 1 incident, 22m |
| 17= | Perplexity | 80 | Good | Official | 3 incidents, avg 1h 52m |
| 17= | Runway | 80 | Good | Official | 4 incidents, avg 57m |
| 19= | OpenAI API | 79 | Good | Official | 2 incidents, avg 4h 14m |
| 19= | Replicate | 79 | Good | Official | 4 incidents, avg 1h 31m |
| 21= | DeepSeek API | 78 | Good | Official | 14 incidents, avg 4h 44m |
| 21= | AssemblyAI | 78 | Good | Official | 6 incidents, avg 39m |
| 21= | turbopuffer | 78 | Good | Official | 1 incident, 1h 38m |
| 24= | LangChain (LangSmith) | 76 | Good | Official | 5 incidents, avg 5h 51m |
| 24= | Langfuse | 76 | Good | Official | 8 incidents, avg 1h 39m |
| 26= | Fireworks AI | 75 | Good | Official | 138 incidents, avg 58m |
| 26= | claude.ai | 75 | Good | Official | 21 incidents, avg 1h 28m |
| 28 | Voyage AI | 74 | Fair | Official | 1 incident, 11h 20m |
| 29= | Kimi (Moonshot AI) | 73 | Fair | Official | 44 incidents, avg 2h 18m |
| 29= | GitHub Copilot | 73 | Fair | Official | 10 incidents, avg 1h 51m |
| 31= | Claude API | 71 | Fair | Official | 18 incidents, avg 1h 49m |
| 31= | Together AI | 71 | Fair | Platform | 64 incidents, avg 1h 19m |
| 33 | Black Forest Labs (FLUX) | 70 | Fair | Official | 7 incidents, avg 5h 2m |
| 34 | Claude Code | 69 | Fair | Official | 21 incidents, avg 1h 38m |
| 35 | ChatGPT | 66 | Fair | Official | 17 incidents, avg 3h 42m |
| 36 | Cursor | 62 | Fair | Official | 27 incidents, avg 2h 20m |
| 37 | Helicone | 57 | Fair | Platform | 5 incidents |
| 38 | Mistral API | 37 | Unstable | Official | 70 incidents, avg 2h 4m |

**No Official Uptime**

*Scored on Incidents + Recovery + Responsiveness only — no official uptime metric, so these Scores are not on the same scale as a Score built from a measured uptime. Ranked separately rather than merged into one shared rank.*

| Rank | Service | Score | Grade | Why |
|---|---|---|---|---|
| 1 | Gemini API | 88 | Good | Zero incidents (no published uptime) |
| 2 | xAI API | 74 | Fair | 1 incident, 1h 31m |
| 3 | Deepgram | 61 | Fair | 5 incidents, avg 1h 1m |

**Grade scale**: Excellent (90+) · Good (75+) · Fair (55+) · Degrading (40+) · Unstable (<40)

<!-- Generate with: node scripts/generate-charts.js 2026-08/index.md -->
![AIWatch Score Rankings](../assets/2026-08/score-chart.svg)

> **Uptime Source column**: **Official** (AIWatch computes the figure from the incident/outage records the provider publishes) · **Platform** (a different computation, built from the status page platform's own monitors — Better Stack — rather than incidents the provider declared; not on the same basis as Official) · **No uptime** (no uptime figure resolved for this row — usually because the status page publishes none, occasionally a figure AIWatch withheld; it may still publish incident records; the Score is built from the remaining signals). A service tracked for less than the full month is excluded from the ranking, not labelled — see the note above the ranking. Full definitions: [About This Report → Uptime Source](#about-this-report).
> <!-- Keep this caption short — full definitions live in the About This Report methodology section to avoid duplicating them here. -->

---

## 30-Day Uptime

Uptime computed by AIWatch — never a copy of the percentage a provider displays on its own page (those use different periods and different definitions of downtime). The exact method differs by source; see [About This Report → Uptime Source](#about-this-report) for what Official vs Platform means. Full method: [ai-watch.dev/methodology](https://ai-watch.dev/methodology#uptime). The narrative-driven sections below (Incident Summary / Notable Incidents / Observations) cover what these numbers mean for vendor selection.

<table class="uptime-cols">
<thead><tr><th>Service</th><th>Uptime</th></tr></thead>
<tbody>
<tr><td>Cohere API</td><td>100.00%</td></tr>
<tr><td>Groq Cloud</td><td>100.00%</td></tr>
<tr><td>Cerebras Inference</td><td>100.00%</td></tr>
<tr><td>Kimi (Moonshot AI)</td><td>100.00%</td></tr>
<tr><td>fal.ai</td><td>100.00%</td></tr>
<tr><td>Stability AI</td><td>100.00%</td></tr>
<tr><td>Black Forest Labs (FLUX)</td><td>100.00%</td></tr>
<tr><td>LangChain (LangSmith)</td><td>100.00%</td></tr>
<tr><td>Runway</td><td>100.00%</td></tr>
<tr><td>Luma (Dream Machine)</td><td>100.00%</td></tr>
<tr><td>Windsurf</td><td>100.00%</td></tr>
<tr><td>Junie</td><td>100.00%</td></tr>
<tr><td>OpenRouter</td><td>99.99%</td></tr>
<tr><td>AssemblyAI</td><td>99.99%</td></tr>
<tr><td>Pinecone</td><td>99.99%</td></tr>
<tr><td>Twelve Labs</td><td>99.99%</td></tr>
<tr><td>Codex</td><td>99.98%</td></tr>
<tr><td>Modal</td><td>99.95%</td></tr>
<tr><td>DeepSeek App</td><td>99.95%</td></tr>
<tr><td>Langfuse</td><td>99.94%</td></tr>
<tr><td>OpenAI API</td><td>99.90%</td></tr>
<tr><td>turbopuffer</td><td>99.87%</td></tr>
<tr><td>ElevenLabs</td><td>99.86%</td></tr>
<tr><td>Hugging Face</td><td>99.85%</td></tr>
<tr><td>Replicate</td><td>99.85%</td></tr>
<tr><td>Voyage AI</td><td>99.83%</td></tr>
<tr><td>Perplexity</td><td>99.81%</td></tr>
<tr><td>DeepSeek API</td><td>99.80%</td></tr>
<tr><td>Fireworks AI</td><td>99.77%</td></tr>
<tr><td>Claude API</td><td>99.71%</td></tr>
<tr><td>claude.ai</td><td>99.58%</td></tr>
<tr><td>Claude Code</td><td>99.58%</td></tr>
<tr><td>Cursor</td><td>99.55%</td></tr>
<tr><td>Together AI</td><td>99.44%</td></tr>
<tr><td>GitHub Copilot</td><td>99.06%</td></tr>
<tr><td>ChatGPT</td><td>98.62%</td></tr>
<tr><td>Helicone</td><td>96.68%</td></tr>
<tr><td>Mistral API</td><td>94.90%</td></tr>
</tbody>
</table>

*Amazon Bedrock, Azure OpenAI, Character.AI, Deepgram, Gemini API, Grok, and xAI API do not publish a comparable uptime percentage on their status pages — they're excluded from this table for that reason. (xAI's [status page](https://status.x.ai) does expose per-endpoint live success rates measured since its monitoring system's last restart, but those numbers are not directly comparable to the figures above.)*

---

## Component Reliability

> AIWatch surfaces a **per-component uptime breakdown** — each multi-surface service's weakest component over the days AIWatch could read its status page, the surface most likely to be your bottleneck that a single service-level uptime number hides. It is a different measurement from the 30-Day Uptime table and **is not a Score input**; see [About This Report → Component Reliability](#about-this-report).

| Service | Weakest Component | Uptime | Components |
|---|---|---|---|
| Mistral API | Conversations API | 89.70% | 12 |
| Cursor | Cloud Agents | 91.56% | 4 |
| ChatGPT | Conversations | 93.54% | 15 |
| ElevenLabs | ElevenCreative | 96.82% | 7 |
| Fireworks AI | Kimi K3 US | 97.32% | 21 |
| LangChain (LangSmith) | LangSmith Fleet | 98.73% | 10 |
| GitHub Copilot | Copilot AI Model Providers | 98.86% | 2 |
| Black Forest Labs (FLUX) | API (api.bfl.ai) | 99.01% | 13 |
| Runway | Backend | 99.32% | 3 |
| OpenAI API | Chat Completions | 99.33% | 12 |
| AssemblyAI | Asynchronous API | 99.59% | 6 |
| Voyage AI | API | 99.68% | 2 |
| Twelve Labs | Video Indexing Task API - Marengo3.0 | 99.70% | 10 |
| Replicate | A100 Hardware | 99.71% | 12 |
| Perplexity | Computer | 99.72% | 3 |
| Langfuse | Ingestion API | 99.79% | 3 |

---

## Responsiveness Inputs (Score Component)

> **This table feeds the Score.** These are the two figures the **Responsiveness** component (20% of
> the AIWatch Score) was computed from this month: each service's median (p50) probe RTT, and the
> combined coefficient of variation (CV) of that RTT — day-to-day movement plus the p95/p50 spread.
> **Lower is better for both**: a fast service still scores poorly here if it is erratic.
>
> Do not confuse it with [API Response Time — Monthly p75](#api-response-time--monthly-p75) further
> down. That table probes the **same endpoints** but its p75 figure is **not part of the Score** —
> it is a network-speed reference only. This one is scored; that one is not.
> [How each figure becomes a sub-score →](https://ai-watch.dev/methodology#score)

| Service | p50 RTT | RTT variation (CV) |
|---|---|---|
| Gemini API | 58 ms | 0.44 |
| Claude API | 109 ms | 0.54 |
| Claude Code | 109 ms | 0.54 |
| Fireworks AI | 116 ms | 0.49 |
| Mistral API | 122 ms | 0.35 |
| Codex | 125 ms | 0.62 |
| OpenAI API | 125 ms | 0.62 |
| Cohere API | 130 ms | 0.47 |
| Groq Cloud | 135 ms | 0.34 |
| Together AI | 185 ms | 0.54 |
| Cerebras Inference | 190 ms | 0.48 |
| Perplexity | 222 ms | 0.53 |
| Hugging Face | 237 ms | 0.41 |
| Replicate | 245 ms | 0.76 |
| OpenRouter | 288 ms | 0.43 |
| ElevenLabs | 317 ms | 0.50 |
| xAI API | 325 ms | 0.39 |
| Stability AI | 444 ms | 0.59 |
| Kimi (Moonshot AI) | 457 ms | 0.38 |
| DeepSeek API | 523 ms | 0.17 |
| fal.ai | 609 ms | 0.44 |
| Voyage AI | 613 ms | 0.32 |
| AssemblyAI | 638 ms | 0.54 |
| Pinecone | 686 ms | 0.35 |
| Black Forest Labs (FLUX) | 693 ms | 0.43 |
| LangChain (LangSmith) | 766 ms | 0.35 |
| Runway | 885 ms | 0.42 |
| Twelve Labs | 892 ms | 0.38 |
| Luma (Dream Machine) | 929 ms | 0.41 |
| turbopuffer | 943 ms | 0.38 |
| Langfuse | 1136 ms | 0.31 |
| Cursor | 1171 ms | 0.41 |
| Helicone | 1252 ms | 0.34 |
| Deepgram | 1526 ms | 0.73 |

---


## API Response Time — Monthly p75

These p75 figures are a network-latency reference: direct API-endpoint round-trip time, probed from the Cloudflare Workers edge every 5 minutes — not inference latency. Lower is better. **This table does not feed the Score** — the Score's Responsiveness component reads the *median* (p50) RTT and its stability instead, shown above under [Responsiveness Inputs](#responsiveness-inputs-score-component). So this table ranks *which service is fastest on the network*, while [AIWatch Score](#aiwatch-score--august-2026-reliability-rankings) ranks *which is safest to rely on*. A service AIWatch does not probe has no row here; that alone does not drop it from the Score ranking.

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 32 probe targets: 30 API services (incl. twelvelabs) + cursor (coding agent) + characterai (app, detail-card only, aiwatch#921). A service AIWatch does not probe simply has no row here (13 of 41 in June 2026, ten of them ranked); that alone does not affect its Score. -->
<!-- p95 + Spikes are present in probe:daily:{date} (CLAUDE.md KV schema) but not yet
     surfaced by /api/report. vs-Last-Month additionally requires reading the previous
     month's archive:monthly:* and computing deltas. Re-add the columns once the
     report API carries them — file a tracking issue if not already open. -->

| Rank | Service | p75 (ms) |
|---|---|---|
| 1 | Gemini API | 64 |
| 2 | Claude API | 127 |
| 3 | Mistral API | 132 |
| 4 | Fireworks AI | 140 |
| 5= | OpenAI API | 150 |
| 5= | Cohere API | 150 |
| 7 | Groq Cloud | 152 |
| 8 | Together AI | 216 |
| 9 | Cerebras Inference | 224 |
| 10 | Perplexity | 261 |
| 11 | Hugging Face | 276 |
| 12 | Replicate | 326 |
| 13 | OpenRouter | 336 |
| 14 | xAI API | 376 |
| 15 | ElevenLabs | 379 |
| 16 | Kimi (Moonshot AI) | 511 |
| 17 | Stability AI | 541 |
| 18 | DeepSeek API | 556 |
| 19 | Voyage AI | 699 |
| 20 | fal.ai | 715 |
| 21 | Pinecone | 787 |
| 22 | AssemblyAI | 804 |
| 23 | Black Forest Labs (FLUX) | 846 |
| 24 | LangChain (LangSmith) | 887 |
| 25 | Runway | 1022 |
| 26 | Twelve Labs | 1031 |
| 27 | Luma (Dream Machine) | 1077 |
| 28 | turbopuffer | 1081 |
| 29 | Character.AI | 1206 |
| 30 | Langfuse | 1280 |
| 31 | Cursor | 1359 |
| 32 | Helicone | 1449 |
| 33 | Deepgram | 2059 |


---

## Detection & RTT Degradation

### Detection Latency

AIWatch independently detects incidents and alerts within **~5 minutes** — the probe/poll cadence, the upper bound on how long an issue can go unnoticed by our monitoring. This is independent, low-latency awareness across all monitored services, not a timing comparison against any provider's status page.

### RTT Degradation Detection

AIWatch's direct RTT probes flagged **508** latency degradations this month, of which **469** were **not reflected on the providers' official status pages** — slowdowns status pages typically don't report, only hard outages.

| Service | RTT Degradations | Not on Status Page |
|---|---|---|
| Cerebras Inference | 69 | 68 |
| Replicate | 65 | 59 |
| Fireworks AI | 43 | 37 |
| xAI API | 43 | 41 |
| Claude API | 40 | 26 |
| Perplexity | 33 | 32 |
| Hugging Face | 30 | 30 |
| OpenAI API | 24 | 21 |
| Luma (Dream Machine) | 23 | 22 |
| Cohere API | 19 | 19 |
| Mistral API | 18 | 17 |
| Deepgram | 14 | 14 |
| Runway | 13 | 13 |
| ElevenLabs | 12 | 12 |
| OpenRouter | 12 | 12 |
| Cursor | 11 | 8 |
| Gemini API | 7 | 7 |
| turbopuffer | 6 | 6 |
| Stability AI | 5 | 4 |
| Character.AI | 5 | 5 |
| fal.ai | 4 | 4 |
| Together AI | 3 | 3 |
| Twelve Labs | 3 | 3 |
| Helicone | 3 | 3 |
| AssemblyAI | 3 | 3 |

> **RTT degradation detection** is AIWatch's differentiator: synthetic probes measure real latency degradation that official status pages (which report hard-down, not slowness) often omit entirely.

---


## AI Prediction Accuracy

When an incident opens, AIWatch's AI publishes an estimated recovery window. **180** of those estimates could be scored against the incident's actual recovery in August. Median absolute error: **45m**.

| Metric | Value |
|---|---|
| Estimates scored | 180 |
| Median absolute error | 45m |
| Recovered by the estimated time | 129 (72%) |
| Took longer than the estimate | 51 (28%) |

> **How this is scored**: the estimate is the upper bound of the recovery window AIWatch published for that incident, and the error is the gap between that bound and the actual recovery. One provider incident affecting several services is scored once. Not every incident carries an estimate, so this is a sample of the month's incidents — it is not comparable to the incident counts elsewhere in this report.

---


## Incident Summary

> **Reading the count column**: The count is how many incidents a provider published for that service. Granularity differs — Anthropic posts a separate incident per model ("Elevated errors for Claude Opus 4.7", "Degraded performance for Claude Sonnet 4.6"), and Together AI's status page tracks each model as its own resource — so both show higher totals than providers that post one incident per event. Higher count ≠ lower reliability — adjust for granularity before comparing across providers. From August 2026 a Platform-source service's uncovered downtime days can be counted differently again: those days are **reconstructed from the page's daily availability record, one per (resource, downtime day)** — a service can end up with a mix of these and published events in the same month, which can make its count not continuous with earlier months; see [About This Report → Reconstructed incidents](#about-this-report) for how that affects the Longest / Avg Resolution columns. Full provider-by-provider rules: [About This Report → Incident Counting](#about-this-report).
>
> <!-- Cycle-specific data notes (excluded incidents, anomalies) go here. -->

<table>
<thead>
<tr><th>Service</th><th>Inc</th><th>Downtime (longest)</th><th class="hide-mobile">Longest</th><th class="hide-mobile">Avg Resolution</th></tr>
</thead>
<tbody>
<tr><td>Fireworks AI</td><td>138</td><td>133h 48m (46h 36m)</td><td class="hide-mobile">46h 36m</td><td class="hide-mobile">58m</td></tr>
<tr><td>Mistral API</td><td>70</td><td>145h 14m (122h 14m)</td><td class="hide-mobile">122h 14m</td><td class="hide-mobile">2h 4m</td></tr>
<tr><td>Together AI</td><td>64</td><td>80h 44m (21h 49m)</td><td class="hide-mobile">21h 49m</td><td class="hide-mobile">1h 19m</td></tr>
<tr><td>Kimi (Moonshot AI)</td><td>44</td><td>100h 59m (9h 26m)</td><td class="hide-mobile">9h 26m</td><td class="hide-mobile">2h 18m</td></tr>
<tr><td>Cursor</td><td>27</td><td>63h 13m (6h 57m)</td><td class="hide-mobile">6h 57m</td><td class="hide-mobile">2h 20m</td></tr>
<tr><td>claude.ai</td><td>21</td><td>30h 49m (7h 9m)</td><td class="hide-mobile">7h 9m</td><td class="hide-mobile">1h 28m</td></tr>
<tr><td>Claude Code</td><td>21</td><td>34h 27m (7h 9m)</td><td class="hide-mobile">7h 9m</td><td class="hide-mobile">1h 38m</td></tr>
<tr><td>Claude API</td><td>18</td><td>32h 38m (7h 9m)</td><td class="hide-mobile">7h 9m</td><td class="hide-mobile">1h 49m</td></tr>
<tr><td>ChatGPT</td><td>17</td><td>62h 46m (12h 44m)</td><td class="hide-mobile">12h 44m</td><td class="hide-mobile">3h 42m</td></tr>
<tr><td>DeepSeek API</td><td>14</td><td>66h 9m (60h 33m)</td><td class="hide-mobile">60h 33m</td><td class="hide-mobile">4h 44m</td></tr>
<tr><td>Modal</td><td>12</td><td>3h 41m (1h 26m)</td><td class="hide-mobile">1h 26m</td><td class="hide-mobile">19m</td></tr>
<tr><td>GitHub Copilot</td><td>10</td><td>18h 33m (7h 36m)</td><td class="hide-mobile">7h 36m</td><td class="hide-mobile">1h 51m</td></tr>
<tr><td>Langfuse</td><td>8</td><td>13h 11m (3h 27m)</td><td class="hide-mobile">3h 27m</td><td class="hide-mobile">1h 39m</td></tr>
<tr><td>Black Forest Labs (FLUX)</td><td>7</td><td>35h 16m (17h 44m)</td><td class="hide-mobile">17h 44m</td><td class="hide-mobile">5h 2m</td></tr>
<tr><td>DeepSeek App</td><td>7</td><td>3h 3m (1h 19m)</td><td class="hide-mobile">1h 19m</td><td class="hide-mobile">26m</td></tr>
<tr><td>ElevenLabs</td><td>6</td><td>20h 26m (9h 54m)</td><td class="hide-mobile">9h 54m</td><td class="hide-mobile">3h 24m</td></tr>
<tr><td>AssemblyAI</td><td>6</td><td>3h 53m (1h 48m)</td><td class="hide-mobile">1h 48m</td><td class="hide-mobile">39m</td></tr>
<tr><td>Deepgram</td><td>5</td><td>5h 4m (3h 40m)</td><td class="hide-mobile">3h 40m</td><td class="hide-mobile">1h 1m</td></tr>
<tr><td>LangChain (LangSmith)</td><td>5</td><td>29h 17m (16h 38m)</td><td class="hide-mobile">16h 38m</td><td class="hide-mobile">5h 51m</td></tr>
<tr><td>Helicone</td><td>5</td><td>71h 26m</td><td class="hide-mobile">—</td><td class="hide-mobile">—</td></tr>
<tr><td>Replicate</td><td>4</td><td>6h 2m (3h 8m)</td><td class="hide-mobile">3h 8m</td><td class="hide-mobile">1h 31m</td></tr>
<tr><td>Runway</td><td>4</td><td>3h 47m (1h 24m)</td><td class="hide-mobile">1h 24m</td><td class="hide-mobile">57m</td></tr>
<tr><td>Perplexity</td><td>3</td><td>5h 35m (3h 33m)</td><td class="hide-mobile">3h 33m</td><td class="hide-mobile">1h 52m</td></tr>
<tr><td>Hugging Face</td><td>3</td><td>8h 7m (8h)</td><td class="hide-mobile">8h</td><td class="hide-mobile">2h 42m</td></tr>
<tr><td>Twelve Labs</td><td>3</td><td>—</td><td class="hide-mobile">—</td><td class="hide-mobile">—</td></tr>
<tr><td>OpenAI API</td><td>2</td><td>8h 27m (8h 27m)</td><td class="hide-mobile">8h 27m</td><td class="hide-mobile">4h 14m</td></tr>
<tr><td>OpenRouter</td><td>2</td><td>2h 44m (2h 43m)</td><td class="hide-mobile">2h 43m</td><td class="hide-mobile">1h 22m</td></tr>
<tr><td>Codex</td><td>2</td><td>2h 2m (1h 8m)</td><td class="hide-mobile">1h 8m</td><td class="hide-mobile">1h 1m</td></tr>
<tr><td>Cohere API</td><td>1</td><td>58m (58m)</td><td class="hide-mobile">58m</td><td class="hide-mobile">58m</td></tr>
<tr><td>Cerebras Inference</td><td>1</td><td>1m (1m)</td><td class="hide-mobile">1m</td><td class="hide-mobile">1m</td></tr>
<tr><td>xAI API</td><td>1</td><td>1h 31m (1h 31m)</td><td class="hide-mobile">1h 31m</td><td class="hide-mobile">1h 31m</td></tr>
<tr><td>Pinecone</td><td>1</td><td>22m (22m)</td><td class="hide-mobile">22m</td><td class="hide-mobile">22m</td></tr>
<tr><td>turbopuffer</td><td>1</td><td>1h 38m (1h 38m)</td><td class="hide-mobile">1h 38m</td><td class="hide-mobile">1h 38m</td></tr>
<tr><td>Voyage AI</td><td>1</td><td>11h 20m (11h 20m)</td><td class="hide-mobile">11h 20m</td><td class="hide-mobile">11h 20m</td></tr>
<tr><td>Junie</td><td>1</td><td>10m (10m)</td><td class="hide-mobile">10m</td><td class="hide-mobile">10m</td></tr>
</tbody>
</table>

**Zero incidents (9 services):** Gemini API, Amazon Bedrock, Azure OpenAI, Groq Cloud, fal.ai, Stability AI, Luma (Dream Machine), Grok, Windsurf — confirmed via their status-page incident feeds.

**Stale source (1 service):** Character.AI — AIWatch can no longer read its incident feed, which is frozen at the last reachable fetch. The incident count covers only the window up to that cutoff, not the full month, so treat it as a floor rather than a verified picture. A frozen feed also removes the service from the Score ranking.

---

## Notable Incidents

<!-- BEGIN AUTO-DRAFT (Notable Incidents) — review, adapt into the entries below, then DELETE this entire block before merge -->
_Auto-generated retrospective draft (gemma) — review for accuracy, adapt, then delete this block._

### 1. Elevated latency in the Responses API
**Affected**: OpenAI API
**Duration**: ongoing

Latency levels for the Responses API remained elevated and the incident was still being monitored at the end of the reporting period.

### 2. Embedding API Degraded · Embeddings API
**Affected**: Mistral API
**Duration**: 5d 2h

The Embeddings API experienced a significant degradation lasting several days before being resolved.

### 3. DeepSeek API 性能下降（DeepSeek API Degraded Performance）
**Affected**: DeepSeek API
**Duration**: 2d 13h

Performance degradation was observed across the DeepSeek API for over two days.

### 4. Outage in BC Clusters
**Affected**: Fireworks AI
**Duration**: 1d 23h

An outage affecting BC clusters resulted in service unavailability for nearly two days.

### 5. Inkling Small — down
**Affected**: Together AI
**Duration**: 21h 49m

The Inkling Small model experienced a total outage lasting nearly 22 hours.

### 6. Flux 3 Launch Traffic
**Affected**: Black Forest Labs (FLUX)
**Duration**: 17h 44m

Service was impacted by heavy traffic loads during the Flux 3 launch.

<!-- END AUTO-DRAFT (Notable Incidents) -->

<!-- Top 5-6 notable incidents — the report's main narrative content. Place this
     section in the narrative cluster (Incident Summary → Notable Incidents →
     Observations) that follows the metrics cluster (Score → 30-Day Uptime →
     API Response Time → Detection & RTT Degradation). Each entry: title with key duration,
     affected component(s), and a short prose paragraph that explains scope +
     remediation/mitigation.
     Each entry must describe the ACTUAL EVENT — pull the real title / root cause from the archive's
     incidentList (what broke, which component, the provider's own wording), NOT just "downtime was N
     hours". And verify it is a genuine availability incident (see AUTHORING SELF-CHECK #3): if the
     longest "incident" is a usage-limits / policy advisory, say so and do not frame it as an outage. -->

### 1. [Title]
**Affected**: <!-- Include region if applicable: e.g., "xAI API — EU (eu-west-1)" -->
**Duration**:

<!-- Description -->

---

## Observations

<!-- BEGIN AUTO-DRAFT (Observations) — review, adapt into the bullets below, then DELETE this entire block before merge -->
_Auto-generated retrospective draft (gemma) — review, adapt into prescriptive bullets, then delete this block._

- Treat Mistral API as high-risk for production embedding workflows due to degrading reliability and long recovery times.
- Implement robust retry logic and circuit breakers when using ChatGPT for time-sensitive user interactions given its high average recovery time.
- Utilize Modal for latency-critical tasks, as it demonstrated excellent stability and the fastest recovery metrics.
- Monitor DeepSeek API performance closely for production workloads, as recovery periods are significantly longer than the platform average.

<!-- END AUTO-DRAFT (Observations) -->

**This month's** per-service resilience deltas — what each service's data *newly* argues for. The evergreen, month-to-month-stable patterns (per-model monitoring, Voice-Agent isolation, key rotation, retry-timeout tuning, failover mechanics) live once in **[Resilience Patterns](../resilience/)** — link there, don't re-explain them. Each bullet ties THIS month's failure mode to the relevant pattern and adds only what's new.

<!-- ROLE BOUNDARY — this section vs its neighbours (they blur; keep each to its ONE job):
     • Recommendations   = the PICKS TABLE — WHO to use per use case. Only place for picks.
     • Notable Incidents = the EVENT — what happened + why it mattered. DESCRIBE; do not prescribe.
     • Incident Summary note = how to READ the counts (granularity; count ≠ reliability). Only home for that.
     • ../resilience/ (Resilience Patterns) = the EVERGREEN, structural how-to-build guidance that holds
       every month (per-model monitoring, Voice-Agent isolation, Gemini key rotation + dual monitoring,
       retry timeout = the Longest column, coding-agent auto-failover). Stated ONCE there — do NOT re-lecture
       it monthly; that cross-month repetition is exactly what this split fixes. New evergreen pattern? Add it
       to that page, not here — following the MAINTENANCE curation rules at the top of ../resilience/
       (evergreen + high-value only, one pattern per failure-mode, prune stale bullets on edit).
     • Observations (here) = THIS MONTH'S DELTA only — the specific failure mode the month surfaced, tied to
       the relevant Resilience pattern with a link. The only home for the month's actionable advice, so Notable
       Incidents stays descriptive (don't end an incident with "keep a fallback" — put the delta here + link).
     THE TEST for a bullet: would it read identically next month? If yes, it's evergreen — move it to
     ../resilience/ and link. Every bullet must carry a DATE-TIED fact (this month X's worst was a 27h Y; a
     single 72h Z) and point at the pattern, not restate the architecture. A partial-month / withheld-Score
     CAVEAT (e.g. Character.AI) is a legitimate month-specific bullet too. -->


- **[Service]**: <!-- THIS month's date-tied failure fact (e.g. "its worst incident was a 27h streaming-STT degradation; p75 the highest probed"), DEEP-linked to the relevant Resilience pattern ([Resilience → Deepgram](../resilience/#deepgram)). Do NOT re-explain the evergreen pattern — link it. -->
- **[Service]**: <!-- 2-4 bullets total; only services whose THIS-MONTH data yields a new lesson. If a service's story is unchanged from a prior report, omit it (the pattern already lives in ../resilience/). -->
<!-- A partial-month / withheld-Score CAVEAT bullet (e.g. Character.AI: why its Score is absent + how to read
     its half-month counts) belongs here too — it's month-specific and not an evergreen pattern. -->

---

## Security Alerts

> **Note:** Security alerts captured during the month from OSV.dev (AI SDK package vulnerabilities) and Hacker News (security posts mentioning monitored services). Section omitted for months without detections.

**Total alerts:** 9

**By source**

| Source | Count |
|---|---|
| OSV.dev | 4 |

**By severity**

| Critical | High | Medium | Low |
| --- | --- | --- | --- |
| 0 | 4 | 5 | 0 |

**Most affected services**

| Service | Count |
|---|---|
| Claude Code | 3 |
| LangChain | 2 |
| Hugging Face | 2 |
| Gemini | 1 |
| OpenAI Codex | 1 |

### Top Findings



#### 1. [CVE-2026-49986: The Cortex MCP server (`neuro-cortex-memory`), a cross-platform persistent memory MCP, prior to version 3.17.1 treats the `CLAUDE_PROJECT...](https://nvd.nist.gov/vuln/detail/CVE-2026-49986) · `high`
- **Source:** nvd
- **Affected:** Claude Code
- **Detected:** 2026-08-14

#### 2. [CVE-2026-73614: Network-AI ClaudeHookBridge before 5.15.1 truncates the target string to 500 characters before evaluating denyPatterns, while Claude Code...](https://nvd.nist.gov/vuln/detail/CVE-2026-73614) · `high`
- **Source:** nvd
- **Affected:** Claude Code
- **Detected:** 2026-08-13

#### 3. [CVE-2026-73222: Claude Code Templates is a CLI tool for configuring and monitoring Claude Code.](https://nvd.nist.gov/vuln/detail/CVE-2026-73222) · `high`
- **Source:** nvd
- **Affected:** Claude Code
- **Detected:** 2026-08-11

#### 4. [CVE-2026-73079: Sub2API is an AI API gateway platform designed to distribute and manage API quotas from AI product subscriptions.](https://nvd.nist.gov/vuln/detail/CVE-2026-73079) · `high`
- **Source:** nvd
- **Affected:** OpenAI Codex
- **Detected:** 2026-08-11

#### 5. [Transformers Regular Expression Denial of Service (ReDoS) vulnerability](https://nvd.nist.gov/vuln/detail/CVE-2024-12720) · `medium`
- **Source:** OSV.dev
- **Affected:** Hugging Face
- **Detected:** 2026-08-13

#### 6. [Transformers Regular Expression Denial of Service (ReDoS) vulnerability](https://nvd.nist.gov/vuln/detail/CVE-2025-1194) · `medium`
- **Source:** OSV.dev
- **Affected:** Hugging Face
- **Detected:** 2026-08-13

#### 7. [LangChain: Path traversal and sandbox escape in LangChain file-search middleware and loaders](https://github.com/langchain-ai/langchain/security/advisories/GHSA-gr75-jv2w-4656) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-08-07

#### 8. [LangChain: Path traversal and sandbox escape in LangChain file-search middleware and loaders](https://github.com/langchain-ai/langchain/security/advisories/GHSA-gr75-jv2w-4656) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-08-07

#### 9. [CVE-2026-54785: gemini-bridge is a lightweight MCP server bridging AI agents to Google's Gemini AI via the official CLI.](https://nvd.nist.gov/vuln/detail/CVE-2026-54785) · `medium`
- **Source:** nvd
- **Affected:** Gemini
- **Detected:** 2026-08-01

---


## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 45 services are polled every **5 minutes** via Cloudflare Workers. Those with a probeable API endpoint also get a direct response-time (RTT) health-check at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). A service with no probe endpoint is scored on the remaining components rescaled to 100, with **no penalty**. A service that has a probe but fewer than 7 days of samples gets that same rescale **plus a 5% penalty** until its probe data matures. Full methodology: [ai-watch.dev/methodology#score](https://ai-watch.dev/methodology#score)
* **Uptime Source:** *Official* = AIWatch computes an uptime figure from the incident and outage records the provider publishes on its status page. *Platform* = a different computation built from the status-page platform's own monitors (Better Stack) rather than incidents the provider declared. *No uptime* = no uptime figure resolved for this row — usually because the status page publishes none, occasionally a figure AIWatch computed but withheld; a service in this tier may still publish incident records, which is what drives the MTTR/downtime figures elsewhere in this report. The exact window and weighting behind each figure varies by status-page platform; full source-by-source method: [ai-watch.dev/methodology](https://ai-watch.dev/methodology#uptime). The Score then drops its 40-point Uptime component and is rescaled over the remaining signals (incidents, recovery, responsiveness), so the result is **not** on the same scale as a Score built from a measured uptime. Where this report knows which services those are, they are **ranked in their own table**, never merged into a single rank sequence. A service with **neither** uptime **nor** a probe has too little signal, so its Score is withheld and it is not ranked at all. The note above the Score table names whichever services that is — the membership is read from the data, not fixed here. A service AIWatch tracked for only part of the month is **excluded from the ranking** rather than labelled — its partial-month Score would rest on insufficient coverage. The label describes the Uptime input, not the Score's rigour.
* **Incident Counting:** Counts are the incidents each provider published, attributed to the service they affected. Providers differ in granularity, and in *where* that granularity lives: Anthropic maps to a single status-page component but posts one incident **per model**; Together AI tracks each model as its own **resource**, so one event can surface as several incidents. Others post one incident per event at the service level. Compare counts only across providers with comparable granularity.
* **Reconstructed incidents (from August 2026):** For a Platform-source (Better Stack) service, a downtime day its published incident feed doesn't cover — whether because the feed has gone fully quiet or the feed simply never reported that particular day — can still be reconstructed from the page's own **daily availability record**, per monitored resource. This changes what the count means for that portion: **one entry per (resource, downtime day)**, not one per event — a single outage spanning three days on one resource is three entries, and one day with several resources down is several entries, not one. A service can therefore end up with a **mix** of published, event-based entries and reconstructed, day-bucket entries in the same month, so its count is not always continuous with earlier months where every entry was a published event. Total downtime mostly carries over, but not exactly — a day with under 10 minutes of recorded downtime is dropped from the reconstruction, and the sweep only reaches back so far, so a small amount can go uncounted at the edges. A reconstructed entry cannot carry a *recovery time* (a day's downtime total isn't the length of one outage), so it's excluded from the **Longest** / **Avg Resolution** columns — those columns are computed only from the service's published, event-based entries, which is why a service with some reconstructed entries can still show real Longest/Avg Resolution values rather than "—" in both.
* **Uptime Metrics:** Every percentage in the 30-Day Uptime table is computed by AIWatch from the outage records the status page publishes — never copied from the figure a provider displays on its own page, and computed by a different method depending on the Uptime Source (see *Uptime Source* above). Its **scope** depends on what the page exposes: a single component for some services, a worst-of across a component set for others, an upstream platform monitor for others still. A service with no resolved uptime figure (see *No uptime* under *Uptime Source* above) doesn't get a row in this table at all. A service's **Incident Summary** count and total downtime are not limited to that same scope, though — an incident on a component outside it still adds to those totals without moving the uptime percentage, which is why the two can diverge sharply for one long incident on a narrower surface.
* **Component Reliability:** A **different measurement** from every other uptime figure in this report — do not compare them. AIWatch polls each service's status page every 5 minutes and, per component, counts a poll as good **only** when that component reads `operational`; `degraded` and `partial outage` both count against it, with no weighting by incident severity (severity is recorded per *service*, not per component). The percentage is that ratio of good polls, over the days AIWatch could read the page. Only components AIWatch surfaces for that service are counted — billing, docs and compliance surfaces are excluded — and a service needs at least two of them to appear at all. The table lists only each service's **weakest** component, and only when it fell below 99.9%: it is a list of where to look, not a ranking of everything.
* **Timezone Standard:** All timestamps are recorded in **UTC**.

**Next report**: September 2026

---

- **Live status** — [ai-watch.dev](https://ai-watch.dev)
- **Slack/Discord alerts** — [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
- **Score methodology** — [ai-watch.dev/methodology#score](https://ai-watch.dev/methodology#score)
- **All reports** — [ai-watch.dev/reports](https://ai-watch.dev/reports/)

---

- *Have feedback or spotted an error?* [Open an issue](https://github.com/bentleypark/aiwatch/issues/new)
- *Want us to track a service?* [Request here](https://github.com/bentleypark/aiwatch/issues/new?template=service_request.md)
