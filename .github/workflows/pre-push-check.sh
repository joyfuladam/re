#!/bin/bash
# Pre-push check script
# Run this before pushing to catch build errors early
# Usage: ./pre-push-check.sh [--serve]
#   --serve: After successful build, start the production server for browser testing

SERVE_AFTER_BUILD=false

# Check for --serve flag
if [[ "$1" == "--serve" ]]; then
  SERVE_AFTER_BUILD=true
fi

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
echo "✅ Build successful!"

if [ "$SERVE_AFTER_BUILD" = true ]; then
  echo ""
  echo "🚀 Starting production server..."
  echo "   Open http://localhost:3000 in your browser to test"
  echo "   Press Ctrl+C to stop the server when done"
  echo ""
  npm start
else
  echo ""
  echo "💡 Tip: Run with --serve flag to test in browser:"
  echo "   ./.github/workflows/pre-push-check.sh --serve"
  echo ""
  echo "   Or use: npm run test:serve"
  echo ""
  echo "   Or manually start the server: npm start"
fi
