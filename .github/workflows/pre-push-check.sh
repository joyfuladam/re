#!/bin/bash
# Pre-push check script
# Run this before pushing to catch build errors early

echo "🔍 Running pre-push checks..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are you in the project root?"
  exit 1
fi

# Run build test
echo "📦 Testing production build..."
npm run build

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build failed! Please fix the errors before pushing."
  exit 1
fi

echo ""
echo "✅ Build successful! Safe to push."
echo ""
echo "💡 Tip: You can test the production server locally with: npm start"
