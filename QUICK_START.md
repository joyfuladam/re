# Quick Start Guide

Follow these steps to test the application locally:

## 1. Install Node.js (if needed)

**macOS with Homebrew:**
```bash
brew install node
```

**Or download from:** https://nodejs.org/

Verify installation:
```bash
node --version  # Should be v18+
npm --version
```

## 2. Set Up PostgreSQL Database

**Option A: Docker (Easiest)**
```bash
docker run --name river-ember-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=river_ember \
  -p 5432:5432 \
  -d postgres
```

**Option B: Local Installation**
- Install PostgreSQL from https://www.postgresql.org/download/
- Create database: `createdb river_ember`

**Option C: Cloud (Free)**
- Use Supabase (https://supabase.com) - free tier available
- Copy the connection string

## 3. Install Dependencies

```bash
npm install
```

## 4. Configure Environment

Create `.env` file:
```bash
# Copy the example (if it exists) or create new
cat > .env << EOF
DATABASE_URL="postgresql://postgres:password@localhost:5432/river_ember"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
HELLOSIGN_API_KEY=""
EOF
```

**Important:** Replace the DATABASE_URL with your actual database credentials.

## 5. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Create database tables
npm run db:push
```

## 6. Start the Server

```bash
npm run dev
```

## 7. Create Your First Account

1. Open http://localhost:3000
2. Click "Register"
3. Enter your email, password, and name
4. You'll be automatically logged in

## 8. Start Using the App

1. **Create a Collaborator:**
   - Go to Dashboard → Collaborators → Add Collaborator
   - Choose a role (Musician, Writer, Producer, or Label)
   - Fill in the details

2. **Create a Song:**
   - Go to Dashboard → Songs → Add Song
   - Enter song title and details

3. **Add Collaborators to Song:**
   - Open the song detail page
   - Click "Add Collaborator"
   - Select a collaborator

4. **Set Publishing Splits:**
   - On the song detail page, set publishing ownership percentages
   - Must total exactly 100%
   - Click "Lock Splits" when done

5. **Set Master Splits:**
   - After publishing is locked, set master ownership percentages
   - Must total exactly 100%
   - Click "Lock Splits" when done

6. **Generate Contracts:**
   - After both splits are locked, you can generate contracts
   - Contracts are role-specific

## Troubleshooting

**Database connection error:**
- Check PostgreSQL is running: `docker ps` (if using Docker)
- Verify DATABASE_URL in `.env`
- Test connection: `psql $DATABASE_URL`

**Port 3000 already in use:**
```bash
PORT=3001 npm run dev
```

**Prisma errors:**
```bash
# Reset and regenerate
npm run db:generate
npm run db:push
```

**Can't log in:**
- Make sure you've created an account via the register page
- Check browser console for errors
- Verify NEXTAUTH_SECRET is set in `.env`

## Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run db:studio    # Open database GUI (view/edit data)
npm run lint         # Check code quality
```

## Next Steps

- Read `SETUP.md` for detailed setup instructions
- Read `README.md` for feature documentation
- Check the plan file for architecture details

