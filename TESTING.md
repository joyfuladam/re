# Local Testing Guide

Before pushing code to git for deployment, always test locally first to catch build errors early.

## Quick Test (Recommended)

```bash
npm run build
```

This will:
- ✅ Generate Prisma Client
- ✅ Compile TypeScript
- ✅ Check for syntax errors
- ✅ Verify all imports are correct
- ✅ Catch build-time errors

**If this succeeds, your code is safe to push!**

## Test in Browser

To build AND test in the browser:

```bash
npm run test:serve
```

Or use the script:
```bash
./.github/workflows/pre-push-check.sh --serve
```

This will:
1. Build the production version
2. Start the production server
3. Open `http://localhost:3000` in your browser to test
4. Press `Ctrl+C` to stop when done

## Full Production Test

To test the production build locally:

```bash
# Step 1: Build
npm run build

# Step 2: Start production server
npm start

# Step 3: Test in browser at http://localhost:3000
```

## Development Mode

For active development with hot reload:

```bash
npm run dev
```

Opens at `http://localhost:3000` with live reload.

## Pre-Push Workflow

**Always run this before pushing:**

```bash
npm run build
```

If build succeeds:
```bash
git add -A
git commit -m "Your message"
git push origin main
```

If build fails:
- Fix the errors
- Run `npm run build` again
- Only push after build succeeds

## Common Build Errors

1. **TypeScript errors**: Fix type issues in your code
2. **Missing imports**: Add missing imports
3. **Syntax errors**: Fix JSX/TSX syntax
4. **Environment variables**: Some may be required at build time (like Resend API key)

## Automated Pre-Push Check

You can use the provided script:

```bash
./.github/workflows/pre-push-check.sh
```

Or set up a git pre-push hook (advanced).
