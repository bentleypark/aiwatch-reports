---
layout: page
title: "March 2026 AI Service Incident Report"
description: "Monthly reliability report for 20 AI services including OpenAI, Anthropic Claude, Gemini, and more. Uptime, incidents, and AIWatch Score rankings."
date: 2026-03-31
---

# March 2026 AI Service Incident Report

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: March 1–31, 2026
> **Published**: April 2026
> **Services monitored**: 20 — 14 API services, 4 coding agents, 2 web apps

This report analyzes AI service reliability, uptime, incidents, and recovery time across 20 major providers including OpenAI, Anthropic (Claude), Google (Gemini), and others — to help developers make informed infrastructure decisions.

March 2026 showed a clear divide: OpenAI and Cohere remained highly stable, while Anthropic experienced frequent multi-component incidents driven by its per-model reporting structure. ElevenLabs recorded the lowest uptime of any monitored service. Coding agents saw mixed results, with Cursor maintaining perfect uptime despite 18 affected days, while GitHub Copilot faced persistent infrastructure instability.

---

## TL;DR

- **Most reliable**: Cohere, DeepSeek (100/100 — zero incidents, perfect uptime)
- **Best balance (stability + ecosystem)**: OpenAI API (86/100, only 1h 30m downtime)
- **Riskiest this month**: ElevenLabs (97.67% uptime, 8 separate incident days, long recovery times)
- **High incident noise**: Anthropic services — counts inflated due to per-model component reporting
- **Watch out**: GitHub Copilot infrastructure instability (Webhooks, Codespaces, Actions)

**Recommendations**
- **Primary**: OpenAI API (lowest total downtime — 1h 30m) or Cohere (zero incidents, perfect uptime)
- **Fallback**: Groq Cloud (100% uptime, fast recovery) or Together AI (~20m avg resolution)
- **Voice/audio**: implement retry + caching if using ElevenLabs (97.67% uptime, 8 incident days)

---

## Key Insight

March 2026 reveals three patterns worth noting:

- **High uptime ≠ low incidents**: Anthropic maintained 99.3%+ uptime yet recorded the most incidents — driven by per-model component reporting, not systemic instability.
- **Zero incidents ≠ reliable signal**: Perplexity and xAI show zero incidents due to insufficient monitoring data, not perfect reliability.
- **Recovery time is the real differentiator**: OpenAI resolved incidents in ~18 minutes on average; Anthropic averaged ~2 hours. For production systems, MTTR matters more than incident count.

---

## AIWatch Score — March 2026 Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Unlike raw uptime %, it incorporates incident frequency (how often things break), recovery time (how fast they fix it), and real downtime impact — making it a more realistic reliability signal for developers. All formulas are publicly documented. [How it's calculated →](https://ai-watch.dev/#about-score)

| Rank | Service | Score | Grade | Confidence | Why |
|---|---|---|---|---|---|
| 1= | Cohere API | 100 | Excellent | High | Zero incidents, perfect uptime |
| 1= | DeepSeek API | 100 | Excellent | High | Zero incidents, perfect uptime |
| 3 | Hugging Face | 96 | Excellent | High | Near-perfect uptime, minimal incidents |
| 4 | Groq Cloud | 93 | Excellent | High | Perfect uptime, 1 minor incident |
| 5 | Together AI | 89 | Excellent | High | Stable uptime, minimal disruption |
| 6 | OpenAI API | 86 | Excellent | High | Only 1h 30m downtime all month |
| 7 | Mistral API | 83 | Good | Medium | 1 affected day (uptime not published) |
| 8 | Windsurf | 82 | Good | High | Good uptime, 14 affected days |
| 9 | Gemini API | 76 | Good | Medium | 3 affected days (uptime not published) |
| 10 | Cursor | 75 | Good | High | Perfect uptime despite 18 affected days |
| 11 | Replicate | 74 | Good | High | Single 5h 21m outage |
| 12 | ChatGPT | 73 | Good | High | Stable API; UI incidents excluded |
| 13 | GitHub Copilot | 66 | Fair | High | Webhooks & Codespaces instability |
| 14 | Claude Code | 65 | Fair | High | Per-model reporting inflates count |
| 15 | Claude API | 62 | Fair | High | Per-model reporting inflates count |
| 16 | claude.ai | 62 | Fair | High | Per-model reporting inflates count |
| 17 | ElevenLabs | 52 | Degrading | High | 8 separate incident days, low uptime |
| — | Perplexity | N/A | — | Low | No uptime data + zero incidents in period |
| — | xAI (Grok) | N/A | — | Low | No uptime data + zero incidents in period |

**Grade scale**: Excellent (85+) · Good (70+) · Fair (55+) · Degrading (40+) · Unstable (<40)

> **Confidence** reflects data completeness: High = full uptime + incident data available; Medium = uptime not published (industry average assumed); Low = insufficient data for scoring.
> Mistral and Gemini use industry-average uptime (99.5%) as baseline — scores are reasonable estimates, not confirmed figures.
> Anthropic services score lower due to per-model component reporting — each model tier counts separately toward affected days.

---

## Incident Summary

> **Note on methodology**: Incident counts and downtime reflect all affected components per service (e.g., Claude API counts Opus, Sonnet, and Haiku separately). Official uptime % is based on a single primary component. These two metrics are not directly comparable.
>
> **A higher incident count does not necessarily indicate lower reliability.** Providers differ in reporting granularity — Anthropic reports per-model incidents (Opus/Sonnet/Haiku each counted separately), while others report at the service level. Direct comparisons should account for this difference.
>
> One OpenAI incident ("High Error Rate in Realtime API") was excluded due to a negative duration value — a known data anomaly from the upstream status feed.
> Groq and Cursor show 100% official uptime despite minor incidents; their primary API components were unaffected.

| Service | Incidents | Total Downtime | Longest Incident | Avg Resolution |
|---|---|---|---|---|
| claude.ai | 33 | 65h 24m | 7h 29m | ~2h 0m |
| Claude Code | 27 | 56h 47m | 7h 29m | ~2h 6m |
| Claude API | 25 | 49h 20m | 7h 29m | ~1h 58m |
| GitHub Copilot | 14 | 22h 29m | 7h 40m | ~1h 36m |
| ChatGPT | 7 | 15h 6m | 4h 59m | ~2h 9m |
| Cursor | 7 | 10h 30m | 4h 3m | ~1h 30m |
| ElevenLabs | 4 | 9h 12m | 4h 26m | ~2h 18m |
| Windsurf | 4 | 8h 10m | 3h 32m | ~2h 3m |
| Replicate | 1 | 5h 21m | 5h 21m | 5h 21m |
| OpenAI API | 5 | 1h 30m | 43m | ~18m |
| Together AI | 5 | 1h 40m | 31m | ~20m |
| Groq Cloud | 1 | 59m | 59m | 59m |
| Mistral API | 5 | 2m | 1m | ~0m |
| Gemini API | 0 | — | — | — |
| Cohere API | 0 | — | — | — |
| DeepSeek API | 0 | — | — | — |
| Perplexity | 0 | — | — | — |
| Hugging Face | 0 | — | — | — |
| xAI (Grok) | 0 | — | — | — |

---

## Official Uptime (Primary Component)

*Gemini, Mistral, Perplexity, and xAI do not publish accessible uptime metrics on their status pages.*

| Service | Uptime |
|---|---|
| Cursor | 100.00% |
| Groq Cloud | 100.00% |
| Cohere API | 100.00% |
| DeepSeek API | 100.00% |
| Hugging Face | 99.99% |
| ChatGPT | 99.99% |
| Windsurf | 99.99% |
| OpenAI API | 99.99% |
| GitHub Copilot | 99.62% |
| Together AI | 99.61% |
| Claude Code | 99.58% |
| Claude API | 99.34% |
| claude.ai | 99.31% |
| Replicate | 99.06% |
| ElevenLabs | 97.67% |

---

## Notable Incidents

### 1. Anthropic — Prolonged Multi-Model Degradation (Mar 1–31)
**Affected**: Claude API, claude.ai, Claude Code
**Pattern**: Recurring 7h+ incidents across Opus, Sonnet, and Haiku model components
**Longest**: 7h 29m

Anthropic's high incident count reflects its granular per-model reporting rather than a single outage. Each model tier (Opus/Sonnet/Haiku) is tracked as a separate component, so a platform-wide degradation registers as multiple simultaneous incidents. The practical impact on any single model was lower than the aggregate numbers suggest.

---

### 2. GitHub Copilot — Infrastructure Instability (14 incidents, 22h 29m)
**Affected**: Copilot Chat, Webhooks, Codespaces, Actions
**Longest**: 7h 40m

Copilot had its most incident-heavy month, with disruptions spanning Webhooks (8h + 6h 30m + 1h 13m), Codespaces (5h 46m + 47m), and Actions (1h 15m + 1h 1m). These were excluded from the primary downtime count as they affect peripheral infrastructure rather than core AI completions, but developers relying on full GitHub integration felt the impact.

---

### 3. ElevenLabs — Lowest Uptime at 97.67% (4 incidents, 9h 12m)
**Affected**: API / Voice generation
**Longest**: 4h 26m

ElevenLabs recorded the lowest official uptime this month. With 4 incidents averaging over 2 hours each, teams building voice-dependent features faced meaningful disruption.

---

### 4. Replicate — Single Long Outage (1 incident, 5h 21m)
**Affected**: Model inference API

A single 5h 21m outage with no other incidents. Worth noting for teams running batch inference workloads.

---

### 5. ChatGPT — File Handling Issues Excluded
**Reported**: 10 incidents, 98h 10m (raw)
**Adjusted**: 7 incidents, 15h 6m (API-relevant only)

Three large incidents (file downloads 47h 5m, file uploads 26h 52m, pinned chats 9h 7m) were excluded as they affect web UI features rather than the Chat Completions API. The adjusted figure better reflects developer-facing reliability.

---

### 6. OpenAI API — Negative Duration Anomaly Excluded
**Reported**: 6 incidents including "High Error Rate in Realtime API"
**Adjusted**: 5 incidents, 1h 30m

One incident returned a negative duration value from the upstream status feed — a data anomaly rather than a real event. Excluding it brings the total to 1h 30m, making OpenAI API one of the most stable services this month.

---

## Choosing the Right Provider

| Use Case | Recommended | Reason |
|---|---|---|
| Production-critical | OpenAI API, Cohere | Lowest downtime, highest stability |
| Low latency / cost | Groq Cloud, Together AI | Fast recovery (~20m avg), stable uptime |
| Coding workflows | Cursor, Windsurf | High uptime despite incident activity |
| General purpose (unverified uptime) | Mistral, Gemini | Good scores, but uptime not publicly disclosed — use with monitoring |
| Voice / audio | ElevenLabs (with fallback) | Only option — implement retry + caching |

---

## Observations

### If you build on Anthropic
- High incident count is mostly a reporting artifact (Opus/Sonnet/Haiku counted separately)
- Monitor per-model components individually (e.g., `claude-sonnet-4-5`)
- Watch: 7h 29m longest single incident — real disruption when it happens

### If you build on GitHub Copilot
- Webhooks disruptions: 8h + 6h 30m + 1h 13m across the month
- Codespaces instability: 5h 46m + 47m
- Avoid tight CI/CD dependency on these features without fallback handling

### If you build on ElevenLabs
- Lowest official uptime at 97.67%
- 8 separate incident days — recurring pattern, not a one-off
- Must implement retry logic and cache generated audio for critical flows

### Generally stable this month
OpenAI API (1h 30m total downtime), Together AI (1h 40m), Groq Cloud (59m) — good candidates for primary or fallback providers.

---

## About This Report

* **Data Sources:** Real-time data is aggregated from official status pages via multiple frameworks, including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, and RSS feeds (Source: [ai-watch.dev](https://ai-watch.dev)).
* **Incident Counting:** Incident counts reflect all affected components per service. Downtime figures specifically exclude non-API issues (e.g., UI bugs, file handling, webhooks) to focus on core model availability.
* **Uptime Metrics:** Uptime percentages reflect official single-component figures provided by the status pages. Services marked with "—" do not provide a publicly accessible uptime metric.
* **Regional Tracking:** For xAI, Gemini, and OpenAI, availability is tracked per-region when incident titles include explicit identifiers. Incidents without specific region tags are classified as global service interruptions affecting all monitored regions.
* **Timezone Standard:** To ensure alignment with upstream status providers and facilitate accurate cross-referencing, all timestamps in this report are recorded in **UTC**.
* **Data Coverage:** AIWatch monitoring began March 20, 2026. Uptime figures use official provider status pages covering the full month of March. Incident data is sourced from each provider's public status feed.

**Next report**: April 2026

---

**→ Live status**: [ai-watch.dev](https://ai-watch.dev)
**→ Slack/Discord alerts**: [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
**→ Score methodology**: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
**→ All reports**: [bentleypark.github.io/aiwatch-reports](https://bentleypark.github.io/aiwatch-reports)

---

*Have feedback or spotted an error? Open an issue at [github.com/bentleypark/aiwatch](https://github.com/bentleypark/aiwatch)*
