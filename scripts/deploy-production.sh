#!/bin/bash

# Production Deployment Helper Script
# This script helps verify your deployment setup

set -e

echo "🚀 River & Ember - Production Deployment Helper"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
echo "📦 Checking prerequisites..."
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
else
    echo -e "${GREEN}✅ Vercel CLI installed${NC}"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
fi

# Check if Prisma is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found${NC}"
    exit 1
fi

echo ""
echo "🔐 Environment Variables Check"
echo "=============================="
echo ""

# Check for .env.production file
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✅ .env.production file found${NC}"
    
    # Check for required variables
    REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env.production; then
            echo -e "${GREEN}✅ $var is set${NC}"
        else
            echo -e "${RED}❌ $var is missing${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "   Run: vercel env pull .env.production"
fi

echo ""
echo "🗄️  Database Migration"
echo "======================"
echo ""

read -p "Do you want to run database migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f ".env.production" ]; then
        echo "Running migrations..."
        export $(cat .env.production | grep -v '^#' | xargs)
        npx prisma migrate deploy
        echo -e "${GREEN}✅ Migrations completed${NC}"
    else
        echo -e "${RED}❌ .env.production not found. Cannot run migrations.${NC}"
        echo "   Run: vercel env pull .env.production"
    fi
fi

echo ""
echo "📋 Next Steps:"
echo "============="
echo ""
echo "1. Ensure all environment variables are set in Vercel dashboard"
echo "2. Deploy your application: vercel --prod"
echo "3. Test your deployment at your Vercel URL"
echo "4. Configure HelloSign webhook (if using e-signatures)"
echo ""
echo "For detailed instructions, see: DEPLOYMENT_CHECKLIST.md"
echo ""


