# Existing production database: baseline gate

No production database was connected or modified during this change. The connected Supabase account did not expose an identifiable SWITCHBOARD project. Its actual schema, data, RLS and migration history remain unverified.

`20260918000000_baseline` describes the repository schema at commit `1c05cdb78cfc6a02dceaa660c487e822e39d2169`. It must **never be executed on an existing populated database**. The following sessions/leases, credential grants, and workflow access migrations are additive. Unshared credentials remain usable only by administrator-owned workflows. Review grants for operator-owned workflows before deployment.

1. Take a restorable backup and verify the target host/database. Stop old workers before deployment, so workers using incompatible lease protocols cannot overlap.
2. Set `DATABASE_URL` and `DIRECT_URL` securely. Use the direct/session database connection for migration operations.
3. Run `node scripts/baseline.mjs`. This performs a read-only comparison; it exits nonzero on schema differences or connection errors. Inspect `npx prisma migrate status` too. If migration history already exists, reconcile it before proceeding. Do not mark a mismatched schema applied.
4. Only after the comparison succeeds and the backup is confirmed: `BASELINE_BACKUP_CONFIRMED=yes node scripts/baseline.mjs --apply`. This marks the baseline without executing its SQL.
5. Review `prisma/migrations/20260918010000_sessions_and_leases/migration.sql`, then run `npx prisma migrate deploy`.
6. Change the Render start command to `node dist/server.js` and use `npx prisma migrate deploy` as a controlled predeploy step only after the baseline exists. The repository's temporary start command has not been changed to migrate deploy.
7. Generate Prisma Client, build, deploy, and verify queue health, login, and one test workflow. Existing sessions are deliberately invalidated by the session protocol change; users must sign in again.

Never use migrate reset, force-reset, drop, truncate or accept-data-loss against production. Never run the integration suite against production. A migration rollback must retain newly created Session rows/lease columns; roll forward or restore from a verified backup following incident review.

A fresh disposable database may run `prisma migrate deploy` directly; CI does this with a local `switchboard_test` database.
