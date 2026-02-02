#!/bin/bash
# Set environment variables in Railway

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting Railway Environment Variables${NC}\n"

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

# Get Railway app URL (will be set after first deployment)
echo -e "${YELLOW}Step 1: Get Railway App URL${NC}"
echo -e "${BLUE}After your first successful deployment, Railway will provide a URL like:${NC}"
echo -e "${YELLOW}https://river-ember-app-production-xxxx.up.railway.app${NC}"
echo -e "${BLUE}You can find it in Railway dashboard → Your service → Settings → Domains${NC}\n"

read -p "Enter your Railway app URL (or press Enter to skip for now): " RAILWAY_URL

# Get Database URL
echo -e "\n${YELLOW}Step 2: Database URL${NC}"
echo -e "${BLUE}Get this from Railway dashboard → Postgres service → Variables → DATABASE_URL${NC}"
read -p "Enter Railway DATABASE_URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL is required${NC}"
    exit 1
fi

# Generate secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
DOCUSEAL_WEBHOOK_SECRET=$(openssl rand -base64 32)

echo -e "\n${YELLOW}Step 3: DocuSeal Configuration${NC}"
read -p "Enter DOCUSEAL_API_URL (default: https://docuseal-railway-production-b45b.up.railway.app): " DOCUSEAL_API_URL
DOCUSEAL_API_URL=${DOCUSEAL_API_URL:-https://docuseal-railway-production-b45b.up.railway.app}

read -p "Enter DOCUSEAL_API_KEY (from DocuSeal Railway service): " DOCUSEAL_API_KEY

# CEO Email
read -p "Enter CEO_EMAIL (default: adam@riverandember.com): " CEO_EMAIL
CEO_EMAIL=${CEO_EMAIL:-adam@riverandember.com}

# Set NEXTAUTH_URL
if [ -z "$RAILWAY_URL" ]; then
    echo -e "${YELLOW}⚠️  NEXTAUTH_URL will need to be set manually after deployment${NC}"
    NEXTAUTH_URL=""
else
    NEXTAUTH_URL="$RAILWAY_URL"
fi

echo -e "\n${GREEN}Setting environment variables...${NC}\n"

# Set variables
railway variables set DATABASE_URL="$DATABASE_URL"
railway variables set NEXTAUTH_SECRET="$NEXTAUTH_SECRET"

if [ -n "$NEXTAUTH_URL" ]; then
    railway variables set NEXTAUTH_URL="$NEXTAUTH_URL"
fi

if [ -n "$DOCUSEAL_API_KEY" ]; then
    railway variables set DOCUSEAL_API_URL="$DOCUSEAL_API_URL"
    railway variables set DOCUSEAL_API_KEY="$DOCUSEAL_API_KEY"
    railway variables set DOCUSEAL_WEBHOOK_SECRET="$DOCUSEAL_WEBHOOK_SECRET"
fi

railway variables set CEO_EMAIL="$CEO_EMAIL"

echo -e "\n${GREEN}✅ Environment variables set!${NC}\n"
echo -e "${BLUE}Summary:${NC}"
echo -e "  DATABASE_URL: ${DATABASE_URL//:[^:@]*@/:****@}"
echo -e "  NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:20}..."
echo -e "  NEXTAUTH_URL: ${NEXTAUTH_URL:-<set after deployment>}"
if [ -n "$DOCUSEAL_API_KEY" ]; then
    echo -e "  DOCUSEAL_API_URL: $DOCUSEAL_API_URL"
    echo -e "  DOCUSEAL_API_KEY: ${DOCUSEAL_API_KEY:0:20}..."
fi
echo -e "  CEO_EMAIL: $CEO_EMAIL"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Railway will automatically redeploy with new variables"
echo -e "2. If NEXTAUTH_URL wasn't set, set it manually after deployment:"
echo -e "   ${BLUE}railway variables set NEXTAUTH_URL=\"https://your-app.railway.app\"${NC}"
echo -e "3. Check deployment logs: ${BLUE}railway logs${NC}"
