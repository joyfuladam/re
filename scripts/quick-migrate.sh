#!/bin/bash
# quick-migrate.sh - Quick migration script (less interactive)

set -e

MIGRATION_NAME=$1

if [ -z "$MIGRATION_NAME" ]; then
    echo "Usage: ./scripts/quick-migrate.sh migration_name"
    echo "Example: ./scripts/quick-migrate.sh add_bio_to_collaborator"
    exit 1
fi

echo "🚀 Creating migration: $MIGRATION_NAME"

# Create and apply migration locally
npx prisma migrate dev --name "$MIGRATION_NAME"

# Generate Prisma Client
npx prisma generate

# Show migration SQL for review
MIGRATION_FILE=$(find prisma/migrations -name "*_${MIGRATION_NAME}" -type d | head -1)
if [ -n "$MIGRATION_FILE" ]; then
    echo ""
    echo "📄 Migration SQL:"
    echo "════════════════════════════════════════"
    cat "${MIGRATION_FILE}/migration.sql"
    echo "════════════════════════════════════════"
    echo ""
fi

# Stage changes
git add prisma/schema.prisma prisma/migrations/

echo "✅ Migration created and staged."
echo ""
echo "📝 Next steps:"
echo "   1. Review the migration SQL above"
echo "   2. git commit -m 'Migration: $MIGRATION_NAME'"
echo "   3. git push origin main"
echo "   4. supabase db push  (to apply to production)"



