---
layout: page
title: "May 2026 AI Reliability Report"
description: "Monthly reliability report for 33 AI services including OpenAI, Anthropic Claude, Gemini, Amazon Bedrock, Pinecone, and more. Uptime, incidents, and AIWatch Score rankings."
date: 2026-06-02
published: false
---

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: May 1–31, 2026
> **Published**: June 2026
> **Services monitored**: 33 — 24 API services, 6 coding agents, 3 AI apps

## Summary
<!-- BEGIN AUTO-DRAFT — review, then DELETE this entire block before merge -->
_Auto-generated narrative draft — English only; translate for the KO `<details>` block below._

- **Most reliable**: Modal (97/100)
- **Best balance (stability + ecosystem)**: Junie (93/100, only 2h 1m downtime)
- **Riskiest this month**: Replicate (61/100, 14h 53m total downtime)
- **Most incidents**: Mistral API (155 incidents, 48h 58m downtime)

**Recommendations**
- **Primary**: Modal or Junie
- **Fallback**: Junie (30m avg resolution) or GitHub Copilot (1h 31m avg resolution)

**Recovery performance**: Fastest — Fireworks AI (5m avg). Slowest — Gemini API (22h 32m avg).

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

May 2026 showed a clear divide: Modal, Junie, and GitHub Copilot remained highly stable, while Replicate (61/100) experienced the most challenges. 26 out of 33 services recorded at least one incident, with a combined downtime of 611h 4m.

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

![Daily Service Status](../assets/2026-05/uptime-heatmap.svg)

---

## AIWatch Score — May 2026 Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Combines four components — Uptime (40%), Incident affected days (25%), Recovery speed (15%), Responsiveness (20%, derived from p75 probe RTT). The per-service p75 RTT figures feeding Responsiveness are listed in the [API Response Time — Monthly p75](#api-response-time--monthly-p75) section below; full breakdown of weights, fallbacks, and penalties is in [About This Report](#about-this-report). [How it's calculated →](https://ai-watch.dev/#about-score)

| Rank | Service | Score | Grade | Confidence | Why |
|---|---|---|---|---|---|
| 1 | Modal | 97 | Excellent | High | 5 incidents, avg 1h 5m |
| 2 | Junie | 93 | Excellent | High | 4 incidents, avg 30m |
| 3= | GitHub Copilot | 92 | Excellent | High | 6 incidents, avg 1h 31m |
| 3= | Windsurf | 92 | Excellent | High | 5 incidents, avg 57m |
| 5 | Groq Cloud | 91 | Excellent | High | Zero incidents, 100.00% uptime |
| 6= | Amazon Bedrock | 90 | Excellent | High | Zero incidents, 100.00% uptime |
| 6= | Azure OpenAI | 90 | Excellent | High | Zero incidents, 99.91% uptime |
| 8 | Cohere API | 89 | Good | High | Zero incidents, 100.00% uptime |
| 9= | Fireworks AI | 88 | Good | High | 3 incidents, fast recovery (avg 5m) |
| 9= | OpenRouter | 88 | Good | High | Zero incidents, 100.00% uptime |
| 9= | Hugging Face | 88 | Good | High | 1 incident, 10m |
| 9= | Cerebras Inference | 88 | Good | High | 1 incident, 58m |
| 13 | Pinecone | 87 | Good | High | 4 incidents, avg 47m |
| 14 | Voyage AI | 86 | Good | High | Zero incidents, 100.00% uptime |
| 15 | ChatGPT | 85 | Good | High | 11 incidents, avg 4h 38m |
| 16 | Together AI | 84 | Good | High | 133 incidents, avg 43m |
| 17= | DeepSeek API | 82 | Good | High | 3 incidents, fast recovery (avg 18m) |
| 17= | Codex | 82 | Good | High | 7 incidents, avg 7h 48m |
| 19 | OpenAI API | 80 | Good | High | 7 incidents, avg 1h 36m |
| 20 | Mistral API | 78 | Good | High | 155 incidents, fast recovery (avg 19m) |
| 21 | Stability AI | 76 | Good | High | Zero incidents, 100.00% uptime |
| 22= | xAI (Grok) | 75 | Good | High | 2 incidents, fast recovery (avg 24m) |
| 22= | AssemblyAI | 75 | Good | High | 3 incidents, avg 2h 55m |
| 22= | Character.AI | 75 | Good | High | 29 incidents, fast recovery (avg 20m) |
| 25 | Cursor | 71 | Fair | High | 25 incidents, avg 1h 29m |
| 26 | Perplexity | 68 | Fair | High | 1 incident, 4h |
| 27= | ElevenLabs | 65 | Fair | High | 9 incidents, avg 1h 32m |
| 27= | Claude Code | 65 | Fair | High | 35 incidents, avg 1h 36m |
| 29= | Gemini API | 64 | Fair | High | 2 incidents, avg 22h 32m |
| 29= | Deepgram | 64 | Fair | High | 5 incidents, avg 6h 4m |
| 31= | Claude API | 63 | Fair | High | 34 incidents, avg 1h 30m |
| 31= | claude.ai | 63 | Fair | High | 34 incidents, avg 1h 32m |
| 33 | Replicate | 61 | Fair | High | 4 incidents, avg 3h 43m |

**Grade scale**: Excellent (90+) · Good (75+) · Fair (55+) · Degrading (40+) · Unstable (<40)

<!-- Generate with: node scripts/generate-charts.js 2026-05/index.md -->
![AIWatch Score Rankings](../assets/2026-05/score-chart.svg)

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
<tr><td>Amazon Bedrock</td><td>100.00%</td></tr>
<tr><td>Cohere API</td><td>100.00%</td></tr>
<tr><td>Groq Cloud</td><td>100.00%</td></tr>
<tr><td>Fireworks AI</td><td>100.00%</td></tr>
<tr><td>OpenRouter</td><td>100.00%</td></tr>
<tr><td>AssemblyAI</td><td>100.00%</td></tr>
<tr><td>Hugging Face</td><td>100.00%</td></tr>
<tr><td>Stability AI</td><td>100.00%</td></tr>
<tr><td>Voyage AI</td><td>100.00%</td></tr>
<tr><td>Cerebras Inference</td><td>100.00%</td></tr>
<tr><td>Together AI</td><td>99.99%</td></tr>
<tr><td>DeepSeek API</td><td>99.92%</td></tr>
<tr><td>Junie</td><td>99.84%</td></tr>
<tr><td>GitHub Copilot</td><td>99.83%</td></tr>
<tr><td>Windsurf</td><td>99.45%</td></tr>
<tr><td>Modal</td><td>99.40%</td></tr>
<tr><td>Character.AI</td><td>98.71%</td></tr>
<tr><td>OpenAI API</td><td>97.76%</td></tr>
<tr><td>Replicate</td><td>97.48%</td></tr>
<tr><td>ElevenLabs</td><td>97.21%</td></tr>
<tr><td>Pinecone</td><td>96.96%</td></tr>
<tr><td>Claude API</td><td>96.36%</td></tr>
<tr><td>claude.ai</td><td>94.61%</td></tr>
<tr><td>Claude Code</td><td>93.85%</td></tr>
<tr><td>Cursor</td><td>93.46%</td></tr>
<tr><td>Codex</td><td>90.14%</td></tr>
<tr><td>ChatGPT</td><td>72.78%</td></tr>
</tbody>
</table>

---

## API Response Time — Monthly p75

<!-- Anchor below: substitute [month]/[year] with lowercase values (e.g. "april", "2026").
     Jekyll/Kramdown collapses the heading's em-dash (`— `) into a double hyphen in the
     slug — so the final anchor is e.g. "#aiwatch-score--april-2026-reliability-rankings". -->
These p75 figures are the input to the **Responsiveness** component (20% weight) of [AIWatch Score](#aiwatch-score--[month]-[year]-reliability-rankings). Lower is better. The two tables answer different questions: Score Rankings sorts by *which service is safest to rely on* (combining uptime, incidents, recovery, and responsiveness); this table sorts by *which service is fastest at the network layer*.

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 20 probe-covered API services. Non-probe services (Bedrock, Azure OpenAI, Pinecone) excluded. -->
<!-- p95 + Spikes are present in probe:daily:{date} (CLAUDE.md KV schema) but not yet
     surfaced by /api/report. vs-Last-Month additionally requires reading the previous
     month's archive:monthly:* and computing deltas. Re-add the columns once the
     report API carries them — file a tracking issue if not already open. -->

| Rank | Service | p75 (ms) |
|---|---|---|
| 1 | Gemini API | 63 |
| 2 | Claude API | 158 |
| 3 | Mistral API | 196 |
| 4 | OpenAI API | 205 |
| 5 | Groq Cloud | 208 |
| 6 | Cohere API | 215 |
| 7 | Fireworks AI | 216 |
| 8 | Together AI | 282 |
| 9 | Hugging Face | 372 |
| 10 | Cerebras Inference | 389 |
| 11 | Perplexity | 429 |
| 12 | Replicate | 443 |
| 13 | OpenRouter | 482 |
| 14 | xAI (Grok) | 489 |
| 15 | ElevenLabs | 498 |
| 16 | DeepSeek API | 576 |
| 17 | Voyage AI | 697 |
| 18 | Stability AI | 711 |
| 19 | AssemblyAI | 844 |
| 20 | Deepgram | 1999 |

> **Note**: Probe RTT measures direct API endpoint response time from Cloudflare Workers edge (5-min intervals). Values reflect network round-trip time, not inference latency. Services without probe coverage (Bedrock, Azure OpenAI, Pinecone) are excluded from rankings.

---

## Detection & RTT Degradation

<!-- #464 redefinition: AIWatch does NOT claim to detect "before the official status page."
     Diagnostic data showed status-page-based detection is structurally bounded by polling lag
     (always at/after the official publish), and genuine probe-first leads are rare. The two
     honest, verifiable framings are detection latency (MTTD) and RTT degradation detection.
     Do NOT reinstate any "X minutes ahead of the official status page" headline claim. -->

### Detection Latency

AIWatch independently detects incidents and alerts within **~5 minutes** — the probe/poll cadence, the upper bound on how long an issue can go unnoticed by our monitoring. This is independent, low-latency awareness across all monitored services, not a timing comparison against any provider's status page.

### RTT Degradation Detection

<!-- Include this subsection ONLY when archive:monthly:{YYYY-MM}.degradation is non-null
     (aiwatch#511). Omit for months before aiwatch#512 deployed (no probe-degradation:monthly
     accumulator existed — e.g. any month ≤ 2026-05) or with zero degradations.
     Data source: GET /api/report?month=YYYY-MM → degradation.{total, noStatusTotal,
     byService, noStatusByService}. Backed by probe-degradation:monthly:* (60d TTL). -->

AIWatch's direct RTT probes flagged **<!-- N -->** latency degradations this month, of which **<!-- M -->** were **not reflected on the providers' official status pages** — slowdowns status pages typically don't report, only hard outages.

| Service | RTT Degradations | Not on Status Page |
|---|---|---|
| | | |

> **RTT degradation detection** is AIWatch's differentiator: synthetic probes measure real latency degradation that official status pages (which report hard-down, not slowness) often omit entirely.

### Early RTT Detections

<!-- Include this subsection ONLY when archive:monthly:{YYYY-MM}.detectionLead is non-null
     (topExamples has entries). These are the RARE genuine cases where a probe RTT spike was
     flagged before the official update — honest per-event evidence, NOT a headline metric.
     Data source: detectionLead.{count, avgLeadMs, medianLeadMs, maxLeadMs, byService, topExamples},
     backed by detection:lead:monthly:* (60d TTL, aiwatch#369). Omit the whole subsection when
     topExamples is empty (the common case — #464 showed in_window events are rare).
     COLUMN → SOURCE (each row from a detectionLead.topExamples entry {svcId, incId, leadMs, detectedAt}):
       • Incident       = incId
       • Service        = svcId (→ display name)
       • Probe Flagged  = detectedAt (the ISO timestamp, rendered UTC)
       • Official Update= NOT in the payload — compute as detectedAt + leadMs (the official publish
                          is leadMs *after* the probe flagged it). Drop this column if you'd rather
                          not derive it.
       • Earlier By     = leadMs (format as "Nm") -->

| Incident | Service | Probe Flagged (UTC) | Official Update (UTC) | Earlier By |
|---|---|---|---|---|
| | | | | |

<!-- "Average early detection" line: include ONLY when detectionLead.count >= 5, mirroring the
     worker canPresentLeadAverage / MIN_LEAD_SAMPLE_SIZE gate (aiwatch#464). Below 5 samples the
     average is statistically thin — show the per-event rows above but DROP this averaged line so
     no marketing-grade figure rests on a handful of samples. -->
**Average early detection**: <!-- X min --> (across N events) <!-- ONLY when count ≥ 5 -->

> Occasional cases where AIWatch's RTT probe flagged degradation before the official status update. Rare by design — the headline metrics are detection latency and degradation detection above, not a "faster than official" average.

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
<tr><td>Mistral API</td><td>155</td><td>48h 58m (23h 52m)</td><td class="hide-mobile">23h 52m</td><td class="hide-mobile">19m</td></tr>
<tr><td>Together AI</td><td>133</td><td>94h 55m (6h 20m)</td><td class="hide-mobile">6h 20m</td><td class="hide-mobile">43m</td></tr>
<tr><td>Claude Code</td><td>35</td><td>56h 7m (18h 4m)</td><td class="hide-mobile">18h 4m</td><td class="hide-mobile">1h 36m</td></tr>
<tr><td>Claude API</td><td>34</td><td>51h (18h 4m)</td><td class="hide-mobile">18h 4m</td><td class="hide-mobile">1h 30m</td></tr>
<tr><td>claude.ai</td><td>34</td><td>52h 11m (18h 4m)</td><td class="hide-mobile">18h 4m</td><td class="hide-mobile">1h 32m</td></tr>
<tr><td>Character.AI</td><td>29</td><td>9h 40m (1h 55m)</td><td class="hide-mobile">1h 55m</td><td class="hide-mobile">20m</td></tr>
<tr><td>Cursor</td><td>25</td><td>37h 11m (4h 34m)</td><td class="hide-mobile">4h 34m</td><td class="hide-mobile">1h 29m</td></tr>
<tr><td>ChatGPT</td><td>11</td><td>50h 55m (15h 16m)</td><td class="hide-mobile">15h 16m</td><td class="hide-mobile">4h 38m</td></tr>
<tr><td>ElevenLabs</td><td>9</td><td>13h 49m (5h 1m)</td><td class="hide-mobile">5h 1m</td><td class="hide-mobile">1h 32m</td></tr>
<tr><td>OpenAI API</td><td>7</td><td>11h 9m (2h 56m)</td><td class="hide-mobile">2h 56m</td><td class="hide-mobile">1h 36m</td></tr>
<tr><td>Codex</td><td>7</td><td>54h 37m (18h 21m)</td><td class="hide-mobile">18h 21m</td><td class="hide-mobile">7h 48m</td></tr>
<tr><td>GitHub Copilot</td><td>6</td><td>9h 5m (3h 49m)</td><td class="hide-mobile">3h 49m</td><td class="hide-mobile">1h 31m</td></tr>
<tr><td>Deepgram</td><td>5</td><td>30h 20m (24h 20m)</td><td class="hide-mobile">24h 20m</td><td class="hide-mobile">6h 4m</td></tr>
<tr><td>Modal</td><td>5</td><td>5h 25m (2h 28m)</td><td class="hide-mobile">2h 28m</td><td class="hide-mobile">1h 5m</td></tr>
<tr><td>Windsurf</td><td>5</td><td>4h 47m (1h 38m)</td><td class="hide-mobile">1h 38m</td><td class="hide-mobile">57m</td></tr>
<tr><td>Replicate</td><td>4</td><td>14h 53m (6h 57m)</td><td class="hide-mobile">6h 57m</td><td class="hide-mobile">3h 43m</td></tr>
<tr><td>Pinecone</td><td>4</td><td>3h 9m (1h 19m)</td><td class="hide-mobile">1h 19m</td><td class="hide-mobile">47m</td></tr>
<tr><td>Junie</td><td>4</td><td>2h 1m (45m)</td><td class="hide-mobile">45m</td><td class="hide-mobile">30m</td></tr>
<tr><td>Fireworks AI</td><td>3</td><td>15m (9m)</td><td class="hide-mobile">9m</td><td class="hide-mobile">5m</td></tr>
<tr><td>DeepSeek API</td><td>3</td><td>53m (34m)</td><td class="hide-mobile">34m</td><td class="hide-mobile">18m</td></tr>
<tr><td>AssemblyAI</td><td>3</td><td>8h 44m (4h 21m)</td><td class="hide-mobile">4h 21m</td><td class="hide-mobile">2h 55m</td></tr>
<tr><td>Gemini API</td><td>2</td><td>45h 4m (43h 14m)</td><td class="hide-mobile">43h 14m</td><td class="hide-mobile">22h 32m</td></tr>
<tr><td>xAI (Grok)</td><td>2</td><td>48m (47m)</td><td class="hide-mobile">47m</td><td class="hide-mobile">24m</td></tr>
<tr><td>Perplexity</td><td>1</td><td>4h (4h)</td><td class="hide-mobile">4h</td><td class="hide-mobile">4h</td></tr>
<tr><td>Hugging Face</td><td>1</td><td>10m (10m)</td><td class="hide-mobile">10m</td><td class="hide-mobile">10m</td></tr>
<tr><td>Cerebras Inference</td><td>1</td><td>58m (58m)</td><td class="hide-mobile">58m</td><td class="hide-mobile">58m</td></tr>
</tbody>
</table>

**Zero incidents (7 services):** Amazon Bedrock, Azure OpenAI, Cohere API, Groq Cloud, OpenRouter, Stability AI, Voyage AI

---

## Notable Incidents

<!-- BEGIN AUTO-DRAFT (Notable Incidents) — review, adapt into the entries below, then DELETE this entire block before merge -->
_Auto-generated retrospective draft (gemma) — review for accuracy, adapt, then delete this block._

### 1. Issues with streaming Deep Research
**Affected**: Gemini API
**Duration**: 1d 19h

Deep Research streaming functionality experienced significant disruptions over a nearly two-day period.

### 2. Voice Agent third-party provider instability (ChatGPT 4o)
**Affected**: Deepgram
**Duration**: 1 day

Voice Agent capabilities were impacted by instability stemming from the third-party provider ChatGPT 4o.

### 3. Connector document_library Degraded · Integrations API
**Affected**: Mistral API
**Duration**: 23h 52m

The document_library connector within the Integrations API suffered from degraded performance.

### 4. Increase in users hitting Codex rate limits
**Affected**: Codex
**Duration**: 18h 21m

A surge in user activity resulted in widespread rate limiting across the service.

### 5. Connection failures for organizations restricting GitHub access by IP address
**Affected**: Claude API
**Duration**: 18h 4m

Organizations using IP-based GitHub access restrictions experienced connection failures.

### 6. Elevated transcription failures affecting ChatGPT & Codex
**Affected**: ChatGPT & Codex
**Duration**: 15h 16m

Transcription services saw an increase in failure rates, impacting both ChatGPT and Codex users.

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

- Monitor Claude API and Claude Code closely for connectivity issues, as they currently exhibit the lowest reliability scores in the ecosystem.
- Treat Deepgram as a high-risk component for voice-dependent workflows due to its low score and long recovery times.
- Use Replicate as a secondary option only, given its recent capacity constraints and fair reliability rating.
- Leverage GitHub Copilot or Modal for mission-critical automation, as they maintain excellent stability scores.

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
- **Detected:** 2026-06-02
- **Fix Version:** [version]

---

## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 33 services are polled every **5 minutes** via Cloudflare Workers. Health check probes measure direct API response times (RTT) at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). Services without probe data use 80→100 score redistribution **plus a 5% penalty** to reflect the missing responsiveness signal. Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
* **Uptime Source:** *Official* = service publishes a rolling 30-day uptime metric AIWatch reads directly. *Estimate* = no official metric; AIWatch substitutes an industry-average assumption (99.5%) or its own poll-derived figure for the Score's Uptime input. *Partial (Nd)* = an official source exists but AIWatch's measurement window is shorter than the full month (e.g. service newly tracked mid-month). The label only describes the Uptime input quality — the Score itself is computed identically across all services.
* **Incident Counting:** Incident counts reflect all affected components per service. Providers differ in reporting granularity — Anthropic reports per-model incidents (Opus/Sonnet/Haiku each counted separately), while others report at the service level.
* **Uptime Metrics:** Uptime percentages reflect official single-component figures provided by the status pages. Services marked with "—" do not provide a publicly accessible uptime metric.
* **Timezone Standard:** All timestamps are recorded in **UTC**.

**Next report**: June 2026

---

- **Live status** — [ai-watch.dev](https://ai-watch.dev)
- **Slack/Discord alerts** — [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
- **Score methodology** — [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
- **All reports** — [ai-watch.dev/reports](https://ai-watch.dev/reports/)

---

- *Have feedback or spotted an error?* [Open an issue](https://github.com/bentleypark/aiwatch/issues/new)
- *Want us to track a service?* [Request here](https://github.com/bentleypark/aiwatch/issues/new?template=service_request.md)
