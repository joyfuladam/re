# Message threading migration (Phase 1)

After pulling, apply the database migration so `MessageThread.threadType`, `Message.parentMessageId`, and `Message.rootMessageId` exist.

**Local / CI:**

```bash
npx prisma migrate deploy
# or during development:
npx prisma migrate dev
```

**Railway:** run the same against your production `DATABASE_URL` (e.g. from the project root with env loaded).

Migration file: `prisma/migrations/20260208120000_message_threading/migration.sql`

If `migrate deploy` reports no pending migrations, the DB is already up to date.
