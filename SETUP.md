# Local Development Setup Guide

## Prerequisites

Before you can test this application locally, you need:

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/) or use a version manager
2. **PostgreSQL** - Download from [postgresql.org](https://www.postgresql.org/download/) or use Docker
3. **npm** - Comes with Node.js

## Quick Setup Steps

### 1. Install Node.js (if not already installed)

**Option A: Direct Download**
- Visit https://nodejs.org/ and download the LTS version
- Install the package

**Option B: Using Homebrew (macOS)**
```bash
brew install node
```

**Option C: Using nvm (Node Version Manager)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js
nvm install 18
nvm use 18
```

### 2. Verify Installation

```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

### 3. Set Up PostgreSQL Database

**Option A: Install PostgreSQL Locally**
- Download from https://www.postgresql.org/download/
- Create a database named `river_ember`

**Option B: Use Docker**
```bash
docker run --name river-ember-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=river_ember -p 5432:5432 -d postgres
```

**Option C: Use a Cloud Service**
- Use services like Supabase, Railway, or Neon (free tiers available)

### 4. Install Dependencies

```bash
npm install
```

### 5. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/river_ember"

# NextAuth - Generate a secret key
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# HelloSign/Dropbox Sign (optional for now)
HELLOSIGN_API_KEY=""
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 6. Set Up Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 7. Create Initial User (Optional)

You'll need to create a user account. You can do this by:

**Option A: Using Prisma Studio**
```bash
npx prisma studio
```
Then manually create a user in the User table (password needs to be hashed with bcrypt)

**Option B: Create a seed script** (we can add this if needed)

**Option C: Use the registration page** (if we add one)

For now, you can create a user directly in the database. The password should be hashed using bcrypt. Here's a quick Node.js script:

```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-password', 10);
console.log(hash);
```

Then insert into the database:
```sql
INSERT INTO "User" (id, email, password, name, "createdAt", "updatedAt")
VALUES ('cuid-here', 'admin@example.com', '$2a$10$hashed-password', 'Admin', NOW(), NOW());
```

### 8. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

### 9. Access the Application

- Login page: http://localhost:3000/login
- Dashboard: http://localhost:3000/dashboard (requires authentication)

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready` or check Docker container
- Check DATABASE_URL format: `postgresql://username:password@host:port/database`
- Ensure database exists: `createdb river_ember`

### Port Already in Use
- Change port: `PORT=3001 npm run dev`
- Or kill process using port 3000

### Prisma Issues
- Reset database: `npx prisma db push --force-reset` (WARNING: deletes all data)
- Regenerate client: `npx prisma generate`

### Authentication Issues
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your local URL
- Clear browser cookies if session issues occur

## Next Steps

Once running:
1. Create a collaborator (Dashboard → Collaborators → Add Collaborator)
2. Create a song (Dashboard → Songs → Add Song)
3. Add collaborators to the song
4. Set publishing splits (must total 100%)
5. Lock publishing splits
6. Set master splits (must total 100%)
7. Lock master splits
8. Generate contracts

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open database GUI
npx prisma db push   # Push schema changes to database
```

