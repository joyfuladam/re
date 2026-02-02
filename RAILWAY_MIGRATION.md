# Railway Migration Guide

This guide will help you migrate your entire app and database from Supabase to Railway.

## Prerequisites

- Railway CLI installed and logged in (`railway login`)
- Access to your Supabase database
- GitHub repository connected to Railway

## Step 1: Add PostgreSQL Database to Railway

The database service needs to be added via the Railway dashboard:

1. Go to your Railway project: https://railway.com/project/0cfbe5cc-738c-4de3-b12a-71dedf93d16c
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Wait for the database to be provisioned (takes ~1-2 minutes)
4. Once created, go to the Postgres service → **"Variables"** tab
5. Copy the `DATABASE_URL` value (you'll need this for migration)

Alternatively, you can add it via CLI (interactive):
```bash
railway add
# Select "Database" → "PostgreSQL"
```

## Step 2: Get Database Connection Strings

### Supabase Database URL
Your Supabase database URL is:
```
postgresql://postgres.jeczuayosodxqbkfjasw:byqzo7-qimjad-saqsaM@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Note:** For migration, you might need the direct connection (not pgbouncer). Check your Supabase dashboard → Settings → Database → Connection string → "Direct connection".

### Railway Database URL
Get this from Railway dashboard → Postgres service → Variables → `DATABASE_URL`

## Step 3: Run the Migration Script

```bash
# Set environment variables
export SUPABASE_DATABASE_URL="postgresql://postgres.jeczuayosodxqbkfjasw:byqzo7-qimjad-saqsaM@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
export RAILWAY_DATABASE_URL="postgresql://postgres:password@host:port/database"  # Replace with actual Railway URL

# Run migration
npx tsx scripts/migrate-to-railway.ts
```

The script will:
1. ✅ Export all data from Supabase
2. ✅ Create schema in Railway Postgres
3. ✅ Import all data to Railway Postgres

## Step 4: Set Environment Variables in Railway

Go to Railway dashboard → Your app service → Variables, and add:

### Required Variables

```bash
# Database
DATABASE_URL=<from Railway Postgres service>

# NextAuth
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# DocuSeal
DOCUSEAL_API_URL=https://docuseal-railway-production-b45b.up.railway.app
DOCUSEAL_API_KEY=<from your DocuSeal Railway service>
DOCUSEAL_WEBHOOK_SECRET=<generate with: openssl rand -base64 32>

# CEO Email (for contract signing)
CEO_EMAIL=adam@riverandember.com

# Optional: Other environment variables from your .env.local
```

### Set via CLI

```bash
# Link to your app service
railway service river-ember-app

# Set variables
railway variables set DATABASE_URL="<railway-postgres-url>"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
railway variables set DOCUSEAL_API_URL="https://docuseal-railway-production-b45b.up.railway.app"
railway variables set DOCUSEAL_API_KEY="<your-docuseal-key>"
railway variables set DOCUSEAL_WEBHOOK_SECRET="$(openssl rand -base64 32)"
railway variables set CEO_EMAIL="adam@riverandember.com"
```

## Step 5: Configure Railway Deployment

The app is already configured with:
- `railway.json` - Railway deployment config
- `nixpacks.toml` - Build configuration (includes Puppeteer Chrome)

Railway will automatically:
1. Detect Next.js
2. Run `npm ci`
3. Install Puppeteer Chrome
4. Run `npm run build`
5. Start with `npm start`

## Step 6: Deploy

Railway will auto-deploy when you push to the connected branch. Or deploy manually:

```bash
railway up
```

## Step 7: Set Up Custom Domain (Optional)

```bash
railway domain
# Follow prompts to add your custom domain
```

## Step 8: Configure DocuSeal Webhook

1. Go to your DocuSeal Railway service dashboard
2. Navigate to Settings → Webhooks
3. Add webhook URL: `https://your-app.railway.app/api/esignature/webhook`
4. Set webhook secret to match `DOCUSEAL_WEBHOOK_SECRET` in your app

## Verification

After deployment:

1. ✅ Check Railway logs: `railway logs`
2. ✅ Verify database connection (check app logs)
3. ✅ Test login functionality
4. ✅ Test contract generation and e-signature sending
5. ✅ Verify webhook is receiving events

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is set correctly
- Check Railway Postgres service is running
- Verify connection string format

### Build Failures
- Check Railway logs for specific errors
- Ensure Puppeteer Chrome installation completes
- Verify Node.js version compatibility

### Migration Issues
- Check Supabase connection (might need direct connection, not pgbouncer)
- Verify Railway Postgres is accessible
- Check migration script logs for specific errors

## Rollback Plan

If you need to rollback:
1. Keep Supabase database running during migration
2. Update `DATABASE_URL` back to Supabase if needed
3. Railway deployments can be rolled back via dashboard
