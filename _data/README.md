# Monthly Archive Data

JSON snapshots from AIWatch Worker `/api/report?month=YYYY-MM` endpoint.
Stored alongside KV for long-term git preservation and trend analysis.

Files are named `{YYYY-MM}.json` (e.g., `2026-03.json`).

## Snapshot provenance

Two paths produce these files:

1. **Cron-time snapshot (preferred, future months)**: the AIWatch Worker monthly archive cron runs at 00:00 UTC on the 1st of each month and writes `archive:monthly:{YYYY-MM}` to KV. The report-generation workflow then fetches that archive via `/api/report?month=…` and commits the JSON here. Score and incident data reflect the actual end-of-month rolling window.
2. **Retrospective rebuild**: when an archive is missing (e.g., the period predated the system, or the cron was buggy — see aiwatch#363) it can be regenerated via `POST /api/admin/rebuild-archive`. This path uses the **current** 7-day rolling probe window as a proxy for the rebuild month's score, so the further the rebuild is from the original month, the more the score field drifts from a true period-end snapshot. Uptime / incident / latency fields are computed from preserved daily KV data and are accurate.

`generatedAt` in each file shows when the underlying archive was last written. Files marked with the same `period` but a `generatedAt` significantly after the period close are retrospective rebuilds — interpret the `score` field accordingly.

Known retrospective rebuilds in this repo:
- `2026-03.json` (12-day partial onboarding window; rebuilt 2026-05-03 — score reflects May rolling window, not March)
- `2026-04.json` (rebuilt 2026-05-02 the day after the buggy original cron — score drift is minimal)
