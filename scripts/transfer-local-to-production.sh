#!/bin/bash
# transfer-local-to-production.sh - Transfer all local data to production

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔄 Local to Production Data Transfer${NC}\n"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}DATABASE_URL not set. Using Supabase production connection...${NC}"
    read -p "Enter production DATABASE_URL (or press Enter to use default): " PROD_DB_URL
    
    if [ -z "$PROD_DB_URL" ]; then
        PROD_DB_URL="postgresql://postgres.jeczuayosodxqbkfjasw:byqzo7-qimjad-saqsaM@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
        echo -e "${YELLOW}Using default Supabase connection${NC}"
    fi
    export DATABASE_URL="$PROD_DB_URL"
fi

# Check local database connection
echo -e "${YELLOW}Step 1: Checking local database connection...${NC}"
LOCAL_DB_URL="${LOCAL_DATABASE_URL:-postgresql://postgres:password@localhost:5432/river_ember}"
export LOCAL_DATABASE_URL="$LOCAL_DB_URL"

# Step 2: Export from local
echo -e "\n${YELLOW}Step 2: Exporting data from local database...${NC}"
echo -e "${GREEN}Local DB: ${LOCAL_DB_URL}${NC}"
npx tsx scripts/export-local-data.ts

if [ ! -f "local-data-export.json" ]; then
    echo -e "${RED}❌ Export failed - file not created${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Export complete${NC}"

# Step 3: Confirm before import
echo -e "\n${YELLOW}Step 3: Ready to import to production${NC}"
echo -e "${GREEN}Production DB: ${DATABASE_URL//:[^:@]*@/:****@}${NC}"
echo -e "${RED}⚠️  WARNING: This will add/update data in production!${NC}"
echo -e "${YELLOW}Existing records with same IDs will be updated.${NC}"
read -p "Continue with import? (y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Import cancelled. Export file saved at: local-data-export.json${NC}"
    exit 0
fi

# Step 4: Import to production
echo -e "\n${YELLOW}Step 4: Importing to production database...${NC}"
npx tsx scripts/import-to-production.ts

echo -e "\n${GREEN}🎉 Data transfer complete!${NC}"
echo -e "${YELLOW}Note: Export file saved at: local-data-export.json${NC}"
echo -e "${YELLOW}You can delete it if you no longer need it.${NC}"



