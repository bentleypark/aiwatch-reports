---
layout: page
title: "July 2026 AI Reliability Report"
description: "Monthly reliability report for 45 AI services including OpenAI, Anthropic Claude, Gemini, Amazon Bedrock, Pinecone, and more. Uptime, incidents, and AIWatch Score rankings."
date: 2026-08-28
published: false
---

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: July 1–31, 2026
> **Published**: August 2026
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

- ⚠️ **Together AI** — led the Summary 'High incident count' bullet in 2 of the last 3 published months (2026-04, 2026-05) + this month (2026-07). (last month 85 → this month 65) → Reframe around the change or pick a fresh lens.
- ⚠️ **Together AI** — led a Key Insight pattern in 2 of the last 3 published months (2026-05, 2026-06) + this month (2026-07). (last month 85 → this month 65) → Reframe around the change or pick a fresh lens.
- ⚠️ **ChatGPT** — led a Key Insight pattern in 2 of the last 3 published months (2026-04, 2026-05) + this month (2026-07). (last month 14 → this month 26) → Reframe around the change or pick a fresh lens.
- ⚠️ **Claude Code** — led Notable Incidents in 2 of the last 3 published months (2026-05, 2026-06) + this month (2026-07). (last month 42 → this month 47) → Reframe around the change or pick a fresh lens.
- ⚠️ **Gemini API** — led Notable Incidents in 2 of the last 3 published months (2026-04, 2026-05) + this month (2026-07). (last month 3 → this month 0) → Reframe around the change or pick a fresh lens.
- ⚠️ **ChatGPT** — led Notable Incidents in 2 of the last 3 published months (2026-04, 2026-05) + this month (2026-07). (last month 14 → this month 26) → Reframe around the change or pick a fresh lens.
- ⚠️ **Mistral API** — led Notable Incidents in 2 of the last 3 published months (2026-05, 2026-06) + this month (2026-07). (last month 39 → this month 28) → Reframe around the change or pick a fresh lens.
- ⚠️ **Claude API** — led Notable Incidents in 2 of the last 3 published months (2026-05, 2026-06) + this month (2026-07). (last month 45 → this month 45) → Reframe around the change or pick a fresh lens.

<!-- END RECURRENCE CHECK -->

## Summary
<!-- BEGIN AUTO-DRAFT — review, then DELETE this entire block before merge -->
_Auto-generated narrative draft — English only; translate for the KO `<details>` block below._

- **Most reliable**: Windsurf (100 — zero incidents, perfect uptime)
- **Best balance (stability + ecosystem)**: Modal (97, only 37m downtime)
- **Riskiest this month**: Helicone (39, 81h 10m total downtime)
- **Most incidents**: Together AI (65 incidents, 29h 22m downtime — 85 last month (−20))

**Recommendations**
- **Primary**: Windsurf or Modal
- **Fallback**: Cerebras Inference (1m avg resolution) or OpenRouter (16m avg resolution)

**Recovery performance**: Fastest — Cerebras Inference (1m avg). Slowest — Helicone (40h 35m avg).

> _Ranking language above excludes Gemini API, xAI API, Deepgram — no official uptime, so their Score is not on the same scale and they are ranked in their own table (aiwatch-reports#106). Services excluded from the ranking entirely are named in the note above the Score table. Name any of them by hand if the month warrants it._

<!-- END AUTO-DRAFT -->

> Every score in this report is the **AIWatch Score** (0–100): one number combining uptime, incident load, recovery speed and responsiveness. Higher is better. [How it's built →](#aiwatch-score--july-2026-reliability-rankings)

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

July 2026 showed a clear divide: Windsurf, Modal, and Junie remained highly stable, while Helicone (39) experienced the most challenges. 37 out of 45 services recorded at least one incident, with a combined downtime of 1033h 41m.

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

![Daily Service Status](../assets/2026-07/uptime-heatmap.svg)

---

## 3-Month Trend

AIWatch Score direction over the last 3 months (2026-05 → 2026-07). The lines plot each service's composite Score. **Notable Movers** below are NOT ranked by these lines — a service earns its place, and its order, by the largest change on *any* of three axes (Score, recovery time, or total downtime), which is why one with a small Score move can top the list on a downtime swing the chart cannot show.

![AIWatch Score 3-month trend](../assets/2026-07/trend-chart.svg)

### Notable Movers

*The 5 services whose **Score, recovery time (MTTR), or total downtime** changed most over the window (ranked by the largest single change, not a fixed threshold). The metric in **bold** is the change that ranked each service here; 🔺 / 🔻 mark whether that headline metric improved or worsened — so a service can show a small Score gain yet land here, and read 🔻, because its downtime regressed.*

- 🔻 **ChatGPT** — Score 85 → 57 (−28) · MTTR 4h 38m → 6h 5m (+1h 27m) · **downtime 50h 55m → 157h 57m (+107h 2m)**
- 🔺 **Gemini API** — Score 64 → 87 (+23) · **MTTR 22h 32m → 11h 46m (−10h 46m)** · downtime 45h 4m → 35h 17m (−9h 47m)
- 🔻 **Mistral API** — Score 78 → 81 (+3) · MTTR 19m → 4h 37m (+4h 18m) · **downtime 48h 58m → 129h 28m (+80h 30m)**
- 🔻 **Replicate** — Score 61 → 49 (−12) · **MTTR 3h 43m → 13h 55m (+10h 12m)** · downtime 14h 53m → 69h 33m (+54h 40m)
- 🔻 **Claude API** — Score 63 → 61 (−2) · MTTR 1h 30m → 2h 42m (+1h 12m) · **downtime 51h → 121h 51m (+70h 51m)**

> **Scoring-method transition**: Score points before June 2026 were produced two different ways, and both changed at that boundary — so **for every service**, a Score delta spanning it compares two different measurements rather than two months of the same one. First, the earlier points are a snapshot of a rolling 30-day window taken on the day the report was built, whereas June onward scores the report month itself. Where both figures exist for the same month, they agree exactly for about a quarter of services and sit within two points for over half — but reach ten points apart at the extreme. Second, the earlier points predate a change that stopped inventing an uptime figure for services with no official uptime, which had scored those services (e.g. Deepgram) on an assumed ~99.5% uptime, later dropped. Read a Score delta across this boundary as directional, not exact. The MTTR and total-downtime deltas are measured from the incident record throughout and are unaffected.

---


## AIWatch Score — July 2026 Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Combines four components — Uptime (40%), Incident affected days (25%), Recovery speed (15%), Responsiveness (20%, the p50 RTT + stability figures shown under [Responsiveness Inputs](#responsiveness-inputs-score-component)). The separate [API Response Time — Monthly p75](#api-response-time--monthly-p75) table is a network-latency reference that does *not* feed the Score; full breakdown of weights, fallbacks, and penalties is in [About This Report → AIWatch Score](#about-this-report). [How it's calculated →](https://ai-watch.dev/methodology#score)

*38 of 45 services ranked — 35 in the table below, 3 with no official uptime ranked separately under it. **Amazon Bedrock, Azure OpenAI, Grok are excluded from this ranking** — no official uptime metric and no direct latency probe, so AIWatch can measure only two of the Score's four components and withholds a Score rather than rank on insufficient signal. Incidents are still tracked (see [Incident Summary](#incident-summary)). **Character.AI is excluded from this ranking** — its incident feed is frozen, so the Score would rest on a partial month (see "Stale source" under [Incident Summary](#incident-summary)). **turbopuffer, Twelve Labs, Kimi (Moonshot AI) are excluded from this ranking** — they were added to AIWatch mid-month, so the partial-month Score rests on insufficient coverage; they rejoin once a full month of data accrues.*

| Rank | Service | Score | Grade | Uptime Source | Why |
|---|---|---|---|---|---|
| 1 | Windsurf | 100 | Excellent | Official | Zero incidents, 100.00% uptime |
| 2 | Modal | 97 | Excellent | Platform | 3 incidents, fast recovery (avg 12m) |
| 3 | Junie | 95 | Excellent | Official | 7 incidents, fast recovery (avg 16m) |
| 4= | Cerebras Inference | 88 | Good | Official | 1 incident, 1m |
| 4= | OpenRouter | 88 | Good | Official | 2 incidents, fast recovery (avg 16m) |
| 6 | Groq Cloud | 87 | Good | Official | 1 incident, 1h 34m |
| 7 | Black Forest Labs (FLUX) | 86 | Good | Official | 1 incident, 5h 9m |
| 8= | Cohere API | 85 | Good | Official | 1 incident, 51m |
| 8= | Stability AI | 85 | Good | Official | Zero incidents, 100.00% uptime |
| 8= | GitHub Copilot | 85 | Good | Official | 7 incidents, avg 1h 33m |
| 11= | fal.ai | 84 | Good | Official | Zero incidents, 99.74% uptime |
| 11= | DeepSeek App | 84 | Good | Official | 5 incidents, avg 1h 12m |
| 13 | AssemblyAI | 83 | Good | Official | 2 incidents, fast recovery (avg 11m) |
| 14 | DeepSeek API | 82 | Good | Official | 6 incidents, fast recovery (avg 20m) |
| 15= | Mistral API | 81 | Good | Official | 28 incidents, avg 4h 37m |
| 15= | Perplexity | 81 | Good | Official | 2 incidents, avg 1h 4m |
| 15= | Langfuse | 81 | Good | Official | 2 incidents, avg 44m |
| 18= | Fireworks AI | 80 | Good | Platform | 34 incidents, fast recovery (avg 8m) |
| 18= | Hugging Face | 80 | Good | Platform | 7 incidents, avg 39m |
| 20= | Runway | 78 | Good | Official | 2 incidents, avg 42m |
| 20= | Luma (Dream Machine) | 78 | Good | Platform | 1 incident, 1h 45m |
| 22 | LangChain (LangSmith) | 77 | Good | Official | 5 incidents, avg 32m |
| 23 | OpenAI API | 76 | Good | Official | 11 incidents, avg 5h 19m |
| 24 | Codex | 74 | Fair | Official | 8 incidents, avg 7h 10m |
| 25= | Together AI | 73 | Fair | Platform | 65 incidents, fast recovery (avg 27m) |
| 25= | ElevenLabs | 73 | Fair | Official | 6 incidents, avg 2h 21m |
| 27= | Pinecone | 69 | Fair | Official | 4 incidents, avg 2h 52m |
| 27= | Voyage AI | 69 | Fair | Official | 4 incidents, avg 2h 48m |
| 29 | claude.ai | 62 | Fair | Official | 44 incidents, avg 1h 30m |
| 30 | Claude API | 61 | Fair | Official | 45 incidents, avg 2h 42m |
| 31= | Claude Code | 60 | Fair | Official | 47 incidents, avg 2h 6m |
| 31= | Cursor | 60 | Fair | Official | 32 incidents, avg 1h 28m |
| 33 | ChatGPT | 57 | Fair | Official | 26 incidents, avg 6h 5m |
| 34 | Replicate | 49 | Degrading | Official | 5 incidents, avg 13h 55m |
| 35 | Helicone | 39 | Unstable | Platform | 2 incidents, avg 40h 35m |

**No Official Uptime**

*Scored on Incidents + Recovery + Responsiveness only — no official uptime metric, so these Scores are not on the same scale as a Score built from a measured uptime. Ranked separately rather than merged into one shared rank.*

| Rank | Service | Score | Grade | Why |
|---|---|---|---|---|
| 1 | Gemini API | 87 | Good | Zero incidents (no published uptime) |
| 2 | xAI API | 70 | Fair | 2 incidents, avg 45m |
| 3 | Deepgram | 48 | Degrading | 4 incidents, avg 6h 48m |

**Grade scale**: Excellent (90+) · Good (75+) · Fair (55+) · Degrading (40+) · Unstable (<40)

<!-- Generate with: node scripts/generate-charts.js 2026-07/index.md -->
![AIWatch Score Rankings](../assets/2026-07/score-chart.svg)

> **Uptime Source column**: **Official** (AIWatch computes the 30-day figure from the incident/outage records the provider publishes) · **Platform** (same computation, but the records come from the status page platform's own monitors — Better Stack — rather than incidents the provider declared) · **No uptime** (the status page publishes no records to compute from; the Score is built from the remaining signals). A service tracked for less than the full month is excluded from the ranking, not labelled — see the note above the ranking. Full definitions: [About This Report → Uptime Source](#about-this-report).
> <!-- Keep this caption short — full definitions live in the About This Report methodology section to avoid duplicating them here. -->

---

## 30-Day Uptime

Uptime computed by AIWatch over a 30-day window from the incident and outage records each provider publishes on its status page — the same window and the same weighting for every service, so the figures compare. It is not a copy of the percentage a provider displays on its own page: those use different periods (30, 60 or 90 days) and different definitions of downtime, and cannot be compared across services. Full definitions: [ai-watch.dev/methodology](https://ai-watch.dev/methodology#uptime). The narrative-driven sections below (Incident Summary / Notable Incidents / Observations) cover what these numbers mean for vendor selection.

<table class="uptime-cols">
<thead><tr><th>Service</th><th>Uptime</th></tr></thead>
<tbody>
<tr><td>Cohere API</td><td>100.00%</td></tr>
<tr><td>Groq Cloud</td><td>100.00%</td></tr>
<tr><td>Cerebras Inference</td><td>100.00%</td></tr>
<tr><td>OpenRouter</td><td>100.00%</td></tr>
<tr><td>AssemblyAI</td><td>100.00%</td></tr>
<tr><td>Stability AI</td><td>100.00%</td></tr>
<tr><td>Black Forest Labs (FLUX)</td><td>100.00%</td></tr>
<tr><td>Langfuse</td><td>100.00%</td></tr>
<tr><td>Windsurf</td><td>100.00%</td></tr>
<tr><td>turbopuffer</td><td>100.00%</td></tr>
<tr><td>Kimi (Moonshot AI)</td><td>100.00%</td></tr>
<tr><td>ElevenLabs</td><td>99.99%</td></tr>
<tr><td>Modal</td><td>99.98%</td></tr>
<tr><td>GitHub Copilot</td><td>99.98%</td></tr>
<tr><td>LangChain (LangSmith)</td><td>99.97%</td></tr>
<tr><td>Pinecone</td><td>99.96%</td></tr>
<tr><td>Twelve Labs</td><td>99.95%</td></tr>
<tr><td>DeepSeek API</td><td>99.93%</td></tr>
<tr><td>Mistral API</td><td>99.92%</td></tr>
<tr><td>Junie</td><td>99.92%</td></tr>
<tr><td>Fireworks AI</td><td>99.90%</td></tr>
<tr><td>Runway</td><td>99.86%</td></tr>
<tr><td>Hugging Face</td><td>99.85%</td></tr>
<tr><td>Perplexity</td><td>99.82%</td></tr>
<tr><td>Together AI</td><td>99.78%</td></tr>
<tr><td>DeepSeek App</td><td>99.78%</td></tr>
<tr><td>Luma (Dream Machine)</td><td>99.75%</td></tr>
<tr><td>fal.ai</td><td>99.74%</td></tr>
<tr><td>Voyage AI</td><td>99.72%</td></tr>
<tr><td>OpenAI API</td><td>99.60%</td></tr>
<tr><td>Codex</td><td>99.56%</td></tr>
<tr><td>Cursor</td><td>99.12%</td></tr>
<tr><td>Claude API</td><td>99.11%</td></tr>
<tr><td>Claude Code</td><td>99.06%</td></tr>
<tr><td>claude.ai</td><td>98.97%</td></tr>
<tr><td>ChatGPT</td><td>98.40%</td></tr>
<tr><td>Replicate</td><td>97.58%</td></tr>
<tr><td>Helicone</td><td>96.24%</td></tr>
</tbody>
</table>

*Amazon Bedrock, Azure OpenAI, Character.AI, Deepgram, Gemini API, Grok, and xAI API do not publish a comparable uptime percentage on their status pages — they're excluded from this table for that reason. (xAI's [status page](https://status.x.ai) does expose per-endpoint live success rates measured since its monitoring system's last restart, but those numbers are not directly comparable to the figures above.)*

---

## Component Reliability

> AIWatch surfaces a **per-component uptime breakdown** — each multi-surface service's weakest component over the days AIWatch could read its status page, the surface most likely to be your bottleneck that a single service-level uptime number hides. It is a different measurement from the 30-Day Uptime table and **is not a Score input**; see [About This Report → Component Reliability](#about-this-report).

| Service | Weakest Component | Uptime | Components |
|---|---|---|---|
| Mistral API | Audio API | 86.28% | 12 |
| ChatGPT | Image Generation | 94.12% | 13 |
| Cursor | IDE | 94.20% | 4 |
| Replicate | H100 Hardware | 94.58% | 12 |
| Pinecone | Serverless Indexes | 97.70% | 6 |
| ElevenLabs | Telephony | 98.09% | 7 |
| Codex | CLI | 98.18% | 4 |
| GitHub Copilot | Copilot AI Model Providers | 98.45% | 2 |
| OpenAI API | Login | 98.51% | 12 |
| Voyage AI | API | 98.99% | 2 |
| Junie | JetBrains AI | 99.72% | 2 |
| Perplexity | Computer | 99.84% | 3 |
| Cohere API | Playground | 99.88% | 31 |

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
| Gemini API | 52 ms | 0.52 |
| Mistral API | 130 ms | 0.42 |
| Fireworks AI | 133 ms | 0.69 |
| Codex | 157 ms | 0.47 |
| Groq Cloud | 157 ms | 0.33 |
| OpenAI API | 157 ms | 0.47 |
| Cohere API | 169 ms | 0.51 |
| Claude API | 170 ms | 0.56 |
| Claude Code | 170 ms | 0.56 |
| Together AI | 221 ms | 0.67 |
| Cerebras Inference | 261 ms | 0.45 |
| Hugging Face | 324 ms | 0.53 |
| Perplexity | 325 ms | 0.45 |
| Replicate | 336 ms | 0.84 |
| OpenRouter | 378 ms | 0.41 |
| ElevenLabs | 413 ms | 0.46 |
| xAI API | 438 ms | 0.40 |
| DeepSeek API | 538 ms | 0.19 |
| Stability AI | 567 ms | 0.68 |
| Voyage AI | 698 ms | 0.37 |
| AssemblyAI | 731 ms | 0.55 |
| Pinecone | 771 ms | 0.41 |
| fal.ai | 835 ms | 0.40 |
| Black Forest Labs (FLUX) | 853 ms | 0.40 |
| LangChain (LangSmith) | 896 ms | 0.39 |
| Runway | 1086 ms | 0.47 |
| Luma (Dream Machine) | 1156 ms | 0.44 |
| Langfuse | 1290 ms | 0.37 |
| Helicone | 1513 ms | 0.34 |
| Cursor | 1586 ms | 0.36 |
| Deepgram | 1599 ms | 0.81 |

---


## API Response Time — Monthly p75

These p75 figures are a network-latency reference: direct API-endpoint round-trip time, probed from the Cloudflare Workers edge every 5 minutes — not inference latency. Lower is better. **This table does not feed the Score** — the Score's Responsiveness component reads the *median* (p50) RTT and its stability instead, shown above under [Responsiveness Inputs](#responsiveness-inputs-score-component). So this table ranks *which service is fastest on the network*, while [AIWatch Score](#aiwatch-score--july-2026-reliability-rankings) ranks *which is safest to rely on*. A service AIWatch does not probe has no row here; that alone does not drop it from the Score ranking.

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 32 probe targets: 30 API services (incl. twelvelabs) + cursor (coding agent) + characterai (app, detail-card only, aiwatch#921). A service AIWatch does not probe simply has no row here (13 of 41 in June 2026, ten of them ranked); that alone does not affect its Score. -->
<!-- p95 + Spikes are present in probe:daily:{date} (CLAUDE.md KV schema) but not yet
     surfaced by /api/report. vs-Last-Month additionally requires reading the previous
     month's archive:monthly:* and computing deltas. Re-add the columns once the
     report API carries them — file a tracking issue if not already open. -->

| Rank | Service | p75 (ms) |
|---|---|---|
| 1 | Gemini API | 62 |
| 2 | Mistral API | 159 |
| 3 | Fireworks AI | 179 |
| 4 | Groq Cloud | 182 |
| 5 | OpenAI API | 190 |
| 6 | Claude API | 206 |
| 7 | Cohere API | 225 |
| 8 | Together AI | 264 |
| 9 | Cerebras Inference | 324 |
| 10 | Perplexity | 383 |
| 11 | Hugging Face | 387 |
| 12 | Replicate | 432 |
| 13 | OpenRouter | 449 |
| 14 | ElevenLabs | 518 |
| 15 | xAI API | 522 |
| 16 | Kimi (Moonshot AI) | 550 |
| 17 | DeepSeek API | 574 |
| 18 | Stability AI | 699 |
| 19 | Voyage AI | 816 |
| 20 | Pinecone | 925 |
| 21 | AssemblyAI | 943 |
| 22 | fal.ai | 1008 |
| 23 | Black Forest Labs (FLUX) | 1033 |
| 24 | LangChain (LangSmith) | 1076 |
| 25 | Twelve Labs | 1264 |
| 26 | Runway | 1382 |
| 27 | turbopuffer | 1420 |
| 28 | Luma (Dream Machine) | 1452 |
| 29 | Langfuse | 1561 |
| 30 | Character.AI | 1669 |
| 31 | Helicone | 1755 |
| 32 | Cursor | 1904 |
| 33 | Deepgram | 2199 |


---

## Detection & RTT Degradation

### Detection Latency

AIWatch independently detects incidents and alerts within **~5 minutes** — the probe/poll cadence, the upper bound on how long an issue can go unnoticed by our monitoring. This is independent, low-latency awareness across all monitored services, not a timing comparison against any provider's status page.

### RTT Degradation Detection

AIWatch's direct RTT probes flagged **194** latency degradations this month, of which **191** were **not reflected on the providers' official status pages** — slowdowns status pages typically don't report, only hard outages.

| Service | RTT Degradations | Not on Status Page |
|---|---|---|
| Fireworks AI | 62 | 62 |
| Mistral API | 49 | 48 |
| Replicate | 28 | 28 |
| Gemini API | 12 | 12 |
| Hugging Face | 11 | 10 |
| Deepgram | 11 | 11 |
| Cohere API | 5 | 5 |
| OpenAI API | 4 | 4 |
| Helicone | 4 | 3 |
| Stability AI | 2 | 2 |
| Twelve Labs | 2 | 2 |
| OpenRouter | 1 | 1 |
| AssemblyAI | 1 | 1 |
| Cursor | 1 | 1 |
| Together AI | 1 | 1 |

> **RTT degradation detection** is AIWatch's differentiator: synthetic probes measure real latency degradation that official status pages (which report hard-down, not slowness) often omit entirely.

---


## AI Prediction Accuracy

When an incident opens, AIWatch's AI publishes an estimated recovery window. **172** of those estimates could be scored against the incident's actual recovery in July. Median absolute error: **55m**.

| Metric | Value |
|---|---|
| Estimates scored | 172 |
| Median absolute error | 55m |
| Recovered by the estimated time | 121 (70%) |
| Took longer than the estimate | 51 (30%) |

> **How this is scored**: the estimate is the upper bound of the recovery window AIWatch published for that incident, and the error is the gap between that bound and the actual recovery. One provider incident affecting several services is scored once. Not every incident carries an estimate, so this is a sample of the month's incidents — it is not comparable to the incident counts elsewhere in this report.

---


## Incident Summary

> **Reading the count column**: The count is how many incidents a provider published for that service. Granularity differs — Anthropic posts a separate incident per model ("Elevated errors for Claude Opus 4.7", "Degraded performance for Claude Sonnet 4.6"), and Together AI's status page tracks each model as its own resource — so both show higher totals than providers that post one incident per event. Higher count ≠ lower reliability — adjust for granularity before comparing across providers. Full provider-by-provider rules: [About This Report → Incident Counting](#about-this-report).
>
> <!-- Cycle-specific data notes (excluded incidents, anomalies) go here. -->

<table>
<thead>
<tr><th>Service</th><th>Inc</th><th>Downtime (longest)</th><th class="hide-mobile">Longest</th><th class="hide-mobile">Avg Resolution</th></tr>
</thead>
<tbody>
<tr><td>Together AI</td><td>65</td><td>29h 22m (1h 45m)</td><td class="hide-mobile">1h 45m</td><td class="hide-mobile">27m</td></tr>
<tr><td>Claude Code</td><td>47</td><td>98h 39m (18h 3m)</td><td class="hide-mobile">18h 3m</td><td class="hide-mobile">2h 6m</td></tr>
<tr><td>Claude API</td><td>45</td><td>121h 51m (45h 41m)</td><td class="hide-mobile">45h 41m</td><td class="hide-mobile">2h 42m</td></tr>
<tr><td>claude.ai</td><td>44</td><td>66h 11m (5h 34m)</td><td class="hide-mobile">5h 34m</td><td class="hide-mobile">1h 30m</td></tr>
<tr><td>Kimi (Moonshot AI)</td><td>40</td><td>47m (19m)</td><td class="hide-mobile">19m</td><td class="hide-mobile">9m</td></tr>
<tr><td>Fireworks AI</td><td>34</td><td>4h 24m (24m)</td><td class="hide-mobile">24m</td><td class="hide-mobile">8m</td></tr>
<tr><td>Cursor</td><td>32</td><td>46h 46m (9h 30m)</td><td class="hide-mobile">9h 30m</td><td class="hide-mobile">1h 28m</td></tr>
<tr><td>Mistral API</td><td>28</td><td>129h 28m (120h 10m)</td><td class="hide-mobile">120h 10m</td><td class="hide-mobile">4h 37m</td></tr>
<tr><td>ChatGPT</td><td>26</td><td>157h 57m (42h 23m)</td><td class="hide-mobile">42h 23m</td><td class="hide-mobile">6h 5m</td></tr>
<tr><td>Twelve Labs</td><td>12</td><td>2h 13m (42m)</td><td class="hide-mobile">42m</td><td class="hide-mobile">17m</td></tr>
<tr><td>OpenAI API</td><td>11</td><td>58h 33m (27h 58m)</td><td class="hide-mobile">27h 58m</td><td class="hide-mobile">5h 19m</td></tr>
<tr><td>Codex</td><td>8</td><td>57h 21m (27h 58m)</td><td class="hide-mobile">27h 58m</td><td class="hide-mobile">7h 10m</td></tr>
<tr><td>Hugging Face</td><td>7</td><td>4h 36m (1h 37m)</td><td class="hide-mobile">1h 37m</td><td class="hide-mobile">39m</td></tr>
<tr><td>GitHub Copilot</td><td>7</td><td>10h 48m (2h 35m)</td><td class="hide-mobile">2h 35m</td><td class="hide-mobile">1h 33m</td></tr>
<tr><td>Junie</td><td>7</td><td>1h 5m (1h 2m)</td><td class="hide-mobile">1h 2m</td><td class="hide-mobile">16m</td></tr>
<tr><td>DeepSeek API</td><td>6</td><td>1h 57m (1h 10m)</td><td class="hide-mobile">1h 10m</td><td class="hide-mobile">20m</td></tr>
<tr><td>ElevenLabs</td><td>6</td><td>14h 5m (5h 2m)</td><td class="hide-mobile">5h 2m</td><td class="hide-mobile">2h 21m</td></tr>
<tr><td>Replicate</td><td>5</td><td>69h 33m (26h 29m)</td><td class="hide-mobile">26h 29m</td><td class="hide-mobile">13h 55m</td></tr>
<tr><td>LangChain (LangSmith)</td><td>5</td><td>2h 42m (48m)</td><td class="hide-mobile">48m</td><td class="hide-mobile">32m</td></tr>
<tr><td>DeepSeek App</td><td>5</td><td>5h 58m (3h 53m)</td><td class="hide-mobile">3h 53m</td><td class="hide-mobile">1h 12m</td></tr>
<tr><td>Deepgram</td><td>4</td><td>27h 12m (23h 8m)</td><td class="hide-mobile">23h 8m</td><td class="hide-mobile">6h 48m</td></tr>
<tr><td>Pinecone</td><td>4</td><td>11h 29m (4h 55m)</td><td class="hide-mobile">4h 55m</td><td class="hide-mobile">2h 52m</td></tr>
<tr><td>Voyage AI</td><td>4</td><td>11h 10m (7h)</td><td class="hide-mobile">7h</td><td class="hide-mobile">2h 48m</td></tr>
<tr><td>Modal</td><td>3</td><td>37m (31m)</td><td class="hide-mobile">31m</td><td class="hide-mobile">12m</td></tr>
<tr><td>Perplexity</td><td>2</td><td>2h 7m (1h 41m)</td><td class="hide-mobile">1h 41m</td><td class="hide-mobile">1h 4m</td></tr>
<tr><td>xAI API</td><td>2</td><td>1h 29m (1h 3m)</td><td class="hide-mobile">1h 3m</td><td class="hide-mobile">45m</td></tr>
<tr><td>OpenRouter</td><td>2</td><td>31m (30m)</td><td class="hide-mobile">30m</td><td class="hide-mobile">16m</td></tr>
<tr><td>AssemblyAI</td><td>2</td><td>21m (20m)</td><td class="hide-mobile">20m</td><td class="hide-mobile">11m</td></tr>
<tr><td>Helicone</td><td>2</td><td>81h 10m (59h 53m)</td><td class="hide-mobile">59h 53m</td><td class="hide-mobile">40h 35m</td></tr>
<tr><td>Langfuse</td><td>2</td><td>1h 28m (1h 7m)</td><td class="hide-mobile">1h 7m</td><td class="hide-mobile">44m</td></tr>
<tr><td>Runway</td><td>2</td><td>1h 24m (1h 1m)</td><td class="hide-mobile">1h 1m</td><td class="hide-mobile">42m</td></tr>
<tr><td>Cohere API</td><td>1</td><td>51m (51m)</td><td class="hide-mobile">51m</td><td class="hide-mobile">51m</td></tr>
<tr><td>Groq Cloud</td><td>1</td><td>1h 34m (1h 34m)</td><td class="hide-mobile">1h 34m</td><td class="hide-mobile">1h 34m</td></tr>
<tr><td>Cerebras Inference</td><td>1</td><td>1m (1m)</td><td class="hide-mobile">1m</td><td class="hide-mobile">1m</td></tr>
<tr><td>Black Forest Labs (FLUX)</td><td>1</td><td>5h 9m (5h 9m)</td><td class="hide-mobile">5h 9m</td><td class="hide-mobile">5h 9m</td></tr>
<tr><td>Luma (Dream Machine)</td><td>1</td><td>1h 45m (1h 45m)</td><td class="hide-mobile">1h 45m</td><td class="hide-mobile">1h 45m</td></tr>
<tr><td>turbopuffer</td><td>1</td><td>1h 7m (1h 7m)</td><td class="hide-mobile">1h 7m</td><td class="hide-mobile">1h 7m</td></tr>
</tbody>
</table>

**Zero incidents (7 services):** Gemini API, Amazon Bedrock, Azure OpenAI, fal.ai, Stability AI, Windsurf, Grok — confirmed via their status-page incident feeds.

**Stale source (1 service):** Character.AI — AIWatch can no longer read its incident feed, which is frozen at the last reachable fetch. The incident count covers only the window up to that cutoff, not the full month, so treat it as a floor rather than a verified picture. A frozen feed also removes the service from the Score ranking.

---

## Notable Incidents

<!-- BEGIN AUTO-DRAFT (Notable Incidents) — review, adapt into the entries below, then DELETE this entire block before merge -->
_Auto-generated retrospective draft (gemma) — review for accuracy, adapt, then delete this block._

### 1. Fine Tuning Jobs API Degraded · Fine-tuning API
**Affected**: Mistral API
**Duration**: 5 days

The fine-tuning API experienced degraded performance for several days. The issue was eventually resolved.

### 2. eu.api.helicone.ai — down
**Affected**: Helicone eu.api.helicone.ai
**Duration**: 2d 12h

The European API endpoint for Helicone was completely unavailable for over two days.

### 3. Microsoft Office add-in availability
**Affected**: Claude API
**Duration**: 1d 22h

Availability was impacted for users accessing Claude via Microsoft Office add-ins.

### 4. Elevated errors affecting ChatGPT conversations
**Affected**: ChatGPT
**Duration**: 1d 18h

Users encountered increased error rates during active ChatGPT conversations.

### 5. Agentic model error alert
**Affected**: Kimi (Moonshot AI)
**Duration**: 1d 11h

The agentic model functionality triggered multiple error alerts throughout the period.

### 6. Elevated error rates on ChatGPT
**Affected**: OpenAI API
**Duration**: 1d 4h

The API service experienced elevated error rates specifically impacting ChatGPT-related requests.

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

- Avoid using Replicate for production workloads until its degrading reliability and high recovery times improve.
- Implement robust retry logic and circuit breakers when using Claude API or Claude Code due to high incident counts and slow recovery.
- Treat Kimi (Moonshot AI) as high-risk for long-running agentic workflows given its extremely high average recovery time.
- Prefer Fireworks AI or Together AI for latency-sensitive applications, as they demonstrate superior recovery speeds.
- Monitor ChatGPT usage closely during peak periods to mitigate the impact of frequent conversational errors.

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

**Total alerts:** 65

**By source**

| Source | Count |
|---|---|
| OSV.dev | 59 |
| Hacker News | 3 |

**By severity**

| Critical | High | Medium | Low |
| --- | --- | --- | --- |
| 1 | 6 | 52 | 3 |

**Most affected services**

| Service | Count |
|---|---|
| LangChain | 32 |
| Hugging Face | 23 |
| Anthropic (Claude) | 4 |
| Claude Code | 2 |
| OpenAI Codex | 1 |

### Top Findings



#### 1. [langchain vulnerable to arbitrary code execution](https://nvd.nist.gov/vuln/detail/CVE-2023-36188) · `critical`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-07-06

#### 2. [CVE-2026-57495: AgenticMail gives AI agents real email addresses and phone numbers.](https://nvd.nist.gov/vuln/detail/CVE-2026-57495) · `high`
- **Source:** nvd
- **Affected:** Claude Code
- **Detected:** 2026-07-20

#### 3. [huggingface/transformers: Arbitrary Code Execution During Model Initialization in the LightGlue Model Loading Path](https://nvd.nist.gov/vuln/detail/CVE-2026-5241) · `high`
- **Source:** OSV.dev
- **Affected:** Hugging Face
- **Detected:** 2026-07-13

#### 4. [LangSmith SDK: Public prompt pull deserializes untrusted manifests without trust boundary warning](https://github.com/langchain-ai/langsmith-sdk/security/advisories/GHSA-3644-q5cj-c5c7) · `high`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-07-13

#### 5. [LangChain vulnerable to unsafe deserialization of attacker-controlled objects through overly broad `load()` allowlists](https://github.com/langchain-ai/langchain/security/advisories/GHSA-pjwx-r37v-7724) · `high`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-07-13

#### 6. [LangChain Core has Path Traversal vulnerabilites in legacy `load_prompt` functions](https://github.com/langchain-ai/langchain/security/advisories/GHSA-qh6h-p6c9-ff54) · `high`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-07-13

#### 7. [HuggingFace transformers vulnerable to remote code execution](https://nvd.nist.gov/vuln/detail/CVE-2026-4372) · `high`
- **Source:** OSV.dev
- **Affected:** Hugging Face
- **Detected:** 2026-07-01

#### 8. [CVE-2026-64650: The `@ai-sdk/harness-opencode` tool is an HarnessV1 adapter backed by @openai/codex-sdk, which drives the codex command line interface.](https://nvd.nist.gov/vuln/detail/CVE-2026-64650) · `medium`
- **Source:** nvd
- **Affected:** OpenAI Codex
- **Detected:** 2026-07-20

#### 9. [PYSEC-2026-2288: PyPI/transformers](https://github.com/advisories/GHSA-69w3-r845-3855) · `medium`
- **Source:** OSV.dev
- **Affected:** Hugging Face
- **Detected:** 2026-07-20

#### 10. [PYSEC-2026-2289: PyPI/transformers](https://github.com/advisories/GHSA-29pf-2h5f-8g72) · `medium`
- **Source:** OSV.dev
- **Affected:** Hugging Face
- **Detected:** 2026-07-20

---


## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 45 services are polled every **5 minutes** via Cloudflare Workers. Those with a probeable API endpoint also get a direct response-time (RTT) health-check at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). A service with no probe endpoint is scored on the remaining components rescaled to 100, with **no penalty**. A service that has a probe but fewer than 7 days of samples gets that same rescale **plus a 5% penalty** until its probe data matures. Full methodology: [ai-watch.dev/methodology#score](https://ai-watch.dev/methodology#score)
* **Uptime Source:** *Official* = AIWatch computes a 30-day uptime figure from the incident and outage records the provider publishes on its status page — one window and one weighting for every service, so the figures compare. *Platform* = the same computation, but the records come from the status-page platform's own monitors (Better Stack) rather than incidents the provider declared. *No uptime* = the status page publishes no records to compute from. The Score then drops its 40-point Uptime component and is rescaled over the remaining signals (incidents, recovery, responsiveness), so the result is **not** on the same scale as a Score built from a measured uptime. Where this report knows which services those are, they are **ranked in their own table**, never merged into a single rank sequence. A service with **neither** uptime **nor** a probe has too little signal, so its Score is withheld and it is not ranked at all. The note above the Score table names whichever services that is — the membership is read from the data, not fixed here. A service AIWatch tracked for only part of the month is **excluded from the ranking** rather than labelled — its partial-month Score would rest on insufficient coverage. The label describes the Uptime input, not the Score's rigour.
* **Incident Counting:** Counts are the incidents each provider published, attributed to the service they affected. Providers differ in granularity, and in *where* that granularity lives: Anthropic maps to a single status-page component but posts one incident **per model**; Together AI tracks each model as its own **resource**, so one event can surface as several incidents. Others post one incident per event at the service level. Compare counts only across providers with comparable granularity.
* **Uptime Metrics:** Every percentage in the 30-Day Uptime table is computed by AIWatch over a trailing 30-day window from the outage records the status page publishes — never copied from the figure a provider displays on its own page (see *Uptime Source* above for how those records are sourced and weighted). Its **scope** depends on what the page exposes: a single component for some services, a worst-of across a component set for others, an upstream platform monitor for others still. Services marked with "—" publish no records to compute from.
* **Component Reliability:** A **different measurement** from every other uptime figure in this report — do not compare them. AIWatch polls each service's status page every 5 minutes and, per component, counts a poll as good **only** when that component reads `operational`; `degraded` and `partial outage` both count against it, with no weighting by incident severity (severity is recorded per *service*, not per component). The percentage is that ratio of good polls, over the days AIWatch could read the page. Only components AIWatch surfaces for that service are counted — billing, docs and compliance surfaces are excluded — and a service needs at least two of them to appear at all. The table lists only each service's **weakest** component, and only when it fell below 99.9%: it is a list of where to look, not a ranking of everything.
* **Timezone Standard:** All timestamps are recorded in **UTC**.

**Next report**: August 2026

---

- **Live status** — [ai-watch.dev](https://ai-watch.dev)
- **Slack/Discord alerts** — [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
- **Score methodology** — [ai-watch.dev/methodology#score](https://ai-watch.dev/methodology#score)
- **All reports** — [ai-watch.dev/reports](https://ai-watch.dev/reports/)

---

- *Have feedback or spotted an error?* [Open an issue](https://github.com/bentleypark/aiwatch/issues/new)
- *Want us to track a service?* [Request here](https://github.com/bentleypark/aiwatch/issues/new?template=service_request.md)
