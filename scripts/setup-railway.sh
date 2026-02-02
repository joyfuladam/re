#!/bin/bash
# Setup script for Railway migration

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚂 Railway Migration Setup${NC}\n"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found. Install it with:${NC}"
    echo -e "${YELLOW}npm i -g @railway/cli${NC}"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway. Logging in...${NC}"
    railway login
fi

echo -e "${GREEN}✅ Railway CLI ready${NC}\n"

# Step 1: Add PostgreSQL database
echo -e "${YELLOW}Step 1: Add PostgreSQL Database${NC}"
echo -e "${BLUE}Please add PostgreSQL database via Railway dashboard:${NC}"
echo -e "${YELLOW}1. Go to: https://railway.com/project/0cfbe5cc-738c-4de3-b12a-71dedf93d16c${NC}"
echo -e "${YELLOW}2. Click '+ New' → 'Database' → 'Add PostgreSQL'${NC}"
echo -e "${YELLOW}3. Wait for database to be provisioned${NC}"
echo -e "${YELLOW}4. Go to Postgres service → 'Variables' tab${NC}"
echo -e "${YELLOW}5. Copy the DATABASE_URL value${NC}\n"

read -p "Press Enter once you've added the database and copied the DATABASE_URL..."

# Step 2: Get database URL
echo -e "\n${YELLOW}Step 2: Get Railway Database URL${NC}"
read -p "Enter Railway DATABASE_URL: " RAILWAY_DB_URL

if [ -z "$RAILWAY_DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL is required${NC}"
    exit 1
fi

# Step 3: Set Supabase URL
SUPABASE_URL="${SUPABASE_DATABASE_URL:-postgresql://postgres.jeczuayosodxqbkfjasw:byqzo7-qimjad-saqsaM@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true}"

echo -e "\n${YELLOW}Step 3: Run Migration${NC}"
echo -e "${BLUE}Supabase URL: ${SUPABASE_URL//:[^:@]*@/:****@}${NC}"
echo -e "${BLUE}Railway URL: ${RAILWAY_DB_URL//:[^:@]*@/:****@}${NC}\n"

read -p "Continue with migration? (y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

# Step 4: Run migration
echo -e "\n${GREEN}🚀 Starting migration...${NC}\n"

SUPABASE_DATABASE_URL="$SUPABASE_URL" \
RAILWAY_DATABASE_URL="$RAILWAY_DB_URL" \
npx tsx scripts/migrate-to-railway.ts

echo -e "\n${GREEN}✅ Migration complete!${NC}\n"

# Step 5: Set environment variables
echo -e "${YELLOW}Step 4: Set Environment Variables${NC}"
echo -e "${BLUE}Now set these variables in Railway:${NC}"
echo -e "${YELLOW}1. Go to Railway dashboard → river-ember-app service → Variables${NC}"
echo -e "${YELLOW}2. Add the following variables:${NC}\n"

echo -e "${GREEN}DATABASE_URL=${RAILWAY_DB_URL}${NC}"
echo -e "${GREEN}NEXTAUTH_URL=https://your-app.railway.app${NC}"
echo -e "${GREEN}NEXTAUTH_SECRET=$(openssl rand -base64 32)${NC}"
echo -e "${GREEN}DOCUSEAL_API_URL=https://docuseal-railway-production-b45b.up.railway.app${NC}"
echo -e "${GREEN}DOCUSEAL_API_KEY=<from DocuSeal service>${NC}"
echo -e "${GREEN}DOCUSEAL_WEBHOOK_SECRET=$(openssl rand -base64 32)${NC}"
echo -e "${GREEN}CEO_EMAIL=adam@riverandember.com${NC}\n"

echo -e "${BLUE}Or set them via CLI:${NC}"
echo -e "${YELLOW}railway variables set DATABASE_URL=\"${RAILWAY_DB_URL}\"${NC}"
echo -e "${YELLOW}railway variables set NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"${NC}"
echo -e "${YELLOW}railway variables set DOCUSEAL_WEBHOOK_SECRET=\"$(openssl rand -base64 32)\"${NC}\n"

echo -e "${GREEN}🎉 Setup complete! Your app should deploy automatically.${NC}"
