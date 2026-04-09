#!/usr/bin/env bash
# Fetch monthly archive JSON from AIWatch Worker API and save to _data/
# Usage: ./scripts/fetch-archive.sh 2026-03
#        ./scripts/fetch-archive.sh           # defaults to previous month

set -euo pipefail

API_BASE="https://aiwatch-worker.p2c2kbf.workers.dev"
TMPFILE=$(mktemp /tmp/archive-response.XXXXXX.json)
trap 'rm -f "$TMPFILE"' EXIT

if [ -n "${1:-}" ]; then
  MONTH="$1"
else
  # Default to previous month
  MONTH=$(date -v-1m +%Y-%m 2>/dev/null || date -d "1 month ago" +%Y-%m)
fi

# Validate format
if ! echo "$MONTH" | grep -qE '^[0-9]{4}-[0-9]{2}$'; then
  echo "Error: Invalid month format. Use YYYY-MM (e.g., 2026-03)" >&2
  exit 1
fi

OUTFILE="_data/${MONTH}.json"

echo "Fetching archive for ${MONTH}..."
HTTP_CODE=$(curl -s -o "$TMPFILE" -w "%{http_code}" "${API_BASE}/api/report?month=${MONTH}")

if [ "$HTTP_CODE" = "200" ]; then
  # Pretty-print and save
  python3 -m json.tool "$TMPFILE" > "$OUTFILE"
  echo "Saved to ${OUTFILE} ($(wc -c < "$OUTFILE" | tr -d ' ') bytes)"
elif [ "$HTTP_CODE" = "404" ]; then
  echo "Error: No archive data found for ${MONTH}. Archive is generated on the 1st of the following month." >&2
  exit 1
else
  echo "Error: API returned HTTP ${HTTP_CODE}" >&2
  cat "$TMPFILE" >&2
  exit 1
fi
