---
layout: page
title: "June 2026 AI Reliability Report"
description: "Monthly reliability report for 43 AI services including OpenAI, Anthropic Claude, Gemini, Amazon Bedrock, Pinecone, and more. Uptime, incidents, and AIWatch Score rankings."
date: 2026-07-06
published: false
---

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: June 1–30, 2026
> **Published**: July 2026
> **Services monitored**: 43 — 33 API services, 6 coding agents, 4 AI apps

<!-- BEGIN RECURRENCE CHECK — review, reframe around the change, then DELETE this entire block before merge -->
_Narrative repeated vs prior months — lead with the month-over-month change or a fresh lens, then delete this block._

- ⚠️ **Together AI** — led the Summary 'High incident count' bullet in 2 of the last 3 published months (2026-04, 2026-05) + this month (2026-06). (last month 133 → this month 85) → Reframe around the change or pick a fresh lens.
- ⚠️ **Together AI** — led a Key Insight pattern in 2 of the last 3 published months (2026-03, 2026-05) + this month (2026-06). (last month 133 → this month 85) → Reframe around the change or pick a fresh lens.
- ⚠️ **GitHub Copilot** — led a Key Insight pattern in 2 of the last 3 published months (2026-04, 2026-05) + this month (2026-06). (last month 6 → this month 5) → Reframe around the change or pick a fresh lens.
- ⚠️ **Claude API** — led Notable Incidents in 2 of the last 3 published months (2026-03, 2026-05) + this month (2026-06). (last month 34 → this month 45) → Reframe around the change or pick a fresh lens.
- ⚠️ **Gemini API** — led Notable Incidents in 2 of the last 3 published months (2026-04, 2026-05) + this month (2026-06). (last month 2 → this month 3) → Reframe around the change or pick a fresh lens.

<!-- END RECURRENCE CHECK -->

## Summary
<!-- BEGIN AUTO-DRAFT — review, then DELETE this entire block before merge -->
_Auto-generated narrative draft — English only; translate for the KO `<details>` block below._

- **Most reliable**: Windsurf (100/100 — zero incidents, perfect uptime)
- **Best balance (stability + ecosystem)**: DeepSeek App (91/100, only 1h 35m downtime)
- **Riskiest this month**: Deepgram (44/100, 45h 33m total downtime)
- **Most incidents**: Together AI (85 incidents, 38h 9m downtime — 133 last month (−48))

**Recommendations**
- **Primary**: Windsurf or Modal
- **Fallback**: DeepSeek App (48m avg resolution) or OpenAI API (40m avg resolution)

**Recovery performance**: Fastest — Black Forest Labs (FLUX) (1m avg). Slowest — Amazon Bedrock (64h 47m avg).

<!-- END AUTO-DRAFT -->

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

June 2026 showed a clear divide: Windsurf, Modal, and DeepSeek App remained highly stable, while Deepgram (44/100) experienced the most challenges. 35 out of 41 services recorded at least one incident, with a combined downtime of 712h 26m.

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

![Daily Service Status](../assets/2026-06/uptime-heatmap.svg)

---

## 3-Month Trend

AIWatch Score direction over the last 3 months (2026-04 → 2026-06). The chart shows the composite-Score direction for every service; **Notable Movers** below decompose the biggest changes into the incident-measured metrics that actually drive a "keep relying on this?" decision — recovery time (MTTR) and total downtime — since a flat Score can hide a recovery-time regression.

![AIWatch Score 3-month trend](../assets/2026-06/trend-chart.svg)

### Notable Movers

*The 5 services whose **Score, recovery time (MTTR), or total downtime** changed most over the window (ranked by the largest single change, not a fixed threshold). The metric in **bold** is the change that ranked each service here; 🔺 / 🔻 mark whether that headline metric improved or worsened — so a service can show a small Score gain yet land here, and read 🔻, because its downtime regressed.*

- 🔺 **Gemini API** — Score 62 → 67 (+5) · MTTR 117h 13m → 11h 46m (−105h 27m) · **downtime 351h 39m → 35h 17m (−316h 22m)**
- 🔻 **Codex** — Score 86 → 79 (−7) · MTTR 1h 23m → 11h 25m (+10h 2m) · **downtime 9h 38m → 91h 21m (+81h 43m)**
- 🔺 **GitHub Copilot** — Score 69 → 88 (+19) · MTTR 3h 15m → 1h 10m (−2h 5m) · **downtime 84h 32m → 5h 50m (−78h 42m)**
- 🔺 **Together AI** — Score 83 → 81 (−2) · MTTR 42m → 27m (−15m) · **downtime 97h 49m → 38h 9m (−59h 40m)**
- 🔻 **Mistral API** — Score 76 → 69 (−7) · MTTR 8m → 1h 24m (+1h 16m) · **downtime 12h 15m → 54h 55m (+42h 40m)**

---


## AIWatch Score — June 2026 Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Combines four components — Uptime (40%), Incident affected days (25%), Recovery speed (15%), Responsiveness (20%, derived from p75 probe RTT). The per-service p75 RTT figures feeding Responsiveness are listed in the [API Response Time — Monthly p75](#api-response-time--monthly-p75) section below; full breakdown of weights, fallbacks, and penalties is in [About This Report](#about-this-report). [How it's calculated →](https://ai-watch.dev/#about-score)

*30 of 38 services ranked. **LangChain (LangSmith), Runway, Luma (Dream Machine), DeepSeek App, Helicone, Langfuse, Black Forest Labs (FLUX), fal.ai are excluded from this ranking** — they were added to AIWatch mid-month, so the partial-month Score rests on insufficient coverage; they rejoin once a full month of data accrues.*

| Rank | Service | Score | Grade | Uptime Source | Why |
|---|---|---|---|---|---|
| 1 | Windsurf | 100 | Excellent | Official | Zero incidents, 100.00% uptime |
| 2 | Modal | 95 | Excellent | Official | 11 incidents, fast recovery (avg 24m) |
| 3= | OpenAI API | 90 | Excellent | Official | 1 incident, 40m |
| 3= | Cohere API | 90 | Excellent | Official | 1 incident, 2h 55m |
| 5 | Cerebras Inference | 89 | Good | Official | 1 incident, 1h 30m |
| 6= | Perplexity | 88 | Good | Estimate | 1 incident, 4h 31m |
| 6= | GitHub Copilot | 88 | Good | Official | 5 incidents, avg 1h 10m |
| 8= | Groq Cloud | 86 | Good | Official | Zero incidents, 100.00% uptime |
| 8= | Junie | 86 | Good | Official | 5 incidents, avg 2h 11m |
| 10 | Fireworks AI | 85 | Good | Official | 20 incidents, fast recovery (avg 6m) |
| 11 | Hugging Face | 84 | Good | Official | 3 incidents, avg 1h 24m |
| 12= | DeepSeek API | 82 | Good | Official | 2 incidents, fast recovery (avg 29m) |
| 12= | ChatGPT | 82 | Good | Official | 14 incidents, avg 1h 55m |
| 14 | Together AI | 81 | Good | Official | 85 incidents, fast recovery (avg 27m) |
| 15= | OpenRouter | 80 | Good | Official | Zero incidents, 100.00% uptime |
| 15= | Cursor | 80 | Good | Official | 10 incidents, avg 1h 12m |
| 17= | Voyage AI | 79 | Good | Official | 1 incident, 14m |
| 17= | Codex | 79 | Good | Official | 8 incidents, avg 11h 25m |
| 19= | AssemblyAI | 76 | Good | Official | 2 incidents, avg 1h 19m |
| 19= | Stability AI | 76 | Good | Official | Zero incidents, 100.00% uptime |
| 21= | xAI (Grok) | 73 | Fair | Estimate | 4 incidents, fast recovery (avg 27m) |
| 21= | Pinecone | 73 | Fair | Official | 5 incidents, avg 3h 50m |
| 23 | claude.ai | 71 | Fair | Official | 42 incidents, avg 1h 20m |
| 24 | Mistral API | 69 | Fair | Estimate | 39 incidents, avg 1h 24m |
| 25 | Claude Code | 68 | Fair | Official | 42 incidents, avg 1h 27m |
| 26= | Claude API | 67 | Fair | Official | 45 incidents, avg 1h 21m |
| 26= | Gemini API | 67 | Fair | Estimate | 3 incidents, avg 11h 46m |
| 28 | ElevenLabs | 63 | Fair | Official | 6 incidents, avg 3h 3m |
| 29 | Replicate | 58 | Fair | Official | 2 incidents, avg 3h 21m |
| 30 | Deepgram | 44 | Degrading | Estimate | 6 incidents, avg 7h 36m |

**Grade scale**: Excellent (90+) · Good (75+) · Fair (55+) · Degrading (40+) · Unstable (<40)

<!-- Generate with: node scripts/generate-charts.js 2026-06/index.md -->
![AIWatch Score Rankings](../assets/2026-06/score-chart.svg)

> **Uptime Source column**: **Official** (read directly from the service's status page) · **Estimate** (no official metric; only the Score input is computed — the % itself is not surfaced) · **Partial (Nd)** (service newly tracked mid-month). Full definitions: [About This Report → Uptime Source](#about-this-report).
> <!-- Cycle-specific notes (e.g. "Codex was added on 22 Apr, mid-month") can be appended after the Partial label. Keep this caption short — full definitions live in the About This Report methodology section to avoid duplication. -->

---

## Official Uptime (Primary Component)

> **Reference table.** Official 30-day uptime metrics from each service's status page (where published). The narrative-driven sections below (Incident Summary / Notable Incidents / Observations) cover what these numbers mean for vendor selection.

*Amazon Bedrock, Azure OpenAI, Deepgram, Gemini, Mistral, Perplexity, and xAI do not publish a rolling-30-day uptime percentage on their status pages — they're excluded from this table for that reason. (xAI's [status page](https://status.x.ai) does expose per-endpoint live success rates measured since their monitoring system's last restart, but those numbers are not directly comparable to the 30-day figures shown above.)*

<table class="uptime-cols">
<thead><tr><th>Service</th><th>Uptime</th></tr></thead>
<tbody>
<tr><td>Cohere API</td><td>100.00%</td></tr>
<tr><td>Groq Cloud</td><td>100.00%</td></tr>
<tr><td>Cerebras Inference</td><td>100.00%</td></tr>
<tr><td>Stability AI</td><td>100.00%</td></tr>
<tr><td>Voyage AI</td><td>100.00%</td></tr>
<tr><td>Junie</td><td>100.00%</td></tr>
<tr><td>Black Forest Labs (FLUX)</td><td>100.00%</td></tr>
<tr><td>fal.ai</td><td>100.00%</td></tr>
<tr><td>OpenAI API</td><td>99.99%</td></tr>
<tr><td>Hugging Face</td><td>99.99%</td></tr>
<tr><td>Luma (Dream Machine)</td><td>99.99%</td></tr>
<tr><td>AssemblyAI</td><td>99.97%</td></tr>
<tr><td>Fireworks AI</td><td>99.96%</td></tr>
<tr><td>Pinecone</td><td>99.96%</td></tr>
<tr><td>Codex</td><td>99.96%</td></tr>
<tr><td>Runway</td><td>99.96%</td></tr>
<tr><td>Langfuse</td><td>99.96%</td></tr>
<tr><td>Windsurf</td><td>99.95%</td></tr>
<tr><td>DeepSeek App</td><td>99.94%</td></tr>
<tr><td>Modal</td><td>99.92%</td></tr>
<tr><td>GitHub Copilot</td><td>99.89%</td></tr>
<tr><td>DeepSeek API</td><td>99.88%</td></tr>
<tr><td>Cursor</td><td>99.84%</td></tr>
<tr><td>ChatGPT</td><td>99.80%</td></tr>
<tr><td>Together AI</td><td>99.70%</td></tr>
<tr><td>Character.AI</td><td>99.58%</td></tr>
<tr><td>Claude API</td><td>99.55%</td></tr>
<tr><td>Claude Code</td><td>99.41%</td></tr>
<tr><td>Replicate</td><td>99.34%</td></tr>
<tr><td>claude.ai</td><td>99.31%</td></tr>
<tr><td>ElevenLabs</td><td>99.18%</td></tr>
<tr><td>LangChain (LangSmith)</td><td>98.48%</td></tr>
<tr><td>Helicone</td><td>97.95%</td></tr>
</tbody>
</table>

---

## API Response Time — Monthly p75

<!-- Anchor below: substitute [month]/[year] with lowercase values (e.g. "april", "2026").
     Jekyll/Kramdown collapses the heading's em-dash (`— `) into a double hyphen in the
     slug — so the final anchor is e.g. "#aiwatch-score--april-2026-reliability-rankings". -->
These p75 figures are the input to the **Responsiveness** component (20% weight) of [AIWatch Score](#aiwatch-score--[month]-[year]-reliability-rankings). Lower is better. The two tables answer different questions: Score Rankings sorts by *which service is safest to rely on* (combining uptime, incidents, recovery, and responsiveness); this table sorts by *which service is fastest at the network layer*.

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 31 probe targets (30 API services incl. twelvelabs + cursor). Non-probe API services (Bedrock, Azure OpenAI, Modal) excluded. -->
<!-- p95 + Spikes are present in probe:daily:{date} (CLAUDE.md KV schema) but not yet
     surfaced by /api/report. vs-Last-Month additionally requires reading the previous
     month's archive:monthly:* and computing deltas. Re-add the columns once the
     report API carries them — file a tracking issue if not already open. -->

| Rank | Service | p75 (ms) |
|---|---|---|
| 1 | Gemini API | 54 |
| 2 | Mistral API | 154 |
| 3 | OpenAI API | 178 |
| 4 | Claude API | 192 |
| 5 | Groq Cloud | 205 |
| 6 | Fireworks AI | 214 |
| 7 | Cohere API | 223 |
| 8 | Together AI | 272 |
| 9 | Cerebras Inference | 358 |
| 10 | Hugging Face | 415 |
| 11 | Perplexity | 430 |
| 12 | Replicate | 474 |
| 13 | xAI (Grok) | 497 |
| 14 | OpenRouter | 506 |
| 15 | ElevenLabs | 514 |
| 16 | DeepSeek API | 595 |
| 17 | Voyage AI | 758 |
| 18 | Stability AI | 765 |
| 19 | AssemblyAI | 901 |
| 20 | LangChain (LangSmith) | 1038 |
| 21 | fal.ai | 1058 |
| 22 | Black Forest Labs (FLUX) | 1134 |
| 23 | Runway | 1376 |
| 24 | Luma (Dream Machine) | 1395 |
| 25 | Langfuse | 1595 |
| 26 | Helicone | 1779 |
| 27 | Deepgram | 2030 |

> **Note**: Probe RTT measures direct API endpoint response time from Cloudflare Workers edge (5-min intervals). Values reflect network round-trip time, not inference latency. Services without probe coverage (Bedrock, Azure OpenAI, Modal) are excluded from rankings.

---

## Detection & RTT Degradation

### Detection Latency

AIWatch independently detects incidents and alerts within **~5 minutes** — the probe/poll cadence, the upper bound on how long an issue can go unnoticed by our monitoring. This is independent, low-latency awareness across all monitored services, not a timing comparison against any provider's status page.

### RTT Degradation Detection

AIWatch's direct RTT probes flagged **102** latency degradations this month, of which **99** were **not reflected on the providers' official status pages** — slowdowns status pages typically don't report, only hard outages.

| Service | RTT Degradations | Not on Status Page |
|---|---|---|
| Mistral API | 41 | 41 |
| Replicate | 25 | 25 |
| Gemini API | 14 | 13 |
| Deepgram | 10 | 8 |
| Cohere API | 3 | 3 |
| Fireworks AI | 3 | 3 |
| Stability AI | 2 | 2 |
| Hugging Face | 1 | 1 |
| Perplexity | 1 | 1 |
| OpenRouter | 1 | 1 |
| Together AI | 1 | 1 |

> **RTT degradation detection** is AIWatch's differentiator: synthetic probes measure real latency degradation that official status pages (which report hard-down, not slowness) often omit entirely.

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
<tr><td>Together AI</td><td>85</td><td>38h 9m (1h 46m)</td><td class="hide-mobile">1h 46m</td><td class="hide-mobile">27m</td></tr>
<tr><td>Claude API</td><td>45</td><td>61h 3m (6h 33m)</td><td class="hide-mobile">6h 33m</td><td class="hide-mobile">1h 21m</td></tr>
<tr><td>claude.ai</td><td>42</td><td>55h 56m (6h 33m)</td><td class="hide-mobile">6h 33m</td><td class="hide-mobile">1h 20m</td></tr>
<tr><td>Claude Code</td><td>42</td><td>61h 8m (6h 33m)</td><td class="hide-mobile">6h 33m</td><td class="hide-mobile">1h 27m</td></tr>
<tr><td>Mistral API</td><td>39</td><td>54h 55m (29h 34m)</td><td class="hide-mobile">29h 34m</td><td class="hide-mobile">1h 24m</td></tr>
<tr><td>Character.AI</td><td>25</td><td>18h 48m (4h 50m)</td><td class="hide-mobile">4h 50m</td><td class="hide-mobile">45m</td></tr>
<tr><td>Fireworks AI</td><td>20</td><td>1h 58m (26m)</td><td class="hide-mobile">26m</td><td class="hide-mobile">6m</td></tr>
<tr><td>ChatGPT</td><td>14</td><td>26h 49m (6h 12m)</td><td class="hide-mobile">6h 12m</td><td class="hide-mobile">1h 55m</td></tr>
<tr><td>Modal</td><td>11</td><td>4h 29m (1h 42m)</td><td class="hide-mobile">1h 42m</td><td class="hide-mobile">24m</td></tr>
<tr><td>Cursor</td><td>10</td><td>12h 2m (2h 26m)</td><td class="hide-mobile">2h 26m</td><td class="hide-mobile">1h 12m</td></tr>
<tr><td>Codex</td><td>8</td><td>91h 21m (72h 3m)</td><td class="hide-mobile">72h 3m</td><td class="hide-mobile">11h 25m</td></tr>
<tr><td>Langfuse</td><td>7</td><td>5h 56m (2h 20m)</td><td class="hide-mobile">2h 20m</td><td class="hide-mobile">51m</td></tr>
<tr><td>ElevenLabs</td><td>6</td><td>18h 17m (7h 24m)</td><td class="hide-mobile">7h 24m</td><td class="hide-mobile">3h 3m</td></tr>
<tr><td>Deepgram</td><td>6</td><td>45h 33m (27h)</td><td class="hide-mobile">27h</td><td class="hide-mobile">7h 36m</td></tr>
<tr><td>Runway</td><td>6</td><td>12h 20m (6h)</td><td class="hide-mobile">6h</td><td class="hide-mobile">2h 3m</td></tr>
<tr><td>Pinecone</td><td>5</td><td>19h 11m (8h 23m)</td><td class="hide-mobile">8h 23m</td><td class="hide-mobile">3h 50m</td></tr>
<tr><td>GitHub Copilot</td><td>5</td><td>5h 50m (1h 57m)</td><td class="hide-mobile">1h 57m</td><td class="hide-mobile">1h 10m</td></tr>
<tr><td>Junie</td><td>5</td><td>10h 56m (8h 4m)</td><td class="hide-mobile">8h 4m</td><td class="hide-mobile">2h 11m</td></tr>
<tr><td>xAI (Grok)</td><td>4</td><td>1h 48m (31m)</td><td class="hide-mobile">31m</td><td class="hide-mobile">27m</td></tr>
<tr><td>Helicone</td><td>4</td><td>23h 4m (18h 34m)</td><td class="hide-mobile">18h 34m</td><td class="hide-mobile">5h 46m</td></tr>
<tr><td>Gemini API</td><td>3</td><td>35h 17m (24h 49m)</td><td class="hide-mobile">24h 49m</td><td class="hide-mobile">11h 46m</td></tr>
<tr><td>Hugging Face</td><td>3</td><td>4h 13m (3h 50m)</td><td class="hide-mobile">3h 50m</td><td class="hide-mobile">1h 24m</td></tr>
<tr><td>LangChain (LangSmith)</td><td>3</td><td>8h 58m (7h 31m)</td><td class="hide-mobile">7h 31m</td><td class="hide-mobile">2h 59m</td></tr>
<tr><td>DeepSeek API</td><td>2</td><td>58m (45m)</td><td class="hide-mobile">45m</td><td class="hide-mobile">29m</td></tr>
<tr><td>AssemblyAI</td><td>2</td><td>2h 38m (1h 27m)</td><td class="hide-mobile">1h 27m</td><td class="hide-mobile">1h 19m</td></tr>
<tr><td>Replicate</td><td>2</td><td>6h 42m (5h 35m)</td><td class="hide-mobile">5h 35m</td><td class="hide-mobile">3h 21m</td></tr>
<tr><td>Luma (Dream Machine)</td><td>2</td><td>7h 54m (7h 30m)</td><td class="hide-mobile">7h 30m</td><td class="hide-mobile">3h 57m</td></tr>
<tr><td>DeepSeek App</td><td>2</td><td>1h 35m (50m)</td><td class="hide-mobile">50m</td><td class="hide-mobile">48m</td></tr>
<tr><td>OpenAI API</td><td>1</td><td>40m (40m)</td><td class="hide-mobile">40m</td><td class="hide-mobile">40m</td></tr>
<tr><td>Amazon Bedrock</td><td>1</td><td>64h 47m (64h 47m)</td><td class="hide-mobile">64h 47m</td><td class="hide-mobile">64h 47m</td></tr>
<tr><td>Cohere API</td><td>1</td><td>2h 55m (2h 55m)</td><td class="hide-mobile">2h 55m</td><td class="hide-mobile">2h 55m</td></tr>
<tr><td>Cerebras Inference</td><td>1</td><td>1h 30m (1h 30m)</td><td class="hide-mobile">1h 30m</td><td class="hide-mobile">1h 30m</td></tr>
<tr><td>Perplexity</td><td>1</td><td>4h 31m (4h 31m)</td><td class="hide-mobile">4h 31m</td><td class="hide-mobile">4h 31m</td></tr>
<tr><td>Voyage AI</td><td>1</td><td>14m (14m)</td><td class="hide-mobile">14m</td><td class="hide-mobile">14m</td></tr>
<tr><td>Black Forest Labs (FLUX)</td><td>1</td><td>1m (1m)</td><td class="hide-mobile">1m</td><td class="hide-mobile">1m</td></tr>
</tbody>
</table>

**Zero incidents (5 services):** Groq Cloud, OpenRouter, Stability AI, Windsurf, fal.ai — confirmed via their status-page incident feeds.

**No incident feed (1 services):** Azure OpenAI — AIWatch has no reliable incident feed for these (RSS / estimate-only), so a blank incident count reflects monitoring coverage, not verified incident-free operation.

**Stale source (1 service):** Character.AI is served from a status page that migrated to a platform AIWatch can't reach server-side, so the feed is frozen at the last reachable fetch. The incident count, uptime, and Score reflect only data up to that cutoff — not the full month — so treat the figures as a floor, not a verified picture.

---

## Notable Incidents

<!-- BEGIN AUTO-DRAFT (Notable Incidents) — review, adapt into the entries below, then DELETE this entire block before merge -->
_Auto-generated retrospective draft (gemma) — review for accuracy, adapt, then delete this block._

### 1. Integrations API Degraded
**Affected**: Mistral API
**Duration**: ongoing

The Integrations API experienced degradation and remained under investigation throughout the reporting period.

### 2. We’ve suspended access to Claude Mythos 5 and Claude Fable 5
**Affected**: Claude API
**Duration**: ongoing

Access to specific Claude model variants was suspended and remains under monitoring.

### 3. Voxtral Mini 3B 2507 — down
**Affected**: Together AI
**Duration**: ongoing

The Voxtral Mini 3B 2507 model was reported down and the service was investigating the cause.

### 4. Web endpoints is down — down
**Affected**: Modal
**Duration**: ongoing

Web endpoints experienced a complete outage and were subject to ongoing investigation.

### 5. Elevated errors across models
**Affected**: claude.ai
**Duration**: ongoing

Users encountered elevated error rates across multiple models, with the situation under monitoring.

### 6. Small Number of Users Have Incorrectly Cancelled Subscription
**Affected**: ChatGPT
**Duration**: ongoing

An issue was identified where a subset of users faced incorrect subscription cancellations.

<!-- END AUTO-DRAFT (Notable Incidents) -->

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

<!-- BEGIN AUTO-DRAFT (Observations) — review, adapt into the bullets below, then DELETE this entire block before merge -->
_Auto-generated retrospective draft (gemma) — review, adapt into prescriptive bullets, then delete this block._

- Treat Deepgram and Helicone as high-risk services due to degrading reliability scores and high average recovery times.
- Limit reliance on Claude API for mission-critical workflows given its fair reliability score and high incident frequency.
- Utilize Fireworks AI for latency-sensitive production tasks due to its superior recovery speed and high reliability score.
- Implement robust error handling for Mistral API integrations to account for frequent service degradation.

<!-- END AUTO-DRAFT (Observations) -->

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

> **Note:** Security alerts captured during the month from OSV.dev (AI SDK package vulnerabilities) and Hacker News (security posts mentioning monitored services). Section omitted for months without detections.

**Total alerts:** 33

**By source**

| Source | Count |
|---|---|
| OSV.dev | 33 |

**By severity**

| Critical | High | Medium | Low |
| --- | --- | --- | --- |
| 2 | 2 | 28 | 1 |

**Most affected services**

| Service | Count |
|---|---|
| LangChain | 26 |
| Hugging Face | 7 |

### Top Findings



#### 1. [Langchain SQL Injection vulnerability](https://nvd.nist.gov/vuln/detail/CVE-2023-32785) · `critical`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-29

#### 2. [LangChain serialization injection vulnerability enables secret extraction in dumps/loads APIs](https://github.com/langchain-ai/langchain/security/advisories/GHSA-c67j-w6g6-q2cm) · `critical`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-29
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-06-29 | critical | 1.2.5 |

</details>

#### 3. [LangSmith SDK: Public prompt pull deserializes untrusted manifests without trust boundary warning](https://github.com/langchain-ai/langsmith-sdk/security/advisories/GHSA-3644-q5cj-c5c7) · `high`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-09
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-05-13 | high | 0.8.0 |

</details>

#### 4. [LangChain vulnerable to unsafe deserialization of attacker-controlled objects through overly broad `load()` allowlists](https://github.com/langchain-ai/langchain/security/advisories/GHSA-pjwx-r37v-7724) · `high`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-03
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-05-09 | high | 1.3.3 |

</details>

#### 5. [Langchain SQL Injection vulnerability](https://nvd.nist.gov/vuln/detail/CVE-2023-32785) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-29

#### 6. [LangChain serialization injection vulnerability enables secret extraction in dumps/loads APIs](https://github.com/langchain-ai/langchain/security/advisories/GHSA-c67j-w6g6-q2cm) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-29
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-06-29 | critical | 1.2.5 |

</details>

#### 7. [LangChain: Path traversal and sandbox escape in LangChain file-search middleware and loaders](https://github.com/langchain-ai/langchain/security/advisories/GHSA-gr75-jv2w-4656) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-16
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-06-16 | medium | 1.3.9 |

</details>

#### 8. [LangChain: Path traversal and sandbox escape in LangChain file-search middleware and loaders](https://github.com/langchain-ai/langchain/security/advisories/GHSA-gr75-jv2w-4656) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-16
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-06-16 | medium | 1.3.9 |

</details>

#### 9. [PYSEC-2025-70: PyPI/langchain-community](https://huntr.com/bounties/8f771040-7f34-420a-b96b-5b93d4a99afc) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-10

#### 10. [PYSEC-2024-45: PyPI/langchain-core](https://github.com/PinkDraconian/PoC-Langchain-RCE/blob/main/README.md) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-06-10

---


## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 43 services are polled every **5 minutes** via Cloudflare Workers. Health check probes measure direct API response times (RTT) at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). Services without probe data use 80→100 score redistribution **plus a 5% penalty** to reflect the missing responsiveness signal. Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
* **Uptime Source:** *Official* = service publishes a rolling 30-day uptime metric AIWatch reads directly. *Estimate* = no official metric; AIWatch substitutes an industry-average assumption (99.5%) or its own poll-derived figure for the Score's Uptime input. *Partial (Nd)* = an official source exists but AIWatch's measurement window is shorter than the full month (e.g. service newly tracked mid-month). The label only describes the Uptime input quality — the Score itself is computed identically across all services.
* **Incident Counting:** Incident counts reflect all affected components per service. Providers differ in reporting granularity — Anthropic reports per-model incidents (Opus/Sonnet/Haiku each counted separately), while others report at the service level.
* **Uptime Metrics:** Uptime percentages reflect official single-component figures provided by the status pages. Services marked with "—" do not provide a publicly accessible uptime metric.
* **Timezone Standard:** All timestamps are recorded in **UTC**.

**Next report**: July 2026

---

- **Live status** — [ai-watch.dev](https://ai-watch.dev)
- **Slack/Discord alerts** — [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
- **Score methodology** — [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
- **All reports** — [ai-watch.dev/reports](https://ai-watch.dev/reports/)

---

- *Have feedback or spotted an error?* [Open an issue](https://github.com/bentleypark/aiwatch/issues/new)
- *Want us to track a service?* [Request here](https://github.com/bentleypark/aiwatch/issues/new?template=service_request.md)
