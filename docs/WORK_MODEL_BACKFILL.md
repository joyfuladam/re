# Work model (phase 1)

After deploy applies migration `20260208140000_add_work_model`, the `Work` table exists and `Song.workId` is nullable.

**One-time backfill** (creates one `Work` per `Song` that has no `workId` yet):

```bash
# Local (with DATABASE_URL)
npm run data:backfill-works

# Railway
railway run npm run data:backfill-works
```

Safe to re-run: only processes rows where `workId` is still `null`.

**Build:** `npm run build` now runs `prisma migrate deploy` (not `db push`) so production matches committed migrations.
