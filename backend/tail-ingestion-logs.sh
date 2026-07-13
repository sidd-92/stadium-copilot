#!/usr/bin/env bash
# Polls Cloud Logging every 5s and prints only new lines since the last
# check. No gcloud alpha/beta components required (those install a real
# streaming `tail`, but that changes the local gcloud CLI, so this avoids
# it). Ctrl+C to stop.
set -euo pipefail

PROJECT="promptwars-502109"
SERVICE="ingestion-service"
FILTER="resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE}"

last_ts=$(date -u -v-10S +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -d '10 seconds ago' +%Y-%m-%dT%H:%M:%S)

echo "Tailing ${SERVICE} logs (project ${PROJECT})... Ctrl+C to stop."

while true; do
  output=$(gcloud logging read "${FILTER} AND timestamp>\"${last_ts}\"" \
    --project="${PROJECT}" \
    --order=asc \
    --format="value(timestamp,severity,textPayload,httpRequest.status,httpRequest.requestUrl)" \
    --freshness=1d 2>/dev/null || true)

  if [[ -n "${output}" ]]; then
    echo "${output}"
    last_ts=$(date -u +%Y-%m-%dT%H:%M:%S)
  fi

  sleep 5
done
