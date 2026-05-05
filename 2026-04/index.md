---
layout: page
title: "April 2026 AI Reliability Report"
description: "Monthly reliability report for 31 AI services including OpenAI, Anthropic Claude, Gemini, Amazon Bedrock, Pinecone, and more. Uptime, incidents, and AIWatch Score rankings."
date: 2026-05-04
published: true
---

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: April 1–30, 2026
> **Published**: May 2026
> **Services monitored**: 31 — 23 API services, 5 coding agents, 3 AI apps

## Summary

- **Most reliable**: Pinecone (100/100 — zero incidents, 99.84% uptime), Groq Cloud (93/100 — zero incidents, 100% uptime)
- **Riskiest this month**: Gemini API (single 242h API key incident dominated April; Google publishes no comparable 30-day uptime metric, so the official figure is unavailable — see Notable Incidents #1), Deepgram (Score 55, 74h 20m longest, 16h 15m avg resolution)
- **High incident count, fast recovery**: Together AI (139 incidents, avg 42m — up from 20 in March), Mistral (97 incidents, avg 8m — up from 7 in March). The two services run their status pages on different platforms (Together AI on BetterStack, Mistral on Instatus). The month-over-month jump is partly platform-reporting style — for Together AI, BetterStack's recovery-period mechanism tends to register short state changes as separate down/resolved pairs (AIWatch deduplicates those, and the counts above are already after that filtering); for Mistral, AIWatch's probe-corroboration filter was retuned in late April (#372), surfacing micro-incidents that earlier filtering had absorbed. Whether the residual reflects platform-reporting style or genuine micro-instability isn't determinable from counts alone. What's observable: fast recovery kept user-facing impact bounded by client-side retry, not extended unavailability
- **Watch out**: Codex landed mid-month — partial 9-day window only (see Official Uptime). Anthropic per-model counts (Claude API 40 + claude.ai 37 + Claude Code 31) often track the same root event — see Incident Summary methodology before comparing across providers

<details>
<summary><strong>Summary in Korean</strong></summary>
<ul>
<li><strong>가장 안정적</strong>: Pinecone (100점, 인시던트 0건·업타임 99.84%), Groq Cloud (93점, 인시던트 0건·업타임 100%)</li>
<li><strong>이번 달 가장 위험</strong>: Gemini API (242시간짜리 API 키 장애 하나가 4월을 지배. Google이 비교 가능한 30일 업타임 지표를 공개하지 않아 공식 수치는 미제공 — Notable Incidents #1 참고), Deepgram (점수 55, 최장 74시간 20분·평균 복구 16시간 15분)</li>
<li><strong>잦은 장애, 빠른 복구</strong>: Together AI (139건, 평균 42분에 복구 — 3월 20건 대비 증가), Mistral (97건·평균 8분 — 3월 7건 대비 증가). 두 서비스는 서로 다른 status page 플랫폼을 사용합니다 — Together AI는 BetterStack, Mistral은 Instatus. 월간 건수 증가에는 측정 방식 변경도 일부 반영돼 있습니다. Together AI의 BetterStack은 짧은 상태 변화를 별개 down/resolved 쌍으로 기록하는 경향이 있어 AIWatch가 자체적으로 중복을 제거하고 있고, 위 139건은 이미 그 보정을 거친 수치입니다. Mistral은 4월 말 probe corroboration 필터가 재조정되면서(#372) 기존에 흡수되던 마이크로 장애가 surfacing 되기 시작했습니다. 남은 건수가 보고 방식 차이인지 실제 마이크로 장애인지는 건수만으로 단정하기 어렵습니다. 분명한 건, 빠른 복구 덕분에 사용자에게는 재시도 수준의 영향만 남았다는 점입니다.</li>
<li><strong>주의 필요</strong>: Codex는 월 중간에 추가돼 9일치 partial window 만 존재합니다(Official Uptime 섹션 참고). Anthropic의 Claude API 40건, claude.ai 37건, Claude Code 31건은 Opus·Sonnet·Haiku를 별도로 집계한 결과이며 같은 사건이 여러 번 잡힌 것 — 다른 provider 와 비교하기 전에 Incident Summary methodology 확인 권장.</li>
</ul>
</details>

---

## Recommendations

<table class="recommendations">
<thead>
<tr><th>Use Case</th><th>Recommended</th><th>Why</th></tr>
</thead>
<tbody>
<tr>
  <td><strong>Production-critical</strong></td>
  <td>Cohere API (LLM), Pinecone (vector DB)</td>
  <td>Cohere 99.85% uptime / Score 85 / 3 incidents avg 36m — the strongest April reliability among general-LLM APIs. Pinecone 99.84% / Score 100 / zero incidents — solid choice for the vector DB / RAG layer that production AI apps often depend on alongside their LLM.</td>
</tr>
<tr>
  <td><strong>Low latency / cost</strong></td>
  <td>Groq Cloud, Fireworks AI</td>
  <td>Groq 100% uptime / zero incidents; Fireworks 99.40% uptime / 7m avg recovery; p75 RTT 213ms / 210ms</td>
</tr>
<tr>
  <td><strong>Coding Agents</strong></td>
  <td>Cursor, Windsurf</td>
  <td>Cursor 99.76% / Windsurf 99.84% full-month uptime; Score 88 / 89 (Good).</td>
</tr>
<tr>
  <td><strong>Voice / audio</strong></td>
  <td>AssemblyAI (with fallback)</td>
  <td>AssemblyAI longest 48m vs ElevenLabs 19h 30m vs Deepgram 74h 20m — by far the shortest worst-case in the category. 22m avg recovery; the other two had multi-hour outages.</td>
</tr>
<tr>
  <td><strong>General purpose</strong></td>
  <td>OpenAI API, OpenRouter</td>
  <td>OpenAI 97.44% uptime / Score 84 — the only major-LLM general-purpose API that finished April in the Good tier (Claude API 96.46% / Score 61 Fair, Gemini API Score 62 Fair with no published uptime, both struggled). OpenRouter 99.84% uptime / Score 82 routes to many of the same model families, useful as a fallback layer when a single upstream wobbles.</td>
</tr>
</tbody>
</table>

---

## Key Insight

Patterns from April 2026 reliability data, reading beyond the Summary table's service-by-service view: tooling-shift caveat for month-over-month reads, within-category spread, and the two-month-running concentration risk in the Major-LLM tier.

- **Single-month deltas reflect tooling changes too — not just vendor changes**: April → March score comparisons this period are confounded by AIWatch-side changes that landed in April: (1) Score gained a new **Responsiveness** component (20% weight, sourced from probe p50 + stability CV) — previously-100-scoring services are now bounded by API speed even when uptime + incidents looked perfect, (2) grade thresholds tightened (Excellent 85 → 90, Good 70 → 75) to absorb the upward shift, (3) affected-days weighting moved to Atlassian-style impact (MAJOR=1.0, MINOR=0.3), and (4) Gemini gained [aistudio.google.com/status](https://aistudio.google.com/status) as a second monitoring source on Apr 22, catching incidents the gcloud Vertex feed had missed. Most services moved 10–17 points downward as a result — Cohere 100 → 85, OpenRouter 99 → 82, Hugging Face 100 → 87, DeepSeek 92 → 82 — even those with no real reliability change. Gemini's full 86 → 62 drop layers a real event (the 242h API key issue) on top of those formula shifts. May → April will be more comparable, but a few small May changes (codex/chatgpt uptime aggregate fix, incident grouping rework) still introduce friction; expect a fully apples-to-apples month-over-month from June onward.
- **Within categories, the spread is wide — vendor choice matters more than you'd expect**: April's Voice category split sharply — Deepgram (Score 55, 74h 20m longest), ElevenLabs (65, 19h 30m longest), AssemblyAI (82, 22m avg recovery). Same use case, a 200× spread in worst-case downtime. Coding agents told a similar story — Windsurf (Score 89) and Cursor (88) carried the top tier; GitHub Copilot (69, 84h 32m total) and Claude Code (66, 37h 56m) sat at the bottom; Codex (partial window). For production setups picking a single vendor in either category, the reliability cost of the wrong choice is significant.
- **Major-LLM concentration risk has shown up two months running, not just April**: March had two Major-LLMs at Excellent — OpenAI (88, official uptime) and Gemini (86, no published 30-day uptime) — while Claude API sat at Fair (59) due to per-model component inflation. April widened the gap: Gemini joined Claude in Fair (62 / 61), leaving OpenAI alone in Good at 84. The pattern isn't "two of three slipped this month" — it's "the same single provider has consistently been the most reliable Major-LLM for at least two consecutive months (Excellent 88 in March, Good 84 in April)." Over two months of data, Major-LLM vendors aren't equally reliable as failover candidates — single-month rankings make the gap easy to miss. (For concrete cross-tier and aggregator picks, see Recommendations.)

<details>
<summary><strong>Key Insight in Korean</strong></summary>
<p>Summary 테이블이 보여주는 서비스 단위 결과 너머로 보이는 세 가지 패턴 — 월간 점수 비교 시 주의할 점 (측정 도구 변경 영향), 카테고리 내 격차, 두 달 연속 Major-LLM tier 단일 벤더 집중 리스크.</p>
<ul>
<li><strong>한 달짜리 점수 변화는 벤더 변화뿐 아니라 측정 도구 변화도 반영</strong>: 4월 → 3월 점수 차이는 벤더의 신뢰성 변화만 반영하는 게 아닙니다 — 같은 기간 AIWatch 측정 인프라에도 네 가지 변경이 있었기 때문입니다: (1) 점수 산식에 새 <strong>Responsiveness</strong> 컴포넌트 추가 (20% 가중치, probe p50 + stability CV 기반) — 업타임과 인시던트가 완벽해도 API 속도·안정성에 따라 점수 상한이 결정됨, (2) 등급 기준 강화 (Excellent 85 → 90, Good 70 → 75) — 산식 변경으로 점수가 전체적으로 상향됐기 때문에 등급 기준도 함께 강화, (3) Affected-days 가중치를 Atlassian 방식 (MAJOR=1.0, MINOR=0.3)으로 조정, (4) Gemini에 <a href="https://aistudio.google.com/status">aistudio.google.com/status</a> 멀티 소스 추가 (4월 22일, gcloud Vertex 피드만으로는 놓쳤던 인시던트가 감지되기 시작). 그 결과 대부분 서비스가 10~17점 하락했습니다 — Cohere 100 → 85, OpenRouter 99 → 82, Hugging Face 100 → 87, DeepSeek 92 → 82 — 실제 신뢰성 변화가 없는 서비스도 함께 떨어졌습니다. Gemini의 86 → 62 하락은 이 산식 변경 위에 4월의 실제 사건(242시간 API 키 장애)이 겹친 결과입니다. 5월 → 4월 비교는 조건이 더 가까워지지만, 소규모 5월 변경(codex/chatgpt 업타임 집계 수정, incident grouping 재작업) 영향이 남아 있어 조건이 완전히 동일한 월간 비교는 6월부터 가능합니다.</li>
<li><strong>카테고리 내 격차가 크다 — 벤더 선택이 생각보다 더 중요</strong>: 4월 Voice 카테고리는 양극화가 뚜렷했습니다 — Deepgram (점수 55, 최장 74시간 20분), ElevenLabs (65, 최장 19시간 30분), AssemblyAI (82, 평균 복구 22분). 같은 사용 사례 안에서 최악 다운타임이 세 자릿수 차이. Coding agents도 비슷한 패턴 — Windsurf (점수 89), Cursor (88)가 상위; GitHub Copilot (69, 총 84시간 32분), Claude Code (66, 37시간 56분)가 하위; Codex (partial window). 두 카테고리 어느 쪽이든 단일 벤더로 production을 구성하면 잘못 선택했을 때 신뢰성 비용이 큽니다.</li>
<li><strong>Major-LLM 단일 벤더 집중 리스크는 4월만의 현상이 아니라 두 달 연속 패턴</strong>: 3월에는 Major-LLM tier에서 점수상 Excellent였던 곳이 OpenAI (88, 공식 업타임)와 Gemini (86, 공식 30일 업타임 미공개) 둘이었고, Claude API는 모델별 컴포넌트 부풀림으로 이미 Fair (59)였습니다. 4월에 격차가 더 벌어져 Gemini가 Claude와 함께 Fair (62 / 61)로 떨어지고 OpenAI만 Good에 84점으로 남았습니다. 패턴은 "이번 달 두 곳이 떨어진 것"이 아니라 "같은 한 벤더가 두 달 연속 Major-LLM 중 가장 안정적이었던 것 (3월 Excellent 88, 4월 Good 84)"입니다. 두 달 연속 데이터로 보면 Major-LLM 벤더들 간 failover 후보로서의 신뢰성은 동등하지 않습니다 — 한 달치 순위만 봐서는 이 격차가 잘 드러나지 않습니다. (구체적 cross-tier / aggregator 선택지는 Recommendations 참고.)</li>
</ul>
</details>

![Daily Service Status](../assets/2026-04/uptime-heatmap.svg)

---

## AIWatch Score — April 2026 Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Combines four components — Uptime (40%), Incident affected days (25%), Recovery speed (15%), Responsiveness (20%, derived from p75 probe RTT). The per-service p75 RTT figures feeding Responsiveness are listed in the [API Response Time — Monthly p75](#api-response-time--monthly-p75) section below; full breakdown of weights, fallbacks, and penalties is in [About This Report](#about-this-report). [How it's calculated →](https://ai-watch.dev/#about-score)

*29 of 31 services ranked. **Amazon Bedrock and Azure OpenAI are excluded from this ranking** because neither publishes an accessible uptime metric — their Score would otherwise inherit an industry-average assumption rather than a measured value. Both finished April with zero observed incidents (see the "Zero incidents recorded" note under Incident Summary).*

| Rank | Service | Score | Grade | Uptime Source | Why |
|---|---|---|---|---|---|
| 1 | Pinecone | 100 | Excellent | Official | Zero incidents, 99.84% uptime |
| 2 | Modal | 94 | Excellent | Official | 8 incidents, avg 4h 7m |
| 3 | Groq Cloud | 93 | Excellent | Official | Zero incidents, 100.00% uptime |
| 4 | Windsurf | 89 | Good | Official | 3 incidents, avg 6h 38m |
| 5= | Cursor | 88 | Good | Official | 20 incidents, avg 1h 11m |
| 5= | Fireworks AI | 88 | Good | Official | 30 incidents, fast recovery (avg 7m) |
| 7 | Hugging Face | 87 | Good | Official | 6 incidents, fast recovery (avg 9m) |
| 8= | Voyage AI | 86 | Good | Official | 1 incident, 11m |
| 8= | Codex † | 86 | Good | Partial (9-day) | 7 incidents, avg 1h 23m |
| 10 | Cohere API | 85 | Good | Official | 3 incidents, avg 36m |
| 11 | OpenAI API | 84 | Good | Official | 6 incidents, avg 6h 57m |
| 12 | Together AI | 83 | Good | Official | 139 incidents, avg 42m |
| 13= | DeepSeek API | 82 | Good | Official | 1 incident, 1h 4m |
| 13= | OpenRouter | 82 | Good | Official | 2 incidents, avg 1h 5m |
| 13= | AssemblyAI | 82 | Good | Official | 3 incidents, fast recovery (avg 22m) |
| 16= | xAI (Grok) | 77 | Good | Estimate | Zero incidents (no published 30-day uptime) |
| 16= | Stability AI | 77 | Good | Official | Zero incidents, 100.00% uptime |
| 18= | Mistral API | 76 | Good | Estimate | 97 incidents, fast recovery (avg 8m) |
| 18= | Perplexity | 76 | Good | Estimate | Zero incidents (no published 30-day uptime) |
| 20 | Character.AI | 73 | Fair | Official | 22 incidents, fast recovery (avg 24m) |
| 21= | Replicate | 71 | Fair | Official | 2 incidents, avg 38m |
| 21= | ChatGPT | 71 | Fair | Official | 15 incidents, avg 2h 28m |
| 23 | GitHub Copilot | 69 | Fair | Official | 26 incidents, avg 3h 15m |
| 24 | Claude Code | 66 | Fair | Official | 31 incidents, avg 1h 13m |
| 25 | ElevenLabs | 65 | Fair | Official | 5 incidents, avg 4h 26m |
| 26 | Gemini API | 62 | Fair | Estimate | 3 incidents, avg 117h 13m (dominated by 242h API key issue) |
| 27= | Claude API | 61 | Fair | Official | 40 incidents, avg 1h |
| 27= | claude.ai | 61 | Fair | Official | 37 incidents, avg 1h 6m |
| 29 | Deepgram | 55 | Fair | Estimate | 5 incidents, avg 16h 15m |

**Grade scale**: Excellent (90+) · Good (75+) · Fair (55+) · Degrading (40+) · Unstable (<40)

*† Codex was added to monitoring on 22 Apr 2026; only 9 days of data are available for this month, not directly comparable to full-month peers — see the Official Uptime note below.*

<!-- Generate with: node scripts/generate-charts.js 2026-04/index.md -->
![AIWatch Score Rankings](../assets/2026-04/score-chart.svg)

> **Uptime Source column**: **Official** (read directly from the service's status page) · **Estimate** (no official metric; only the Score input is computed — the % itself is not surfaced) · **Partial (9-day)** (Codex was added on 22 Apr, mid-month). Full definitions: [About This Report → Uptime Source](#about-this-report).

---

## Official Uptime (Primary Component)

> **Reference table.** Official 30-day uptime metrics from each service's status page (where published). The narrative-driven sections below (Incident Summary / Notable Incidents / Observations) cover what these numbers mean for vendor selection.

*Amazon Bedrock, Azure OpenAI, ChatGPT, Deepgram, Gemini, Mistral, Perplexity, and xAI are excluded from this table — Bedrock / Azure OpenAI / Deepgram / Gemini / Mistral / Perplexity / xAI do not publish a rolling-30-day uptime percentage on their status pages; ChatGPT's group-aggregate uptime calculation is being reworked (the 30-day figure on the live AIWatch dashboard is currently null pending that fix). xAI's [status page](https://status.x.ai) does expose per-endpoint live success rates measured since their monitoring system's last restart, but those numbers are not directly comparable to the 30-day figures shown above.*

*Codex was added to monitoring on 22 Apr 2026; only 9 days of data exist for this month and the resulting aggregate is excluded from the table to avoid misleading comparison with full-month services. OpenAI's own [status.openai.com](https://status.openai.com) reported the Codex group at ~99.98% uptime during the same window — for context, not as an AIWatch-measured value.*

<table class="uptime-cols">
<thead><tr><th>Service</th><th>Uptime</th></tr></thead>
<tbody>
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
</tbody>
</table>

---

## API Response Time — Monthly p75

These p75 figures are the input to the **Responsiveness** component (20% weight) of [AIWatch Score](#aiwatch-score--april-2026-reliability-rankings). Lower is better. The two tables answer different questions: Score Rankings sorts by *which service is safest to rely on* (combining uptime, incidents, recovery, and responsiveness); this table sorts by *which service is fastest at the network layer*.

<!-- Data source: curl https://api.ai-watch.dev/api/probe/history?days=30 -->
<!-- 19 probe-covered API services. Non-probe services (Bedrock, Azure OpenAI, Pinecone) excluded. -->

| Rank | Service | p75 (ms) |
|---|---|---|
| 1 | Gemini API | 140 |
| 2 | Claude API | 173 |
| 3 | Fireworks AI | 210 |
| 4 | Groq Cloud | 213 |
| 5 | OpenAI API | 223 |
| 6= | Mistral API | 234 |
| 6= | Cohere API | 234 |
| 8 | Together AI | 261 |
| 9 | Perplexity | 398 |
| 10 | Hugging Face | 414 |
| 11 | OpenRouter | 442 |
| 12 | Replicate | 480 |
| 13 | xAI (Grok) | 490 |
| 14 | ElevenLabs | 492 |
| 15 | DeepSeek API | 569 |
| 16 | Voyage AI | 699 |
| 17 | Stability AI | 741 |
| 18 | AssemblyAI | 885 |
| 19 | Deepgram | 2193 |

> **Note**: Probe RTT measures direct API endpoint response time from Cloudflare Workers edge (5-min intervals). Values reflect network round-trip time, not inference latency. Services without probe coverage (Bedrock, Azure OpenAI, Pinecone) are excluded from rankings. p95 / spike-count / month-over-month columns will return once the underlying archive schema carries those fields.

---

## Incident Summary

> **Note on methodology**: Incident counts reflect all affected components per service. Anthropic in particular counts Opus / Sonnet / Haiku as separate components, so a single root event can appear three times across Claude API / claude.ai / Claude Code; other providers report at the service level. Higher incident count does not on its own mean lower reliability — adjust for granularity before comparing across providers. Official uptime % is based on a single primary component, so it isn't directly comparable to the count column.
>
> **Live dashboard vs report counts**: The numbers below are the unconsolidated monthly totals. The live [ai-watch.dev](https://ai-watch.dev) dashboard groups same-title incidents on the same calendar day into a single cluster row, so what users see day-to-day is a smaller list — e.g., Mistral's 97 monthly entries render as ~6 cluster rows on a recent snapshot. The report intentionally exposes the raw count so monthly comparisons stay consistent across services.
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

**Zero incidents recorded (7 services):** Groq Cloud, Pinecone, Stability AI — confirmed via published 30-day uptime metrics. Amazon Bedrock, Azure OpenAI, Perplexity, xAI (Grok) — AIWatch recorded no incidents, but these services don't expose a comparable rolling 30-day uptime metric, so the zero count reflects AIWatch's monitoring coverage as much as actual incident-free operation.

---

## Notable Incidents

### 1. Gemini API — 10-Day API Key Issue (Apr 17–28)
**Affected**: Gemini API (newly-created keys)
**Duration**: 242h

A single status page entry — *"Gemini API is having some issues serving recently created keys"* — remained open for ten days. This was the longest single incident across all 31 monitored services in April. (Google does not publish a comparable 30-day uptime metric for Gemini on either gcloud or aistudio.google.com/status, so a percentage cannot be cited.) New customer onboarding and key-rotation flows would have been the most affected paths; existing keys were not the documented scope. Two further incidents in the same month (65h 17m batch API issue, 44h 22m postpay upgrade disruption) compounded the impact.

This incident also prompted a mid-month change to AIWatch's monitoring setup. The gcloud Vertex feed AIWatch had been polling does not surface direct outages on Google's developer-facing Gemini API surface — exactly the surface affected here — so the issue showed up in our data only as the page-level indicator drifted, days into the event. On Apr 22, AIWatch added [`aistudio.google.com/status`](https://aistudio.google.com/status) as a second monitoring source; incidents from either Google feed are now merged in the dashboard. Future Gemini-API-direct incidents of this shape should appear within minutes rather than days.

---

### 2. Deepgram — 74h Voice Agent Degradation
**Affected**: Voice Agent component
**Duration**: 74h 20m

Deepgram's longest April incident lasted just over three days, mirroring the same pattern as March 2026. Per the prior month's writeup, Deepgram's Voice Agent depends on upstream LLM providers — when one degrades, this surface degrades with it. Core STT/TTS APIs remained available. Multi-LLM fallback at the application layer is the documented mitigation.

---

### 3. OpenAI — Apr 20 Cluster (ChatGPT 12h 20m + API 36h 2m, separate incidents on independent components)
**Affected**: ChatGPT (15 incidents · 36h 59m total) and OpenAI API (6 incidents · 41h 42m total)
**Longest single events**: ChatGPT 12h 20m · OpenAI API 36h 2m

ChatGPT's longest incident this month was a 12h 20m window during the April 20 cluster. Across the full month ChatGPT recorded 15 incidents totaling 36h 59m (avg 2h 28m), while OpenAI API recorded 6 incidents totaling 41h 42m (avg 6h 57m, longest 36h 2m). Total impact was roughly comparable, but the shape differed — the consumer surface saw frequent shorter outages, the developer API saw fewer but much longer ones. The 36h 2m API-side and 12h 20m ChatGPT-side figures are *separate incidents* on independent components, not two views of the same event — OpenAI's status page tracks ChatGPT and the developer API as distinct surfaces. (ChatGPT's own 30-day uptime % is excluded from the table — see Official Uptime caveat above.)

---

### 4. GitHub Copilot — 26 Incidents, 84h 32m Total Downtime
**Affected**: Copilot Chat, Webhooks, Codespaces, Actions
**Longest**: 15h 37m

Copilot continued its March 2026 pattern of frequent multi-component incidents. CI/CD pipelines and developer workflows that depend on full GitHub integration (not just AI completion) bore the brunt — Webhooks and Codespaces disruptions are the recurring failure mode. Average resolution was 3h 15m.

---

## Observations

Actionable takeaways per service. Descriptive context for each event lives in earlier sections — [Summary](#summary), [Incident Summary](#incident-summary), and [Notable Incidents](#notable-incidents). This section is what to *do* with that data.

- **If you build on Gemini**: prefer long-lived keys with rotation cadences ≥ monthly — newly-created keys were the affected scope of the 242h April incident. Monitor *both* gcloud Vertex and [aistudio.google.com/status](https://aistudio.google.com/status); they don't always agree and direct-API outages often surface on AI Studio first.
- **If you build on Anthropic**: monitor the per-model components (Opus / Sonnet / Haiku) individually rather than the aggregated count across them — single-model traffic isn't well represented by the combined incident total, and your retry / failover decisions need per-model granularity.
- **If you build on Deepgram**: configure multiple LLM providers in the Voice Agent for failover. The longest-incident this month traced back to upstream LLM dependency on that surface, so a single-LLM Voice Agent setup carries the full upstream blast radius.
- **If you build on Together AI or Mistral**: standard exponential backoff with sub-minute initial retry absorbs the flap pattern; set client-side timeouts to cover the *longest* column in Incident Summary so your retry budget survives the worst case rather than the average.
- **Quietly reliable picks within their own role** (not interchangeable — each fits a different use case): Hugging Face (6 incidents · 9m avg) for OSS model hosting; Modal (8 · 4h 7m avg / 99.95% uptime) for serverless GPU compute; Cohere API (3 · 36m avg) as a fallback within the LLM tier. Low incident count combined with fast recovery makes each resilient *within its category* — Hugging Face and Modal are not LLM-API substitutes, and Cohere doesn't replace inference infrastructure.

---

## Security Alerts

> **Note:** Security alerts captured during the month from OSV.dev (AI SDK package vulnerabilities) and Hacker News (security posts mentioning monitored services). Section omitted for months without detections.

**Total alerts:** 5

**By source**

| Source | Count |
|---|---|
| OSV.dev | 5 |

**By severity**

| Critical | High | Medium | Low |
| --- | --- | --- | --- |
| 0 | 1 | 4 | 0 |

**Most affected services**

| Service | Count |
|---|---|
| Anthropic (Claude) | 2 |
| LangChain | 2 |
| Hugging Face | 1 |

### Top Findings

#### 1. [LangChain Core has Path Traversal vulnerabilites in legacy `load_prompt` functions](https://github.com/langchain-ai/langchain/security/advisories/GHSA-qh6h-p6c9-ff54) · `high`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-04-24
- **Fix Version:** 1.2.22

#### 2. [Claude SDK for Python has Insecure Default File Permissions in Local Filesystem Memory Tool](https://github.com/anthropics/anthropic-sdk-python/security/advisories/GHSA-q5f5-3gjm-7mfm) · `medium`
- **Source:** OSV.dev
- **Affected:** Anthropic (Claude)
- **Detected:** 2026-04-24
- **Fix Version:** 0.87.0

#### 3. [Claude SDK for Python: Memory Tool Path Validation Race Condition Allows Sandbox Escape](https://github.com/anthropics/anthropic-sdk-python/security/advisories/GHSA-w828-4qhx-vxx3) · `medium`
- **Source:** OSV.dev
- **Affected:** Anthropic (Claude)
- **Detected:** 2026-04-24
- **Fix Version:** 0.87.0

#### 4. [LangChain has incomplete f-string validation in prompt templates](https://github.com/langchain-ai/langchain/security/advisories/GHSA-926x-3r5x-gfhw) · `medium`
- **Source:** OSV.dev
- **Affected:** LangChain
- **Detected:** 2026-04-24
- **Fix Version:** 0.3.84

#### 5. [HuggingFace Transformers allows for arbitrary code execution in the `Trainer` class](https://nvd.nist.gov/vuln/detail/CVE-2026-1839) · `medium`
- **Source:** OSV.dev (also published as [GHSA-69w3-r845-3855](https://github.com/advisories/GHSA-69w3-r845-3855))
- **Affected:** Hugging Face
- **Detected:** 2026-04-24
- **Fix Version:** 5.0.0rc3

---

## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, Instatus, OnlineOrNot, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Monitoring Frequency:** All 31 services are polled every **5 minutes** via Cloudflare Workers. Health check probes measure direct API response times (RTT) at the same interval.
* **AIWatch Score (0–100):** Calculated from four components — **Uptime** (40%), **Incident affected days** (25%), **Recovery speed** (15%), and **Responsiveness** (20%). Services without probe data use 80→100 score redistribution **plus a 5% penalty** to reflect the missing responsiveness signal. Services with fewer than 7 days of probe samples receive an additional insufficient-data penalty (Codex's 9-day window this period satisfies the 7-day minimum, so no extra penalty applied). Full methodology: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
* **Uptime Source:** *Official* = service publishes a rolling 30-day uptime metric AIWatch reads directly. *Estimate* = no official metric; AIWatch substitutes an industry-average assumption (99.5%) or its own poll-derived figure for the Score's Uptime input. The estimated % itself is not surfaced as a percentage in this report — only its contribution to Score is shown — to stay consistent with the live AIWatch dashboard. *Partial (Nd)* = an official source exists but AIWatch's measurement window is shorter than the full month (e.g. service newly tracked mid-month). The label only describes the Uptime input quality — the Score itself is computed identically across all services.
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
