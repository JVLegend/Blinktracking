#!/usr/bin/env bash
set -euo pipefail

MANIFEST=${MANIFEST:-/Users/iaparamedicos/Documents/Blinktracking_Resultados_Drive/_manifests/raw_videos.txt}
OUTPUT_ROOT=${OUTPUT_ROOT:-/Users/iaparamedicos/Documents/Blinktracking_Resultados_Drive}
TEMP_ROOT=${TEMP_ROOT:-/Users/iaparamedicos/tmp/blinktracking_drive_downloads}
PYTHON_BIN=${PYTHON_BIN:-/Users/iaparamedicos/.venvs/blinktracking311/bin/python}
REMOTE=${REMOTE:-blinkdrive:}
BATCH_SIZE=${BATCH_SIZE:-5}
SLEEP_SECONDS=${SLEEP_SECONDS:-600}
START_AT=${START_AT:-1}

cd /Users/iaparamedicos/Documents/GitHub/Blinktracking
mkdir -p "$OUTPUT_ROOT/_logs" "$TEMP_ROOT"

total=$(wc -l < "$MANIFEST" | tr -d " ")
start="$START_AT"
batch=1

echo "===== run_rclone_batches started $(date) ====="
echo "manifest=$MANIFEST total=$total batch_size=$BATCH_SIZE start_at=$START_AT sleep=$SLEEP_SECONDS"

while [ "$start" -le "$total" ]; do
  echo "===== batch $batch: start-at=$start, limit=$BATCH_SIZE, $(date) ====="
  "$PYTHON_BIN" scripts/process_rclone_manifest.py \
    --manifest "$MANIFEST" \
    --remote "$REMOTE" \
    --temp-root "$TEMP_ROOT" \
    --output-root "$OUTPUT_ROOT" \
    --start-at "$start" \
    --limit "$BATCH_SIZE" \
    --force

  echo "===== batch $batch finished $(date) ====="
  start=$((start + BATCH_SIZE))
  batch=$((batch + 1))

  if [ "$start" -le "$total" ]; then
    echo "Sleeping $SLEEP_SECONDS seconds before next batch..."
    sleep "$SLEEP_SECONDS"
  fi
done

echo "===== run_rclone_batches completed $(date) ====="
