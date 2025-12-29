#!/bin/bash

# Production Database Migration Script
# This script runs Prisma migrations on your production database

set -e

echo "🗄️  Production Database Migration"
echo "=================================="
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found"
    echo ""
    echo "Please run first:"
    echo "  vercel env pull .env.production"
    echo ""
    exit 1
fi

# Load environment variables
echo "📥 Loading environment variables from .env.production..."
export $(cat .env.production | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in .env.production"
    echo ""
    echo "Please ensure DATABASE_URL is set in Vercel and run:"
    echo "  vercel env pull .env.production"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Confirm before running migrations
echo "⚠️  WARNING: This will run migrations on your PRODUCTION database!"
echo "   Database: $DATABASE_URL"
echo ""
read -p "Are you sure you want to continue? (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Run migrations
echo "🚀 Running migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Migrations completed successfully!"
echo ""

