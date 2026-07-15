---
layout: page
title: "Resilience Patterns — Building on AIWatch-Monitored Services"
description: "Structural, month-to-month-stable guidance for building reliably on the AI services AIWatch monitors: per-model monitoring, voice-agent isolation, key rotation, retry-timeout tuning, and failover mechanics."
permalink: /resilience/
published: true
---

<!-- MAINTENANCE — curation rules for this page (read before editing; this page is public and must not
     grow unbounded as reports accumulate — the point is a curated SET, never an append-only log):
     1. ADD only a pattern that is BOTH evergreen (would read identically next month — a property of the
        service's architecture, not a one-off event) AND high-value (a real failure mode worth building
        against). A month-specific fact belongs in that report's Observations, not here.
     2. ONE pattern per failure-mode per service — refine the existing bullet, don't append a variant.
        If a new incident restates a pattern already here, it needs NO edit; just link it from Observations.
     3. PRUNE on every edit — when you touch a section, drop any bullet whose architecture no longer holds
        (a service changed its setup / the failure mode is gone). Removal is as important as addition.
     4. CLASSIFY by service category — the primary axis is the AIWatch service category (the allowed set:
        LLM APIs, Voice / transcription, Coding agents, Inference & infra, Observability, Video, Image,
        AI apps; only categories that actually have a pattern appear as headings). A pattern attributed to a
        NAMED service gets an h3 under its category heading (Anthropic, Gemini, Deepgram) — keep that h3 even
        when it's the only service in the category, so its anchor stays stable for report deep-links; a
        category-level pattern not tied to one named service sits directly under the h2 (Coding agents); a
        service-AGNOSTIC pattern lives under "Cross-cutting patterns" at the bottom, stated ONCE — never
        duplicated into each service. Keep the category headings + the TOC below in sync; ~<=4 bullets per
        service subsection — if one outgrows that, the pattern is too granular, consolidate.
     5. STALENESS — bump "Last reviewed" below when you curate; a section untouched for many months is a
        prune candidate, not automatically still true.
     NOT enforced by CI (a discipline like the report AUTHORING SELF-CHECK) — it holds only if you apply it. -->

Structural guidance for building reliably on the services AIWatch monitors. These patterns are properties of each service's architecture, so they hold month to month — the monthly reports' **Observations** point here and add only what's *new* that month. Read a report's Observations for this month's specific failure mode; read this page for how to build against it.

<small>_Last reviewed: 2026-07_</small>

**Jump to:** [LLM APIs](#llm-apis) · [Voice / transcription](#voice--transcription) · [Coding agents](#coding-agents) · [Cross-cutting patterns](#cross-cutting-patterns)

---

## LLM APIs

### Anthropic (Claude API, Claude Code, claude.ai)

- **Monitor the per-model components individually**, not the aggregated incident count across them. Single-model traffic isn't well represented by the combined total, and retry / failover decisions need per-model granularity.
- **The three surfaces share Anthropic infrastructure and can fail together** — you can't fail over from one Anthropic surface to another. For real redundancy, pair Anthropic with a **non-Anthropic** provider, not with itself.

### Gemini

- **Prefer long-lived keys with a rotation cadence ≥ monthly** — newly-created keys have been the affected scope in past incidents.
- **Monitor BOTH gcloud Vertex and AI Studio** — they don't always agree, and direct-API outages often surface on AI Studio first.
- **Gemini incidents are rare but long** — design for graceful degradation (retries + a non-streaming fallback path), not fast recovery.

## Voice / transcription

### Deepgram

- **The Voice Agent carries an upstream-LLM dependency.** The longest Deepgram incidents trace back to that surface, so a single-LLM Voice Agent setup takes the full upstream blast radius — **configure multiple LLM providers for failover**.
- **Isolate the Voice Agent from your core STT/TTS** so an upstream-LLM incident can't take down basic transcription.
- **Real-time transcription is a hot path** — route it behind a **degradation-aware fallback** to a second provider. A latency degradation alone (not only a hard outage) stalls real-time audio.

## Coding agents

- **Failure modes vary by agent** — some flap (frequent short incidents), others take a rare long one. Plan for the **long** case on any agent on a critical path: a manually-swapped backup is too slow across a multi-day outage. **Drive failover from a health check** so an extended outage degrades to a fallback automatically, rather than relying on someone noticing and switching.

---

## Cross-cutting patterns

Patterns that apply across services, not tied to one provider.

### Retry / timeout tuning (general)

- **Set client-side timeouts to cover the *Longest* incident column, not the average**, so the retry budget survives the worst case rather than the mean.
- **Standard exponential backoff with a sub-minute initial retry** absorbs the flap pattern some status pages show (e.g. Together AI, Mistral).
