#!/bin/bash
# deploy-migration.sh - Automated database migration workflow

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Migration Workflow${NC}\n"

# Step 1: Check if there are schema changes
echo -e "${YELLOW}Step 1: Checking for schema changes...${NC}"
if ! npx prisma format > /dev/null 2>&1; then
    echo -e "${RED}❌ Prisma schema has errors. Please fix them first.${NC}"
    exit 1
fi

# Check if schema has uncommitted changes
if git diff --quiet prisma/schema.prisma 2>/dev/null; then
    echo -e "${YELLOW}⚠️  No changes detected in prisma/schema.prisma${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Step 2: Get migration name
echo -e "\n${YELLOW}Step 2: Migration name${NC}"
read -p "Enter migration name (e.g., 'add_bio_to_collaborator'): " MIGRATION_NAME

if [ -z "$MIGRATION_NAME" ]; then
    echo -e "${RED}❌ Migration name is required${NC}"
    exit 1
fi

# Step 3: Create migration
echo -e "\n${YELLOW}Step 3: Creating migration...${NC}"
npx prisma migrate dev --name "$MIGRATION_NAME" --create-only

# Step 4: Review migration SQL
echo -e "\n${YELLOW}Step 4: Review migration SQL${NC}"
MIGRATION_FILE=$(find prisma/migrations -name "*_${MIGRATION_NAME}" -type d | head -1)
if [ -z "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found${NC}"
    exit 1
fi

MIGRATION_SQL="${MIGRATION_FILE}/migration.sql"
echo -e "${GREEN}Migration file: ${MIGRATION_SQL}${NC}"
echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${YELLOW}Migration SQL:${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
cat "$MIGRATION_SQL"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# Safety check for destructive operations
if grep -qi "DROP\|DELETE\|TRUNCATE" "$MIGRATION_SQL"; then
    echo -e "\n${RED}⚠️  WARNING: Migration contains potentially destructive operations!${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Migration cancelled. You can edit the migration file and run this script again.${NC}"
        exit 0
    fi
fi

# Step 5: Apply migration locally
echo -e "\n${YELLOW}Step 5: Applying migration to local database...${NC}"
npx prisma migrate dev

# Step 6: Generate Prisma Client
echo -e "\n${YELLOW}Step 6: Generating Prisma Client...${NC}"
npx prisma generate

# Step 7: Test (optional)
echo -e "\n${YELLOW}Step 7: Testing${NC}"
read -p "Run local dev server to test? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Starting dev server...${NC}"
    npm run dev &
    DEV_PID=$!
    echo -e "${GREEN}Dev server started (PID: $DEV_PID)${NC}"
    echo -e "${YELLOW}Test your app at http://localhost:3000${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop the server when done testing...${NC}"
    wait $DEV_PID
fi

# Step 8: Commit and push
echo -e "\n${YELLOW}Step 8: Committing changes...${NC}"
git add prisma/schema.prisma prisma/migrations/
git status

read -p "Commit and push to GitHub? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "Database migration: $MIGRATION_NAME"
    git push origin main
    echo -e "${GREEN}✅ Pushed to GitHub. Vercel will auto-deploy.${NC}"
else
    echo -e "${YELLOW}⚠️  Changes staged but not committed.${NC}"
    exit 0
fi

# Step 9: Apply to production
echo -e "\n${YELLOW}Step 9: Apply to production?${NC}"
read -p "Apply migration to Supabase production database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Applying migration to production...${NC}"
    
    # Check if Supabase is linked
    if ! supabase projects list 2>/dev/null | grep -q "jeczuayosodxqbkfjasw"; then
        echo -e "${YELLOW}Linking to Supabase project...${NC}"
        supabase link --project-ref jeczuayosodxqbkfjasw
    fi
    
    supabase db push
    echo -e "${GREEN}✅ Migration applied to production!${NC}"
else
    echo -e "${YELLOW}⚠️  Migration not applied to production. Run 'supabase db push' manually when ready.${NC}"
fi

echo -e "\n${GREEN}🎉 Migration workflow complete!${NC}"



