#!/usr/bin/env sh
# Update the status page on the server: pull, rebuild, migrate, restart, clean up.
# Usage (on the server, in the repo folder):  ./deploy.sh
set -eu

cd "$(dirname "$0")"

echo "==> git pull"
git pull --ff-only

echo "==> docker compose build"
docker compose build status

echo "==> database migrations"
docker compose run --rm --build migrate

echo "==> restart"
docker compose up -d status

echo "==> removing dangling images from previous builds"
docker image prune -f >/dev/null

echo "==> waiting for the container to be healthy"
for _ in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' status 2>/dev/null || echo "unknown")
  if [ "$status" = "healthy" ]; then
    echo "OK: status is healthy ($(git log -1 --format='%h %s'))"
    exit 0
  fi
  sleep 2
done

echo "WARNING: container not healthy after 60s. Logs:"
docker compose logs --tail 40 status
exit 1
