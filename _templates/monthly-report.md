---
layout: page
title: "[MONTH] [YEAR] AI Service Incident Report"
description: "Monthly reliability report for 20 AI services including OpenAI, Anthropic Claude, Gemini, and more. Uptime, incidents, and AIWatch Score rankings."
date: [YYYY-MM-DD]
---

# [MONTH] [YEAR] AI Service Incident Report

> **Source**: [ai-watch.dev](https://ai-watch.dev) — Real-time AI service status monitoring
> **Period**: [MONTH] 1–[LAST_DAY], [YEAR]
> **Published**: [PUBLISH_MONTH] [YEAR]
> **Services monitored**: 20 — 14 LLM APIs, 4 coding agents, 2 web apps

This report analyzes AI service reliability, uptime, incidents, and recovery time across 20 major providers including OpenAI, Anthropic (Claude), Google (Gemini), and others — to help developers make informed infrastructure decisions.

<!-- Opening narrative: 2-3 sentences summarizing the month's highlights and patterns -->

---

## TL;DR

- **Most reliable**:
- **Best balance (stability + ecosystem)**:
- **Riskiest this month**:
- **High incident noise**:
- **Watch out**:

**Recommendations**
- **Primary**:
- **Fallback**:
- **Voice/audio**:

---

## Key Insight

[MONTH] [YEAR] reveals three patterns worth noting:

- **Pattern 1**:
- **Pattern 2**:
- **Pattern 3**:

---

## AIWatch Score — [MONTH] [YEAR] Reliability Rankings

**AIWatch Score (0–100)** is designed to answer one question:

> *"Which AI service is safest to rely on in production?"*

Unlike raw uptime %, it incorporates incident frequency (how often things break), recovery time (how fast they fix it), and real downtime impact — making it a more realistic reliability signal for developers. All formulas are publicly documented. [How it's calculated →](https://ai-watch.dev/#about-score)

| Rank | Service | Score | Grade | Confidence | Why |
|---|---|---|---|---|---|
| 1 | | | | | |

**Grade scale**: Excellent (85+) · Good (70+) · Fair (55+) · Degrading (40+) · Unstable (<40)

> **Confidence** reflects data completeness: High = full uptime + incident data available; Medium = uptime not published (industry average assumed); Low = insufficient data for scoring.
> <!-- Additional scoring notes and caveats go here -->

---

## Incident Summary

> **Note on methodology**: Incident counts and downtime reflect all affected components per service (e.g., Claude API counts Opus, Sonnet, and Haiku separately). Official uptime % is based on a single primary component. These two metrics are not directly comparable.
>
> **A higher incident count does not necessarily indicate lower reliability.** Providers differ in reporting granularity — Anthropic reports per-model incidents (Opus/Sonnet/Haiku each counted separately), while others report at the service level. Direct comparisons should account for this difference.
>
> <!-- Additional data notes (excluded incidents, anomalies, etc.) -->

| Service | Incidents | Total Downtime | Longest Incident | Avg Resolution |
|---|---|---|---|---|
| | | | | |

---

## Official Uptime (Primary Component)

*Gemini, Mistral, Perplexity, and xAI do not publish accessible uptime metrics on their status pages.*

| Service | Uptime |
|---|---|
| | |

---

## Notable Incidents

<!-- Top 5-6 notable incidents with raw vs adjusted duration where applicable -->

### 1. [Title]
**Affected**:
**Longest**:

<!-- Description -->

---

## Choosing the Right Provider

| Use Case | Recommended | Reason |
|---|---|---|
| Production-critical | | |
| Low latency / cost | | |
| Coding workflows | | |
| General purpose (unverified uptime) | | |
| Voice / audio | | |

---

## Observations

<!-- Per-service actionable recommendations -->

### If you build on [Service]
-

### Generally stable this month
<!-- List stable services with downtime figures -->

---

## About This Report

Data sourced from [ai-watch.dev](https://ai-watch.dev), which aggregates real-time status from official provider status pages including Atlassian Statuspage, incident.io, Google Cloud Status, Better Stack, and RSS feeds.

- Incident counts reflect all affected components per service
- Downtime figures exclude non-API incidents (UI bugs, file handling, webhooks)
- Uptime % reflects official single-component figures from provider status pages
- Services showing "—" for uptime have no publicly accessible uptime metric

**Next report**: [NEXT_MONTH] [YEAR]

---

**→ Live status**: [ai-watch.dev](https://ai-watch.dev)
**→ Slack/Discord alerts**: [ai-watch.dev/#settings](https://ai-watch.dev/#settings)
**→ Score methodology**: [ai-watch.dev/#about-score](https://ai-watch.dev/#about-score)
**→ All reports**: [bentleypark.github.io/aiwatch-reports](https://bentleypark.github.io/aiwatch-reports)

---

*Have feedback or spotted an error? Open an issue at [github.com/bentleypark/aiwatch](https://github.com/bentleypark/aiwatch)*
