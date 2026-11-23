#!/usr/bin/env bash
# Nightly PostgreSQL backup to Cloudflare R2.
#
# Runs on the VPS host (cron or a Dokploy scheduled task), NOT inside the API image.
# Produces a compressed custom-format dump, encrypts it with age, and uploads it
# to a dedicated, private R2 bucket that the application credentials cannot access.
#
# Required environment (store in /etc/studipod/backup.env, mode 600, owned by root):
#   POSTGRES_CONTAINER      name of the running postgres container
#   POSTGRES_USER, POSTGRES_DB
#   AGE_RECIPIENT           age public key; the private key is kept OFF the server
#   BACKUP_R2_BUCKET        e.g. studipod-prod-backups
#   BACKUP_R2_ENDPOINT      https://<account-id>.r2.cloudflarestorage.com
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY   R2 token scoped to the backup bucket only
#
# Requires on the host: docker, age, aws CLI v2.
# Retention is enforced with an R2 lifecycle rule (see docs/deployment), not here.

set -euo pipefail

: "${POSTGRES_CONTAINER:?}" "${POSTGRES_USER:?}" "${POSTGRES_DB:?}"
: "${AGE_RECIPIENT:?}" "${BACKUP_R2_BUCKET:?}" "${BACKUP_R2_ENDPOINT:?}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
dump="$workdir/${POSTGRES_DB}-${timestamp}.dump.age"

docker exec "$POSTGRES_CONTAINER" \
  pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --compress=9 --no-owner \
  | age --recipient "$AGE_RECIPIENT" --output "$dump"

aws s3 cp "$dump" "s3://${BACKUP_R2_BUCKET}/postgres/daily/$(basename "$dump")" \
  --endpoint-url "$BACKUP_R2_ENDPOINT" --only-show-errors

echo "backup uploaded: postgres/daily/$(basename "$dump")"
