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

## API / UI (phase 1)

- **POST `/api/songs`**: Optional body `workId` (existing composition). If omitted, a new `Work` is created from the recording title (and ISWC when unique on `Work`).
- **PATCH `/api/songs/[id]`**: `workId` may be a composition id, `"__create__"` (new `Work` from current title/ISWC), or `null` (unlink).
- **GET `/api/works`**: Admin-only list for pickers (`?q=` search).
- **POST `/api/works`**: Admin-only create a standalone composition.
- Dashboard **New Song** and **Edit Song** include composition linking.
