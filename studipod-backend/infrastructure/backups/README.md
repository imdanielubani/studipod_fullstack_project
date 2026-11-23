# Backups

| Data            | Method                                                                                                | Frequency        | Retention                      |
| --------------- | ----------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------ |
| PostgreSQL      | `backup-postgres.sh`: `pg_dump` + `age` to R2                                                         | Daily, 02:30 UTC | 14 daily, 8 weekly, 12 monthly |
| Valkey          | Not backed up. Valkey holds caches, queues and presence only, all rebuildable. AOF survives restarts. | n/a              | n/a                            |
| R2 object files | R2 is durable storage. Versioning or a replication job protects against deletion.                     | Continuous       | Per bucket lifecycle rule      |
| VPS             | Hostinger VPS snapshot                                                                                | Weekly           | Provider limit                 |

## Rules

1. **Off-server.** Backups go to a dedicated R2 bucket (for example `studipod-prod-backups`), never only the VPS disk.
2. **Separate credentials.** The R2 token used for backups can write only to the backup bucket. The application token cannot read it.
3. **Encrypted.** Dumps are encrypted with [age](https://age-encryption.org). The private key is stored offline (password manager), not on the VPS.
4. **Retention via lifecycle rules.** Configure R2 lifecycle rules on the `postgres/daily/` prefix, so the script never needs delete permission.
5. **Tested restores.** A restore drill runs monthly into a scratch database. A backup that has never been restored is unverified.

## Scheduling

On the VPS host, as root:

```bash
install -m 700 backup-postgres.sh /usr/local/bin/studipod-backup-postgres
# /etc/cron.d/studipod-backup
30 2 * * * root set -a; . /etc/studipod/backup.env; set +a; /usr/local/bin/studipod-backup-postgres >> /var/log/studipod-backup.log 2>&1
```

## Restore

```bash
aws s3 cp s3://<bucket>/postgres/daily/<file>.dump.age . --endpoint-url "$BACKUP_R2_ENDPOINT"
age --decrypt --identity ~/studipod-backup.key <file>.dump.age > restore.dump
docker exec -i <postgres-container> pg_restore --username=studipod --dbname=<target_db> --clean --if-exists --no-owner < restore.dump
```

Point-in-time recovery (WAL archiving with pgBackRest or WAL-G) is deferred until data volume or recovery objectives justify it.
