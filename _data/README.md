# Monthly Archive Data

JSON snapshots from AIWatch Worker `/api/report?month=YYYY-MM` endpoint.
Stored alongside KV for long-term git preservation and trend analysis.

Files are named `{YYYY-MM}.json` (e.g., `2026-03.json`).

## Snapshot provenance

Two paths produce these files:

1. **Cron-time snapshot (preferred, future months)**: the AIWatch Worker monthly archive cron runs at 00:00 UTC on the 1st of each month and writes `archive:monthly:{YYYY-MM}` to KV. The report-generation workflow then fetches that archive via `/api/report?month=…` and commits the JSON here. Score and incident data reflect the actual end-of-month rolling window.
2. **Retrospective rebuild**: when an archive is missing (e.g., the period predated the system, or the cron was buggy — see aiwatch#363) it can be regenerated via `POST /api/admin/rebuild-archive`. Two drift sources to be aware of:
   - **Score drift**: the rebuild uses the **current** 7-day rolling probe window as a proxy for the rebuild month's score, so the further the rebuild runs from the original month, the more the score field diverges from a true period-end snapshot.
   - **Roster drift**: the service set in the rebuilt JSON is the *current* monitoring roster, not the period's roster. Services added between the period close and the rebuild date appear with `uptime: null` and `incidents: 0` (no historical data to compute) but still carry a current-window `score`. Treat such rows as not-monitored-in-period when doing trend analysis.

   Uptime, incident, and latency fields are computed from preserved daily KV data and are period-accurate provided the rebuild runs within the relevant key TTL (`history:*` survives via the archive itself, `probe:daily:*` retains 90d, `incidents:monthly:*` retains 60d).

`generatedAt` in each file shows when the underlying archive was last written. Files marked with the same `period` but a `generatedAt` significantly after the period close are retrospective rebuilds — interpret the `score` field accordingly.

Known retrospective rebuilds in this repo:
- `2026-03.json` — 12-day partial onboarding window; rebuilt 2026-05-03. Score reflects May rolling window, not March. Roster drift: `fireworks`, `voyageai`, `modal`, and `codex` were added after March and appear with `uptime: null` / `incidents: 0` — exclude these 4 entries from any March-period analysis.
- `2026-04.json` — rebuilt 2026-05-02, day after the buggy original cron. Score drift minimal. No roster drift (no services added between Apr 30 and May 2).
