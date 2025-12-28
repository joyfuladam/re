# Setup Status

## What's Been Done ✅

1. ✅ Created `.env.example` file (template for environment variables)
2. ✅ Created `setup-local.sh` script (automated setup)
3. ✅ Created `START_HERE.md` guide (step-by-step instructions)
4. ✅ Generated NextAuth secret key

## What You Need To Do

### 1. Install Node.js

**Check if installed:**
```bash
node --version
```

**If not installed:**

**macOS with Homebrew:**
```bash
brew install node
```

**Or download from:** https://nodejs.org/

**Verify:**
```bash
node --version  # Should show v18+
npm --version   # Should show v9+
```

### 2. Start Docker Desktop

1. Open Docker Desktop application
2. Wait for it to fully start (icon in menu bar)
3. Verify it's running: `docker ps` should work without errors

### 3. Create .env File

The `.env` file is in `.gitignore` for security. Create it manually:

```bash
cp .env.example .env
```

Or create it manually with this content (the secret is already generated for you):

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/river_ember"

# NextAuth
NEXTAUTH_SECRET="XEY2JOqHbIEwF6svQLzigapx4cOFgWOb4/iKbhm40Ww="
NEXTAUTH_URL="http://localhost:3000"

# HelloSign/Dropbox Sign (optional - leave empty for now)
HELLOSIGN_API_KEY=""
```

### 4. Run Setup Script

Once Node.js is installed and Docker is running:

```bash
./setup-local.sh
```

This will:
- Check prerequisites
- Create/start PostgreSQL database
- Install npm dependencies
- Set up database schema

### 5. Start Development Server

```bash
npm run dev
```

### 6. Open Browser

Go to: http://localhost:3000

## Quick Command Reference

```bash
# Check prerequisites
node --version
npm --version
docker --version
docker ps  # Should work if Docker is running

# Run setup (after Node.js is installed)
./setup-local.sh

# Or manual setup
cp .env.example .env
npm install
npx prisma generate
npx prisma db push

# Start server
npm run dev

# Database commands
docker start river-ember-db    # Start database
docker stop river-ember-db     # Stop database
docker logs river-ember-db     # View logs
```

## Next Steps After Setup

1. Register an account at http://localhost:3000
2. Create a collaborator (Dashboard → Collaborators → Add)
3. Create a song (Dashboard → Songs → Add)
4. Add collaborators to songs
5. Set publishing splits (must total 100%)
6. Lock publishing splits
7. Set master splits (must total 100%)
8. Lock master splits
9. Generate contracts

