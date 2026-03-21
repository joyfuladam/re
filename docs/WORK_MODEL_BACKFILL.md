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
- **GET `/api/works`**: Admins see all compositions; collaborators see compositions linked to recordings they’re on (`?q=` search). Used for messaging compose and pickers.
- **POST `/api/works`**: Admin-only create a standalone composition.
- Dashboard **New Song** and **Edit Song** include composition linking.
- **Works hub** (admin): `/dashboard/works` lists compositions; `/dashboard/works/[id]` edits title, ISWC, and label publishing share; `/dashboard/works/new` creates a composition without a recording.

## Work-level publishing (phase 2)

Writer and publisher splits are stored on **Work** (`WorkCollaborator`, `WorkPublishingEntity`) and mirrored to every linked **Song** so existing song UI and contracts keep working.

After deploying migration `20260209120000_work_publishing_tables`:

```bash
railway run npm run data:backfill-work-publishing
```

This copies splits from each work’s oldest recording into work tables and mirrors to siblings. Safe to re-run: skips works that already have work-level rows.

## Composition-scoped messaging

Migration `20260209140000_message_thread_work_id` adds optional `MessageThread.workId` so `work_collab` threads can reference a composition. Apply with your usual deploy flow (`npm run db:migrate:deploy` / Railway).

## Messaging (reactions, attachments, edit)

Migration `20260210120000_message_reactions_attachments` adds `Message.updatedAt`, `Message.deletedAt`, `MessageReaction`, and `MessageAttachment`. Run `prisma migrate deploy` after pull. Message files are stored under `uploads/messages/...` (same base as other uploads via `RAILWAY_VOLUME_MOUNT_PATH` when set).

## Songwriting workspace

Migration `20260211100000_songwriting_workspace` adds enum value `songwriting` on `MessageThreadType` and `Song.songwritingLyricsJson` (JSON). The app exposes `/dashboard/songs/[id]/songwriting` with lyrics/chords, rough demo uploads (`SongMedia` with collaborator header `x-songwriting-demo: 1`), and a canonical songwriting message thread per recording (participants = song collaborators).

## Composition lifecycle (`Work.compositionStatus`)

Migration `20260211120000_work_composition_status` adds `WorkCompositionStatus` (`in_progress` | `finalized`) on `Work`. Existing rows are set to `finalized`; new compositions created with `POST /api/songs` (new work) default to `in_progress`.

- **Songwriting flow:** `POST /api/songs` with `songwritingIntent: true` (and no `workId`) creates a new work in progress; UI entry: `/dashboard/songs/new?songwriting=1` → redirects to `/dashboard/songs/[id]/songwriting`.
- **Finalize:** Admins can PATCH `/api/works/[id]` with `{ "compositionStatus": "finalized" }` or use **Mark composition finalized** on `/dashboard/works/[id]`.
