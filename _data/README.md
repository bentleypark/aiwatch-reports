# Monthly Archive Data

JSON snapshots from AIWatch Worker `/api/report?month=YYYY-MM` endpoint.
Stored alongside KV for long-term git preservation and trend analysis.

Files are named `{YYYY-MM}.json` (e.g., `2026-03.json`).

Snapshots are auto-committed by `.github/workflows/generate-report.yml`
during monthly draft generation (#15). For one-off backfills or manual
refreshes, run `bash scripts/fetch-archive.sh {YYYY-MM}` and commit the
result.
