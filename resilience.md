---
layout: page
title: "Resilience Patterns — Building on AIWatch-Monitored Services"
description: "Structural, month-to-month-stable guidance for building reliably on the AI services AIWatch monitors: per-model monitoring, voice-agent isolation, key rotation, retry-timeout tuning, and failover mechanics."
permalink: /resilience/
published: true
---

Structural guidance for building reliably on the services AIWatch monitors. These patterns are properties of each service's architecture, so they hold month to month — the monthly reports' **Observations** point here and add only what's *new* that month. Read a report's Observations for this month's specific failure mode; read this page for how to build against it.

---

## Anthropic (Claude API, Claude Code, claude.ai)

- **Monitor the per-model components individually** (Opus / Sonnet / Haiku / …), not the aggregated incident count across them. Single-model traffic isn't well represented by the combined total, and retry / failover decisions need per-model granularity.
- **The three surfaces share Anthropic infrastructure and can fail together** — you can't fail over from one Anthropic surface to another. For real redundancy, pair Anthropic with a **non-Anthropic** provider, not with itself.

## Voice / transcription (Deepgram)

- **The Voice Agent carries an upstream-LLM dependency.** The longest Deepgram incidents trace back to that surface, so a single-LLM Voice Agent setup takes the full upstream blast radius — **configure multiple LLM providers for failover**.
- **Isolate the Voice Agent from your core STT/TTS** so an upstream-LLM incident can't take down basic transcription.
- **Real-time transcription is a hot path**, and Deepgram is consistently the slowest probed service — route it behind a **degradation-aware fallback** to a second provider. A latency degradation alone (not only a hard outage) stalls real-time audio.

## Gemini

- **Prefer long-lived keys with a rotation cadence ≥ monthly** — newly-created keys have been the affected scope in past incidents.
- **Monitor BOTH gcloud Vertex and AI Studio** — they don't always agree, and direct-API outages often surface on AI Studio first.
- **Gemini incidents are rare but long** — design for graceful degradation (retries + a non-streaming fallback path), not fast recovery.

## Coding agents

- **Failure modes vary by agent** — some flap (frequent short incidents), others take a rare long one. Plan for the **long** case on any agent on a critical path: a manually-swapped backup is too slow across a multi-day outage. **Drive failover from a health check** so an extended outage degrades to a fallback automatically, rather than relying on someone noticing and switching.

## Retry / timeout tuning (general)

- **Set client-side timeouts to cover the *Longest* incident column, not the average**, so the retry budget survives the worst case rather than the mean.
- **Standard exponential backoff with a sub-minute initial retry** absorbs the flap pattern some status pages show (e.g. Together AI, Mistral).

## Services with no official uptime

Some services (Amazon Bedrock, Azure OpenAI, Character.AI, …) publish no official uptime; AIWatch **withholds** their Score rather than invent one. Read their reliability from incidents + recovery, and treat a **withheld** Score as "insufficient signal", not "unreliable". See [How AIWatch Works → Score](https://ai-watch.dev/methodology#score).
