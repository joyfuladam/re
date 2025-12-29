#!/bin/bash

# Generate secrets for production deployment

echo "🔐 Generating Production Secrets"
echo "================================"
echo ""

# Generate NEXTAUTH_SECRET
echo "Generating NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo ""
echo "✅ NEXTAUTH_SECRET generated:"
echo "$NEXTAUTH_SECRET"
echo ""
echo "📋 Add this to your Vercel environment variables:"
echo "   Key: NEXTAUTH_SECRET"
echo "   Value: $NEXTAUTH_SECRET"
echo ""

# Instructions
echo "💡 Next steps:"
echo "1. Copy the NEXTAUTH_SECRET above"
echo "2. Go to Vercel Dashboard → Settings → Environment Variables"
echo "3. Add NEXTAUTH_SECRET with the value above"
echo "4. Set for Production, Preview, and Development environments"
echo ""

