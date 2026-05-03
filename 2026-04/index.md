---
layout: page
title: "April 2026 AI Reliability Report"
description: "Monthly reliability report for 31 AI services including OpenAI, Anthropic Claude, Gemini, Amazon Bedrock, Pinecone, and more. Uptime, incidents, and AIWatch Score rankings."
date: 2026-05-02
published: false
---

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: April 1–30, 2026
> **Published**: May 2026
> **Services monitored**: 31 — 23 API services, 5 coding agents, 3 AI apps

## Summary

- **Most reliable**: Pinecone (100/100 — zero incidents, 99.84% uptime), Groq Cloud (93/100 — zero incidents, 100% uptime)
- **Riskiest this month**: Gemini API (80.15% estimated uptime — Google publishes no official Gemini uptime, so this is AIWatch's poll-based estimate; single 242h API key incident dominated), Deepgram (Score 55, 74h 20m longest, 16h 15m avg resolution)
- **High incident count, fast recovery**: Together AI (139 incidents, avg 42m), Mistral (97 incidents, avg 8m). The two services run their status pages on different platforms (Together AI on BetterStack, Mistral on Instatus). For Together AI specifically, BetterStack's recovery-period mechanism tends to register short state changes as separate down/resolved pairs — AIWatch deduplicates those, and the count above is already after that filtering. Whether the residual reflects platform-reporting style or genuine micro-instability isn't determinable from counts alone. What's observable: fast recovery kept user-facing impact bounded by client-side retry, not extended unavailability
- **Watch out**: Codex was newly added on 22 Apr — only 9 days of data this month, not directly comparable with full-month peers (full caveat under Official Uptime). Anthropic per-model reporting inflated counts (Claude API 40 + claude.ai 37 + Claude Code 31 often share the same root event)

<details markdown="1">
<summary><strong>Summary in Korean</strong></summary>

- **가장 안정적**: Pinecone (100점, 인시던트 0건·업타임 99.84%), Groq Cloud (93점, 인시던트 0건·업타임 100%)
- **이번 달 가장 위험**: Gemini API (추정 업타임 80.15% — Google이 공식 Gemini 업타임을 공개하지 않아 AIWatch의 폴링 기반 추정치이며, 242시간짜리 API 키 장애 하나가 한 달 수치를 끌어내림), Deepgram (점수 55, 최장 74시간 20분·평균 복구 16시간 15분)
- **잦은 장애, 빠른 복구**: Together AI (139건, 평균 42분에 복구), Mistral (97건·평균 8분). 두 서비스는 서로 다른 status page 플랫폼을 사용합니다 — Together AI는 BetterStack, Mistral은 Instatus. 특히 BetterStack은 짧은 상태 변화를 별개 down/resolved 쌍으로 기록하는 경향이 있어 AIWatch가 자체적으로 중복을 제거하고 있고, 위 139건은 이미 그 보정을 거친 수치입니다. 남은 건수가 보고 방식 영향인지 실제 마이크로 장애인지는 건수만으로 단정하기 어렵습니다. 분명한 건 빠른 복구 덕에 사용자 입장에서는 클라이언트 재시도 수준에서 흡수됐다는 점입니다.
- **주의 필요**: Codex는 4월 22일부터 모니터링이 시작돼 이번 달 데이터가 9일치뿐 — 한 달 전체 수치와 직접 비교하기 어렵습니다(자세한 caveat은 Official Uptime 섹션 참고). Anthropic은 Opus·Sonnet·Haiku를 별도 컴포넌트로 집계해 같은 사건 하나가 Claude API 40건, claude.ai 37건, Claude Code 31건처럼 여러 번 잡힙니다.

</details>

## Recommendations

| Use Case | Recommended | Why |
|---|---|---|
| **Production-critical** | Cohere API (LLM), Pinecone (vector DB) | Cohere 99.85% uptime / Score 85 / 3 incidents avg 36m — the strongest April reliability among general-LLM APIs. Pinecone 99.84% / Score 100 / zero incidents — solid choice for the vector DB / RAG layer that production AI apps often depend on alongside their LLM. |
| **Low latency / cost** | Groq Cloud, Fireworks AI | Groq 100% uptime / zero incidents; Fireworks 99.40% uptime / 7m avg recovery; p75 RTT 213ms / 210ms |
| **Coding workflows** | Cursor, Windsurf | 99.76% / 99.84% full-month uptime. Codex on 9-day partial data this month (see Official Uptime note) — revisit with May |
| **Voice / audio** | AssemblyAI (with fallback) | 22m avg recovery; ElevenLabs (19h 30m longest) and Deepgram (74h 20m longest) had multi-hour outages |
| **General purpose** | OpenAI API, OpenRouter | OpenAI 97.44% uptime / Score 84 — the only major-LLM general-purpose API that finished April in the Good tier (Claude API 96.46% / Score 61 Fair, Gemini API estimated 80.15% / Score 62 Fair both struggled). OpenRouter 99.84% uptime / Score 82 routes to many of the same model families, useful as a fallback layer when a single upstream wobbles. |

---

## Key Insight

April 2026 split sharply between services that flapped fast and recovered fast versus services that suffered single multi-day outages — the reliability story this month is about *duration*, not *count*.



- **One incident can reshape a month**: Gemini API recorded only 3 incidents — yet its 80.15% estimated uptime was the second-lowest in the dataset (behind only Deepgram at 57.06%). A single 242-hour issue with newly-created API keys (Apr 17–28) dominated the period, dragging Gemini from a March 2026 Score of 86 (Excellent) down to Fair.
- **Frequent short incidents — interpret with care**: Together AI logged 139 incidents and Mistral 97 — by far the highest counts of the month. Both still finished in the Good tier (Score 83 and 76) because individual incidents averaged 42m and 8m respectively. Mistral's total downtime stayed at 12h 15m (1.7% of the month); Together AI's was 97h 49m (13.6%), driven mostly by short events with one 15h 16m outlier. The two services run their status pages on different platforms — Together AI on BetterStack, Mistral on Instatus — and each platform's incident-emission style affects how short events are counted. For Together AI specifically, BetterStack tends to register quick state changes as separate down/resolved pairs, and AIWatch deduplicates those before counting; the 139 figure is already after that filtering. Whether the residual reflects platform-reporting style or genuine micro-instability isn't determinable from incident counts alone — third-party monitors (IsDown, StatusGator) also report a sustained high-count pattern for Together AI across months, so the cause is unlikely to be AIWatch's interpretation. What's observable: fast recovery kept user-facing impact bounded by client-side retry pressure rather than extended unavailability.
- **Estimate-only services aren't apples-to-apples**: Bedrock and Azure OpenAI both show ~100% uptime (100% / 99.99%), but neither publishes accessible uptime metrics. Their AIWatch Score caps at 90 — the formula applies a 10% downward adjustment to the base score before the 80→100 redistribution to reflect the missing observability.

<details markdown="1">
<summary><strong>Key Insight in Korean</strong></summary>

2026년 4월은 짧게 흔들리고 빠르게 복구한 서비스와, 며칠씩 이어지는 단일 장애를 만난 서비스로 뚜렷이 갈렸습니다. 이번 달 신뢰성을 가른 건 인시던트 *건수*가 아니라 *지속 시간*입니다.

- **장애 하나가 한 달을 결정**: Gemini API는 인시던트가 3건뿐이었는데도 추정 업타임 80.15%로 31개 서비스 중 두 번째로 낮은 수치를 기록했습니다(최저는 Deepgram의 57.06%). 4월 17일부터 28일까지 10일간 이어진 'API 키' 장애가 한 달 전체 지표를 끌어내려, Gemini는 3월의 86점(Excellent)에서 Fair 등급으로 내려갔습니다.
- **건수가 많은 짧은 장애 — 해석에 주의**: Together AI는 139건, Mistral은 97건으로 이번 달 최다 인시던트를 기록했습니다. 두 서비스 모두 평균 복구 시간이 각각 42분과 8분이라 Good 등급(83점, 76점)으로 마쳤고, 총 다운타임도 Mistral 12시간 15분(1.7%), Together AI 97시간 49분(13.6%)으로 대부분 짧은 장애였으며 15시간 16분짜리 한 건만 두드러진 이상치였습니다. 두 서비스의 status page 플랫폼은 각각 다릅니다 — Together AI는 BetterStack, Mistral은 Instatus — 플랫폼별 인시던트 발행 방식이 짧은 이벤트 카운트에 영향을 줍니다. 특히 Together AI의 BetterStack은 짧은 상태 변화를 별개 down/resolved 쌍으로 기록하는 경향이 있어 AIWatch가 자체적으로 중복을 제거하고 있고, 위 139건은 이미 그 보정을 거친 수치입니다. 남은 건수가 보고 방식 영향인지 실제 마이크로 장애인지는 건수만으로는 단정할 수 없습니다 — IsDown, StatusGator 같은 외부 모니터의 장기 데이터에서도 Together AI의 높은 인시던트 패턴이 여러 달 지속된다는 점은 확인되므로, 원인이 AIWatch의 해석 방식만은 아닐 가능성이 큽니다. 분명한 건 빠른 복구 덕에 사용자 영향이 클라이언트 재시도 수준에서 흡수됐다는 점입니다.
- **추정치 기반 서비스는 같은 기준으로 비교할 수 없음**: Bedrock과 Azure OpenAI는 거의 100%(각각 100%, 99.99%)로 보이지만, 두 서비스 모두 공개적으로 확인할 수 있는 업타임 지표를 내놓지 않습니다. AIWatch Score는 이 한계를 반영해 기본 점수에 10% 페널티를 매긴 뒤 80→100 구간으로 재분배하기 때문에, 두 서비스가 받을 수 있는 최고 점수는 90점입니다.

</details>

![Daily Service Status](../assets/2026-04/uptime-heatmap.svg)

---

## AIWatch Score — April 2026 Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Unlike raw uptime %, it incorporates incident frequency (how often things break), recovery time (how fast they fix it), and real downtime impact — making it a more realistic reliability signal for developers. All formulas are publicly documented. [How it's calculated →](https://ai-watch.dev/#about-score)

| Rank | Service | Score | Grade | Confidence | Why |
|---|---|---|---|---|---|
| 1 | Pinecone | 100 | Excellent | High | Zero incidents, 99.84% uptime |
| 2 | Modal | 94 | Excellent | High | 8 incidents, avg 4h 7m |
| 3 | Groq Cloud | 93 | Excellent | High | Zero incidents, 100.00% uptime |
| 4= | Amazon Bedrock | 90 | Excellent | Medium | Zero incidents, 100.00% uptime |
| 4= | Azure OpenAI | 90 | Excellent | Medium | Zero incidents, 99.99% uptime |
| 6 | Windsurf | 89 | Good | High | 3 incidents, avg 6h 38m |
| 7= | Cursor | 88 | Good | High | 20 incidents, avg 1h 11m |
| 7= | Fireworks AI | 88 | Good | High | 30 incidents, fast recovery (avg 7m) |
| 9 | Hugging Face | 87 | Good | High | 6 incidents, fast recovery (avg 9m) |
| 10= | Voyage AI | 86 | Good | High | 1 incident, 11m |
| 10= | Codex | 86 | Good | Medium | 7 incidents, avg 1h 23m (newly tracked from 22 Apr; 9-day window) |
| 12 | Cohere API | 85 | Good | High | 3 incidents, avg 36m |
| 13 | OpenAI API | 84 | Good | High | 6 incidents, avg 6h 57m |
| 14 | Together AI | 83 | Good | High | 139 incidents, avg 42m |
| 15= | DeepSeek API | 82 | Good | High | 1 incident, 1h 4m |
| 15= | OpenRouter | 82 | Good | High | 2 incidents, avg 1h 5m |
| 15= | AssemblyAI | 82 | Good | High | 3 incidents, fast recovery (avg 22m) |
| 18= | xAI (Grok) | 77 | Good | Medium | Zero incidents, 100.00% uptime |
| 18= | Stability AI | 77 | Good | High | Zero incidents, 100.00% uptime |
| 20= | Mistral API | 76 | Good | Medium | 97 incidents, fast recovery (avg 8m) |
| 20= | Perplexity | 76 | Good | Medium | Zero incidents, 100.00% uptime |
| 22 | Character.AI | 73 | Fair | High | 22 incidents, fast recovery (avg 24m) |
| 23= | Replicate | 71 | Fair | High | 2 incidents, avg 38m |
| 23= | ChatGPT | 71 | Fair | High | 15 incidents, avg 2h 28m |
| 25 | GitHub Copilot | 69 | Fair | High | 26 incidents, avg 3h 15m |
| 26 | Claude Code | 66 | Fair | High | 31 incidents, avg 1h 13m |
| 27 | ElevenLabs | 65 | Fair | High | 5 incidents, avg 4h 26m |
| 28 | Gemini API | 62 | Fair | Medium | 3 incidents, avg 117h 13m |
| 29= | Claude API | 61 | Fair | High | 40 incidents, avg 1h |
| 29= | claude.ai | 61 | Fair | High | 37 incidents, avg 1h 6m |
| 31 | Deepgram | 55 | Fair | Medium | 5 incidents, avg 16h 15m |

**Grade scale**: Excellent (90+) · Good (75+) · Fair (55+) · Degrading (40+) · Unstable (<40)

<!-- Generate with: node scripts/generate-charts.js 2026-04/index.md -->
![AIWatch Score Rankings](../assets/2026-04/score-chart.svg)

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
<tr><td>Together AI</td><td>139</td><td>97h 49m (15h 16m)</td><td class="hide-mobile">15h 16m</td><td class="hide-mobile">42m</td></tr>
<tr><td>Mistral API</td><td>97</td><td>12h 15m (1h 14m)</td><td class="hide-mobile">1h 14m</td><td class="hide-mobile">8m</td></tr>
<tr><td>Claude API</td><td>40</td><td>39h 40m (5h 57m)</td><td class="hide-mobile">5h 57m</td><td class="hide-mobile">1h</td></tr>
<tr><td>claude.ai</td><td>37</td><td>40h 40m (5h 57m)</td><td class="hide-mobile">5h 57m</td><td class="hide-mobile">1h 6m</td></tr>
<tr><td>Claude Code</td><td>31</td><td>37h 56m (5h 57m)</td><td class="hide-mobile">5h 57m</td><td class="hide-mobile">1h 13m</td></tr>
<tr><td>Fireworks AI</td><td>30</td><td>3h 19m (17m)</td><td class="hide-mobile">17m</td><td class="hide-mobile">7m</td></tr>
<tr><td>GitHub Copilot</td><td>26</td><td>84h 32m (15h 37m)</td><td class="hide-mobile">15h 37m</td><td class="hide-mobile">3h 15m</td></tr>
<tr><td>Character.AI</td><td>22</td><td>8h 47m (4h 10m)</td><td class="hide-mobile">4h 10m</td><td class="hide-mobile">24m</td></tr>
<tr><td>Cursor</td><td>20</td><td>23h 39m (6h 23m)</td><td class="hide-mobile">6h 23m</td><td class="hide-mobile">1h 11m</td></tr>
<tr><td>ChatGPT</td><td>15</td><td>36h 59m (12h 20m)</td><td class="hide-mobile">12h 20m</td><td class="hide-mobile">2h 28m</td></tr>
<tr><td>Modal</td><td>8</td><td>32h 53m (23h 2m)</td><td class="hide-mobile">23h 2m</td><td class="hide-mobile">4h 7m</td></tr>
<tr><td>Codex <em>(9-day window)</em></td><td>7</td><td>9h 38m (4h 13m)</td><td class="hide-mobile">4h 13m</td><td class="hide-mobile">1h 23m</td></tr>
<tr><td>OpenAI API</td><td>6</td><td>41h 42m (36h 2m)</td><td class="hide-mobile">36h 2m</td><td class="hide-mobile">6h 57m</td></tr>
<tr><td>Hugging Face</td><td>6</td><td>53m (15m)</td><td class="hide-mobile">15m</td><td class="hide-mobile">9m</td></tr>
<tr><td>ElevenLabs</td><td>5</td><td>22h 10m (19h 30m)</td><td class="hide-mobile">19h 30m</td><td class="hide-mobile">4h 26m</td></tr>
<tr><td>Deepgram</td><td>5</td><td>81h 14m (74h 20m)</td><td class="hide-mobile">74h 20m</td><td class="hide-mobile">16h 15m</td></tr>
<tr><td>Gemini API</td><td>3</td><td>351h 39m (242h)</td><td class="hide-mobile">242h</td><td class="hide-mobile">117h 13m</td></tr>
<tr><td>Cohere API</td><td>3</td><td>1h 47m (1h 25m)</td><td class="hide-mobile">1h 25m</td><td class="hide-mobile">36m</td></tr>
<tr><td>AssemblyAI</td><td>3</td><td>1h 5m (48m)</td><td class="hide-mobile">48m</td><td class="hide-mobile">22m</td></tr>
<tr><td>Windsurf</td><td>3</td><td>19h 53m (14h 47m)</td><td class="hide-mobile">14h 47m</td><td class="hide-mobile">6h 38m</td></tr>
<tr><td>OpenRouter</td><td>2</td><td>2h 10m (1h 5m)</td><td class="hide-mobile">1h 5m</td><td class="hide-mobile">1h 5m</td></tr>
<tr><td>Replicate</td><td>2</td><td>1h 15m (48m)</td><td class="hide-mobile">48m</td><td class="hide-mobile">38m</td></tr>
<tr><td>DeepSeek API</td><td>1</td><td>1h 4m (1h 4m)</td><td class="hide-mobile">1h 4m</td><td class="hide-mobile">1h 4m</td></tr>
<tr><td>Voyage AI</td><td>1</td><td>11m (11m)</td><td class="hide-mobile">11m</td><td class="hide-mobile">11m</td></tr>
</tbody>
</table>

**Zero incidents (7 services):** Amazon Bedrock, Azure OpenAI, Groq Cloud, Perplexity, xAI (Grok), Pinecone, Stability AI

---

## Official Uptime (Primary Component)

*Azure OpenAI, Deepgram, Gemini, Mistral, Perplexity, and xAI do not publish accessible uptime metrics on their status pages.*

*Codex was added to monitoring on 22 Apr 2026; only 9 days of data exist for this month and the resulting aggregate is excluded from the table to avoid misleading comparison with full-month services. OpenAI's official 30-day Codex uptime stayed near 99.98% during the same period.*

<table class="uptime-cols">
<thead><tr><th>Service</th><th>Uptime</th></tr></thead>
<tbody>
<tr><td>Amazon Bedrock</td><td>100.00%</td></tr>
<tr><td>Groq Cloud</td><td>100.00%</td></tr>
<tr><td>Stability AI</td><td>100.00%</td></tr>
<tr><td>Hugging Face</td><td>99.97%</td></tr>
<tr><td>Modal</td><td>99.95%</td></tr>
<tr><td>Cohere API</td><td>99.85%</td></tr>
<tr><td>OpenRouter</td><td>99.84%</td></tr>
<tr><td>Pinecone</td><td>99.84%</td></tr>
<tr><td>Windsurf</td><td>99.84%</td></tr>
<tr><td>AssemblyAI</td><td>99.77%</td></tr>
<tr><td>Voyage AI</td><td>99.77%</td></tr>
<tr><td>Replicate</td><td>99.76%</td></tr>
<tr><td>Cursor</td><td>99.76%</td></tr>
<tr><td>GitHub Copilot</td><td>99.73%</td></tr>
<tr><td>DeepSeek API</td><td>99.54%</td></tr>
<tr><td>Fireworks AI</td><td>99.40%</td></tr>
<tr><td>Character.AI</td><td>98.86%</td></tr>
<tr><td>OpenAI API</td><td>97.44%</td></tr>
<tr><td>ElevenLabs</td><td>97.27%</td></tr>
<tr><td>Claude Code</td><td>96.85%</td></tr>
<tr><td>Claude API</td><td>96.46%</td></tr>
<tr><td>Together AI</td><td>96.22%</td></tr>
<tr><td>claude.ai</td><td>95.66%</td></tr>
<tr><td>ChatGPT</td><td>91.61%</td></tr>
</tbody>
</table>

---

## API Response Time — Monthly p75

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 17 probe-covered API services. Non-probe services (Bedrock, Azure OpenAI, Pinecone) excluded. -->

| Rank | Service | p75 (ms) | p95 (ms) | Spikes | vs Last Month |
|---|---|---|---|---|---|
| 1 | Gemini API | 140 | — | — | — |
| 2 | Claude API | 173 | — | — | — |
| 3 | Fireworks AI | 210 | — | — | — |
| 4 | Groq Cloud | 213 | — | — | — |
| 5 | OpenAI API | 223 | — | — | — |
| 6= | Mistral API | 234 | — | — | — |
| 6= | Cohere API | 234 | — | — | — |
| 8 | Together AI | 261 | — | — | — |
| 9 | Perplexity | 398 | — | — | — |
| 10 | Hugging Face | 414 | — | — | — |
| 11 | OpenRouter | 442 | — | — | — |
| 12 | Replicate | 480 | — | — | — |
| 13 | xAI (Grok) | 490 | — | — | — |
| 14 | ElevenLabs | 492 | — | — | — |
| 15 | DeepSeek API | 569 | — | — | — |
| 16 | Voyage AI | 699 | — | — | — |
| 17 | Stability AI | 741 | — | — | — |
| 18 | AssemblyAI | 885 | — | — | — |
| 19 | Deepgram | 2193 | — | — | — |

**Spike definition**: RTT > 3× daily median or connection failure (rtt = -1).

> **Note**: Probe RTT measures direct API endpoint response time from Cloudflare Workers edge (5-min intervals). Values reflect network round-trip time, not inference latency. Services without probe coverage (Bedrock, Azure OpenAI, Pinecone) are excluded from rankings.

---

## Detection Lead

<!-- Data source: detected:{svcId} KV timestamps vs official incident start times -->
<!-- Only applicable when probe spike detection fires before status page update -->

*No probe-spike-led detections were logged in April 2026.* Probe-based detection covers only the 19 probed API services (consumer apps, coding agents, and infrastructure-only services like Pinecone are not probed). For April's biggest incidents — Gemini's 10-day key issue and Together AI's 15h flap-cluster outlier — the upstream status page updates beat AIWatch's probe-spike threshold, so the section reads empty rather than indicating a tracking gap.

> **Detection Lead** measures how much earlier AIWatch detected an issue (via probe RTT spike) compared to the official status page report. Only incidents where probe spike detection fired before the status page update are included.

---

## Security Alerts

> **Note:** Security alerts captured during the month from OSV.dev (AI SDK package vulnerabilities) and Hacker News (security posts mentioning monitored services). Section omitted for months without detections.

**Total alerts:** 8

**By source**

| Source | Count |
|---|---|
| OSV.dev | 8 |

**By severity**

| Critical | High | Medium | Low |
| --- | --- | --- | --- |
| 0 | 1 | 7 | 0 |

**Most affected services**

| Service | Count |
|---|---|
| Anthropic (Claude) | 4 |
| Hugging Face | 2 |
| LangChain | 2 |

### Top Findings

#### 1. [LangChain Core has Path Traversal vulnerabilites in legacy `load_prompt` functions](https://github.com/langchain-ai/langchain/security/advisories/GHSA-qh6h-p6c9-ff54) · `high`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-04-24
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-04-24 | high | 1.2.22 |

</details>

#### 2. [Claude SDK for Python has Insecure Default File Permissions in Local Filesystem Memory Tool](https://github.com/anthropics/anthropic-sdk-python/security/advisories/GHSA-q5f5-3gjm-7mfm) · `medium`
- **Source:** OSV.dev
- **Affected:** Anthropic (Claude)
- **Detected:** 2026-04-24
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-04-24 | medium | 0.87.0 |

</details>

#### 3. [Claude SDK for Python: Memory Tool Path Validation Race Condition Allows Sandbox Escape](https://github.com/anthropics/anthropic-sdk-python/security/advisories/GHSA-w828-4qhx-vxx3) · `medium`
- **Source:** OSV.dev
- **Affected:** Anthropic (Claude)
- **Detected:** 2026-04-24
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-04-24 | medium | 0.87.0 |

</details>

#### 4. [LangChain has incomplete f-string validation in prompt templates](https://github.com/langchain-ai/langchain/security/advisories/GHSA-926x-3r5x-gfhw) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-04-24
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-04-24 | medium | 0.3.84 |

</details>

#### 5. [HuggingFace Transformers allows for arbitrary code execution in the `Trainer` class](https://nvd.nist.gov/vuln/detail/CVE-2026-1839) · `medium`
- **Source:** OSV.dev
- **Affected:** Hugging Face
- **Detected:** 2026-04-24

#### 6. [GHSA-q5f5-3gjm-7mfm: PyPI/anthropic](https://osv.dev/vulnerability/GHSA-q5f5-3gjm-7mfm) · `medium`
- **Source:** OSV.dev
- **Affected:** Anthropic (Claude)
- **Detected:** 2026-04-21
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-04-24 | medium | 0.87.0 |

</details>

#### 7. [GHSA-w828-4qhx-vxx3: PyPI/anthropic](https://osv.dev/vulnerability/GHSA-w828-4qhx-vxx3) · `medium`
- **Source:** OSV.dev
- **Affected:** Anthropic (Claude)
- **Detected:** 2026-04-21
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-04-24 | medium | 0.87.0 |

</details>

#### 8. [GHSA-69w3-r845-3855: PyPI/transformers](https://osv.dev/vulnerability/GHSA-69w3-r845-3855) · `medium`
- **Source:** OSV.dev
- **Affected:** Hugging Face
- **Detected:** 2026-04-20
<details markdown="1">
<summary>Timeline</summary>

| Stage | At (UTC) | Severity | Fix Version |
|---|---|---|---|
| detected | 2026-04-24 | medium | 5.0.0rc3 |

</details>

---

## Notable Incidents

### 1. Gemini API — 10-Day API Key Issue (Apr 17–28)
**Affected**: Gemini API (newly-created keys)
**Duration**: 242h 0m

A single status page entry — *"Gemini API is having some issues serving recently created keys"* — remained open for ten days. This was the longest single incident across all 31 monitored services in April and the primary driver of Gemini's 80.15% monthly uptime estimate. (Google does not publish an accessible Gemini uptime metric on either gcloud or aistudio.google.com/status, so this number is computed from AIWatch's 5-minute polls — reflecting the share of polls where AIWatch saw Gemini as operational, not an official Google figure.) New customer onboarding and key-rotation flows would have been the most affected paths; existing keys were not the documented scope. Two further incidents in the same month (65h 17m batch API issue, 44h 22m postpay upgrade disruption) compounded the impact.

This incident also prompted a mid-month change to AIWatch's monitoring setup. The gcloud Vertex feed AIWatch had been polling does not surface direct outages on Google's developer-facing Gemini API surface — exactly the surface affected here — so the issue showed up in our data only as the page-level indicator drifted, days into the event. On Apr 22, AIWatch added [`aistudio.google.com/status`](https://aistudio.google.com/status) as a second monitoring source; incidents from either Google feed are now merged in the dashboard. Future Gemini-API-direct incidents of this shape should appear within minutes rather than days.

---

### 2. Deepgram — 74h Voice Agent Degradation
**Affected**: Voice Agent component
**Duration**: 74h 20m

Deepgram's longest April incident lasted just over three days, mirroring the same pattern as March 2026. Per the prior month's writeup, Deepgram's Voice Agent depends on upstream LLM providers — when one degrades, this surface degrades with it. Core STT/TTS APIs remained available. Multi-LLM fallback at the application layer is the documented mitigation.

---

### 3. Anthropic — Per-Model Reporting Inflated April Counts
**Affected**: Claude API (40), claude.ai (37), Claude Code (31)
**Longest**: 5h 57m (across the bundle)

Anthropic's high incident totals reflect granular per-model reporting (Opus / Sonnet / Haiku tracked as separate components). A single platform event registers as multiple simultaneous incidents across claude.ai, Claude API, and Claude Code. The longest single bundle this month was 5h 57m. The aggregate count overstates the practical impact on any one model.

---

### 4. OpenAI — 36h ChatGPT Disruption (Apr 20)
**Affected**: ChatGPT (15 incidents total, 36h 59m total downtime)
**Longest**: 12h 20m

ChatGPT's longest incident this month was a 12h 20m window during the April 20 cluster. ChatGPT finished at 91.61% uptime — markedly worse than OpenAI API's 97.44% — reflecting that consumer surfaces saw a different reliability profile than the developer API. The OpenAI API itself recorded only 6 incidents but with a 36h 2m longest single duration, giving it a 6h 57m average resolution time.

---

### 5. GitHub Copilot — 26 Incidents, 84h 32m Total Downtime
**Affected**: Copilot Chat, Webhooks, Codespaces, Actions
**Longest**: 15h 37m

Copilot continued its March 2026 pattern of frequent multi-component incidents. CI/CD pipelines and developer workflows that depend on full GitHub integration (not just AI completion) bore the brunt — Webhooks and Codespaces disruptions are the recurring failure mode. Average resolution was 3h 15m.

---

### 6. Together AI — 139 Incidents, 97h 49m Total
**Affected**: Multiple model surfaces
**Longest**: 15h 16m

Together AI's 139 incidents — the highest count of any service — reflect the same flap pattern as Mistral: many short events rather than fewer long ones. Average resolution was 42m. The 15h 16m longest incident is the outlier; most events were sub-hour and fully resolved before they would impact a typical retry-with-backoff client. Score finished at 83 (Good) despite the count.

---

## Observations

### If you build on Gemini
- A single API key issue lasted 10 days — set retry / timeout / circuit-breaker policies that survive multi-day partial degradation
- Newly-created keys were the documented scope; existing keys were less affected — for production, prefer long-lived keys with rotation cadences ≥ monthly
- Two further multi-hour incidents (Batch API 65h, postpay upgrade 44h) hit different surfaces — broad surface-level monitoring is more useful than relying on the overall page indicator
- Google publishes Gemini status across two surfaces: gcloud Vertex (used by enterprise / regional consumers) and [`aistudio.google.com/status`](https://aistudio.google.com/status) (the developer-facing direct-API surface). They do not always agree — direct-API outages, including the April key issue, often show up on the AI Studio surface first. AIWatch added the AI Studio source on 22 Apr, so going forward it polls both. If you're rolling your own monitoring, watch both — one feed alone leaves blind spots.

### If you build on Anthropic
- High incident count (40 + 37 + 31 across Claude API / claude.ai / Claude Code) is mostly a reporting artifact of per-model components
- Practical impact on a single model is closer to the per-incident longest figure (5h 57m) than the aggregated total
- Monitor per-model components individually if your traffic is concentrated on one tier (Opus / Sonnet / Haiku)

### If you build on Codex
- April is Codex's first AIWatch-monitored month (only 9 days of data; full caveat under Official Uptime). The qualitative signal still holds: 7 distinct incidents, 1h 23m average resolution, 4h 13m longest. Score 86 (Good, Medium confidence) reflects fast recovery on a small sample.
- May 2026 will be the first apples-to-apples month for comparing Codex against Cursor / Windsurf. Until then default coding workflows to Cursor or Windsurf; if your team is committed to Codex, plan a re-evaluation once May data lands.

### If you build on Deepgram
- Longest incident pattern (74h+) repeated for the second consecutive month
- Voice Agent degradations consistently trace to upstream LLM dependency, not Deepgram core
- Define multiple LLM providers in your Voice Agent config to fail over

### If you build on Together AI or Mistral
- High incident counts (139 / 97) but fast average recovery (42m / 8m) — reliability cost is mostly retry-pressure, not extended unavailability
- Standard exponential backoff with sub-minute initial retry handles the flap pattern for both
- Watch the *longest* duration column (15h 16m for Together AI, 1h 14m for Mistral) — that's the worst case your client-side timeout policy needs to survive

### Generally stable this month
**Zero incidents (7 services)**: Amazon Bedrock, Azure OpenAI, Groq Cloud, Pinecone, Stability AI, Perplexity, xAI (Grok). Of these, Pinecone (99.84% official uptime) and Groq Cloud (100%) publish real uptime data. Bedrock / Azure OpenAI / Perplexity / xAI do not — interpret their zero-incident status with that caveat.

**Low incident count + fast recovery**: Hugging Face (6 incidents · 9m avg), Modal (8 incidents · 4h 7m avg, but 99.95% uptime), Cohere API (3 incidents · 36m avg). Strong candidates for primary or fallback providers in production setups.

---

## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 31 services are polled every **5 minutes** via Cloudflare Workers. Health check probes measure direct API response times (RTT) at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). Services without probe data use 80→100 score redistribution. Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
* **Confidence Levels:** *High* = official uptime data available; *Medium* = uptime not published (industry average 99.5% assumed) or estimate-based. Confidence reflects uptime data quality. Probe data status (Responsiveness) is shown separately on each service's dashboard.
* **Incident Counting:** Incident counts reflect all affected components per service. Providers differ in reporting granularity — Anthropic reports per-model incidents (Opus/Sonnet/Haiku each counted separately), while others report at the service level.
* **Uptime Metrics:** Uptime percentages reflect official single-component figures provided by the status pages. Services marked with "—" do not provide a publicly accessible uptime metric.
* **Timezone Standard:** All timestamps are recorded in **UTC**.

**Next report**: May 2026

---

- **Live status** — [ai-watch.dev](https://ai-watch.dev)
- **Slack/Discord alerts** — [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
- **Score methodology** — [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
- **All reports** — [ai-watch.dev/reports](https://ai-watch.dev/reports/)

---

- *Have feedback or spotted an error?* [Open an issue](https://github.com/bentleypark/aiwatch/issues/new)
- *Want us to track a service?* [Request here](https://github.com/bentleypark/aiwatch/issues/new?template=service_request.md)
