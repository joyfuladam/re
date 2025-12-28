# 🚀 Local Setup - Start Here

Follow these steps to get the application running locally:

## Step 1: Install Node.js (if needed)

**Check if you have Node.js:**
```bash
node --version
```

**If not installed, install it:**

**macOS with Homebrew:**
```bash
brew install node
```

**Or download from:**
- https://nodejs.org/ (Download LTS version)

**Verify installation:**
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

## Step 2: Start Docker Desktop

The database runs in Docker. Make sure Docker Desktop is running:

1. Open Docker Desktop application
2. Wait for it to fully start (whale icon in menu bar should be stable)

## Step 3: Run the Setup Script

I've created a setup script that will do everything for you:

```bash
./setup-local.sh
```

This script will:
- ✅ Check Node.js is installed
- ✅ Create/start the PostgreSQL database container
- ✅ Install all npm dependencies
- ✅ Generate Prisma client
- ✅ Create database schema

## Step 4: Start the Development Server

```bash
npm run dev
```

## Step 5: Open in Browser

Go to: **http://localhost:3000**

## Step 6: Create Your Account

1. Click "Register"
2. Enter your email, password, and name
3. You'll be automatically logged in

## That's It! 🎉

You can now:
- Create collaborators
- Add songs
- Set up splits
- Generate contracts

## Troubleshooting

### "Node.js not found"
- Install Node.js (see Step 1)

### "Docker daemon not running"
- Start Docker Desktop
- Wait for it to fully start
- Run setup script again

### "Port 3000 already in use"
```bash
PORT=3001 npm run dev
```

### Database connection error
- Check Docker container is running: `docker ps | grep river-ember-db`
- Start it: `docker start river-ember-db`
- Check .env file has correct DATABASE_URL

### Reset everything
```bash
# Stop and remove database container
docker stop river-ember-db
docker rm river-ember-db

# Run setup script again
./setup-local.sh
```

## Manual Setup (if script doesn't work)

If you prefer to do it manually:

```bash
# 1. Start database
docker run -d --name river-ember-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=river_ember \
  -p 5432:5432 \
  postgres:15

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Create database schema
npx prisma db push

# 5. Start server
npm run dev
```

## Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:studio    # Open database GUI (view/edit data)
docker ps            # List running containers
docker start river-ember-db   # Start database
docker stop river-ember-db    # Stop database
docker logs river-ember-db    # View database logs
```

