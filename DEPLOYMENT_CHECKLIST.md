# Vercel Deployment Checklist

Follow these steps in order to deploy your application to Vercel.

## ✅ Automated Steps (Already Done)

- [x] Generated NEXTAUTH_SECRET
- [x] Created environment variable templates
- [x] Created deployment scripts
- [x] Verified build configuration

## 📋 Manual Steps

### Step 1: Set Up PostgreSQL Database

**What this does:** Your application needs a PostgreSQL database to store all data (users, songs, collaborators, contracts, etc.). This database runs separately from your application code and persists data even when you redeploy.

**Why it's needed:** 
- Stores all application data (users, songs, collaborators, contracts)
- Provides data persistence across deployments
- Enables multiple instances of your app to share the same data

Choose one of these providers (all have free tiers):

**Option A: Supabase (Recommended - Easiest)**
1. Go to https://supabase.com
2. Sign up for free account
3. Create a new project
4. Go to Settings → Database
5. Copy the "Connection string" (URI format)
6. **Save this DATABASE_URL - you'll need it in Step 4**

**What Supabase provides:**
- Managed PostgreSQL database
- Built-in connection pooling (better for serverless)
- Web dashboard for database management
- Automatic backups
- Free tier includes 500MB database

**Option B: Neon**
1. Go to https://neon.tech
2. Sign up for free account
3. Create a new project
4. Copy the connection string
5. **Save this DATABASE_URL - you'll need it in Step 4**

**What Neon provides:**
- Serverless PostgreSQL
- Auto-scaling
- Branching (like Git for databases)
- Free tier available

**Option C: Railway**
1. Go to https://railway.app
2. Sign up for free account
3. Create new project → Add PostgreSQL
4. Copy the connection string
5. **Save this DATABASE_URL - you'll need it in Step 4**

**What Railway provides:**
- Simple PostgreSQL setup
- $5 free credit monthly
- Easy scaling

**Option D: Vercel Postgres**
1. In your Vercel project dashboard
2. Go to Storage tab
3. Create Postgres database
4. Connection string will be auto-configured

**What Vercel Postgres provides:**
- Integrated with Vercel
- Automatic environment variable setup
- Seamless connection management

---

### Step 2: Push Code to GitHub (If Not Already Done)

**What this does:** Vercel deploys your application directly from your GitHub repository. Every time you push code to GitHub, Vercel can automatically build and deploy the new version.

**Why it's needed:**
- Vercel needs access to your source code
- Enables automatic deployments on code changes
- Provides version control and rollback capabilities

Your code should already be on GitHub at: `joyfuladam/re.git`

If you need to push latest changes:
```bash
git add -A
git commit -m "Prepare for deployment"
git push origin main
```

---

### Step 3: Connect Repository to Vercel

**What this does:** Links your GitHub repository to Vercel so Vercel can automatically deploy your code when you push changes.

**Why it's needed:**
- Vercel needs permission to access your GitHub repository
- Enables automatic deployments
- Sets up webhooks for continuous deployment

1. Go to https://vercel.com
2. Sign up/Log in with your GitHub account
3. Click "Add New Project"
4. Import your repository: `joyfuladam/re.git`
5. Vercel will auto-detect Next.js settings
6. **DO NOT deploy yet** - we need to add environment variables first

**What happens during connection:**
- Vercel creates a webhook in your GitHub repository
- Vercel gets read access to your code
- Vercel sets up build configuration automatically

---

### Step 4: Add Environment Variables to Vercel

**What environment variables are:** Configuration values that your application needs to run but shouldn't be hardcoded in your source code. They're stored securely in Vercel and injected into your application at runtime.

**Why they're needed:**
- Keep sensitive data (passwords, API keys) out of your code
- Allow different configurations for development, preview, and production
- Enable easy updates without changing code

1. In your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add each variable below (click "Add" for each one):

#### Required Variables:

**DATABASE_URL**
- **Key:** `DATABASE_URL`
- **Value:** (The connection string from Step 1)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

**What it does:**
- Tells Prisma (your database ORM) how to connect to your PostgreSQL database
- Contains: database host, port, username, password, and database name
- Format: `postgresql://user:password@host:port/database?sslmode=require`

**Why it's needed:**
- Without it, your app can't connect to the database
- All database operations (saving users, songs, etc.) will fail
- Prisma reads this variable to establish database connections

**Example format:**
```
postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

**Note:** If you linked Supabase directly to Vercel, you may see `POSTGRES_PRISMA_URL` instead. In that case, set `DATABASE_URL` to the same value as `POSTGRES_PRISMA_URL`.

---

**NEXTAUTH_SECRET**
- **Key:** `NEXTAUTH_SECRET`
- **Value:** `1M43nvkaX4LgfyIQ45ZCHUzXq5085bq7p3O4BfkyLUE=`
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

**What it does:**
- A secret key used to encrypt and sign authentication tokens (JWT)
- Ensures session cookies and tokens can't be tampered with
- Used by NextAuth.js to secure user authentication

**Why it's needed:**
- Without it, NextAuth can't create secure sessions
- Users won't be able to log in
- Session data would be vulnerable to tampering

**Security note:**
- This is a randomly generated secret (created with `openssl rand -base64 32`)
- Never commit this to Git (it's in `.gitignore`)
- Each environment should ideally have a unique secret
- If compromised, regenerate it and all users will need to log in again

---

**NEXTAUTH_URL**
- **Key:** `NEXTAUTH_URL`
- **Value:** `https://your-app-name.vercel.app` (Update after first deployment)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

**What it does:**
- Tells NextAuth.js what URL your application is running on
- Used to generate callback URLs for authentication
- Ensures OAuth providers (if you add them) redirect correctly

**Why it's needed:**
- NextAuth needs to know your app's URL to create proper redirect URLs
- Without it, authentication callbacks won't work
- OAuth providers (Google, GitHub, etc.) need to know where to send users after login

**Important:**
- Must match your actual deployment URL exactly
- For production: `https://your-app.vercel.app`
- For preview: Usually auto-detected, but can be set manually
- Must include `https://` (not `http://`)
- No trailing slash

**When to update:**
- After your first deployment (when you know your actual URL)
- If you change your custom domain
- After redeploying (if URL changed)

---

#### Optional Variables (for DocuSeal E-Signature):

**DOCUSEAL_API_KEY**
- **Key:** `DOCUSEAL_API_KEY`
- **Value:** (Your DocuSeal API key from Railway instance)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

**What it does:**
- Authenticates your application with DocuSeal API
- Allows your app to send contracts for e-signature
- Identifies your account to DocuSeal's servers

**Why it's needed:**
- Without it, you can't send contracts via DocuSeal
- Contract sending functionality will fail
- Required for e-signature features to work

**How to get it:**
1. Deploy DocuSeal on Railway: https://railway.com/template/IGoDnc
2. Access your DocuSeal instance
3. Go to Settings → API (or Integrations → API)
4. Generate and copy your API key

**Security note:**
- Treat this like a password - keep it secret
- Never commit to Git
- If exposed, regenerate it in DocuSeal dashboard

---

**DOCUSEAL_API_URL**
- **Key:** `DOCUSEAL_API_URL`
- **Value:** `https://your-docuseal.railway.app` (Your Railway DocuSeal instance URL)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

**What it does:**
- URL of your self-hosted DocuSeal instance
- Used to make API calls to DocuSeal
- Must be accessible from your application server

**Why it's needed:**
- Without it, your app doesn't know where to send API requests
- Contract sending functionality will fail
- Required for e-signature features to work

**Format:**
- Must include `https://`
- No trailing slash
- Example: `https://docuseal-production.railway.app`

---

**DOCUSEAL_WEBHOOK_SECRET**
- **Key:** `DOCUSEAL_WEBHOOK_SECRET`
- **Value:** (You'll get this in Step 8)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

**What it does:**
- Secret key used to verify that webhook requests are actually from DocuSeal
- Prevents unauthorized requests from updating contract statuses
- Ensures webhook security

**Why it's needed:**
- Without it, your webhook endpoint can't verify requests are legitimate
- Security risk: anyone could send fake webhook requests
- Required for automatic contract status updates

**How it works:**
- DocuSeal signs each webhook request with this secret
- Your app verifies the signature before processing the webhook
- If signature doesn't match, request is rejected

**When to set:**
- After configuring DocuSeal webhook (Step 8)
- DocuSeal generates this when you create a webhook

---

**CEO_EMAIL**
- **Key:** `CEO_EMAIL`
- **Value:** `adam@riverandember.com`
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

**What it does:**
- Email address of the CEO/Publisher who signs contracts as the first signer
- Used in contract generation to identify the company signer
- Appears in contract templates and DocuSeal signature requests

**Why it's needed:**
- Contracts require two signers: CEO/Publisher and Collaborator
- This identifies who signs on behalf of the company
- Must be a valid email address that can receive DocuSeal signature requests

**How it's used:**
- In contract generation: CEO and collaborator sign in parallel (no order required)
- Appears in contract metadata
- Used for DocuSeal API calls

**When to update:**
- If CEO email changes
- If using a different email for contract signing

---

### Step 5: Deploy to Vercel

**What this does:** Builds your application and makes it available on the internet at a public URL.

**Why it's needed:**
- Makes your app accessible to users
- Creates a production-ready version of your code
- Sets up hosting infrastructure

1. Go to **Deployments** tab
2. Click **"Deploy"** button (or it may auto-deploy)
3. Wait for build to complete (should take 2-3 minutes)
4. Once deployed, copy your app URL (e.g., `https://riverandemberapp-71zp.vercel.app`)

**What happens during deployment:**
1. Vercel clones your GitHub repository
2. Installs dependencies (`npm install`)
3. Generates Prisma Client (`prisma generate`)
4. Builds your Next.js application (`next build`)
5. Optimizes assets and code
6. Deploys to Vercel's global CDN
7. Makes your app available at a public URL

**Build process:**
- Compiles TypeScript to JavaScript
- Bundles React components
- Optimizes images and assets
- Creates serverless functions for API routes
- Generates static pages where possible

**After deployment:**
- Your app is live and accessible
- You get a URL like `https://your-app.vercel.app`
- Changes are automatically deployed on future Git pushes

---

### Step 6: Update NEXTAUTH_URL

**What this does:** Updates the authentication URL to match your actual deployment URL so authentication works correctly.

**Why it's needed:**
- NextAuth needs the correct URL to generate authentication callbacks
- Without the correct URL, login/logout won't work properly
- OAuth providers (if added) need the correct redirect URL

1. Go back to **Settings** → **Environment Variables**
2. Find `NEXTAUTH_URL`
3. Click **Edit**
4. Update value to your actual Vercel URL: `https://your-actual-url.vercel.app`
5. Click **Save**
6. **Redeploy** your application (go to Deployments → click "Redeploy" on latest)

**Important details:**
- Must be the exact URL (case-sensitive)
- Must include `https://`
- No trailing slash
- Should match what users see in their browser

**Why redeploy is needed:**
- Environment variables are injected at build time
- Changing them requires a new build
- Old deployments still use the old value

---

### Step 7: Run Database Migrations

**What this does:** Creates all the database tables, columns, and relationships defined in your Prisma schema in your production database.

**Why it's needed:**
- Your database starts empty
- Migrations create the structure (tables, columns, indexes)
- Without migrations, your app can't save or retrieve data

**What migrations do:**
- Create tables (Collaborator, Song, Contract, etc.)
- Create columns with correct data types
- Set up relationships between tables
- Create indexes for performance
- Set up constraints (unique, foreign keys)

After deployment, you need to create the database tables:

**Option A: Using Supabase CLI (Recommended if using Supabase)**
```bash
# Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push schema to production database
supabase db push
```

**What this does:**
- Uses Supabase CLI to connect to your database
- Pushes your Prisma schema directly
- Creates all tables and relationships

**Option B: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Pull environment variables (includes DATABASE_URL)
vercel env pull .env.production

# Run migrations
npx prisma migrate deploy
```

**What this does:**
- Downloads your Vercel environment variables locally
- Uses Prisma to run migrations
- Applies all pending migrations to production

**Option C: Direct Connection**
```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy
```

**What this does:**
- Sets the database URL in your terminal session
- Runs Prisma migrations directly
- Applies schema changes to production

**Option D: Using Prisma Studio (GUI)**
```bash
# Set DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Open Prisma Studio
npx prisma studio
# Then manually run migrations from the UI
```

**What this does:**
- Opens a web interface to your database
- Lets you view and edit data
- Can manually verify tables were created

**Important:**
- Only run migrations once (unless schema changes)
- Migrations are idempotent (safe to run multiple times)
- Always backup production data before major migrations

---

### Step 8: Configure DocuSeal Webhook (Optional)

**What this does:** Sets up automatic updates when contracts are signed or declined, so your app knows the status without manual checking.

**Why it's needed:**
- Without webhooks, you'd have to manually check contract status
- Webhooks provide real-time updates when signers complete contracts
- Automatically updates contract status in your database

**How webhooks work:**
1. DocuSeal sends HTTP POST request to your webhook URL when events occur
2. Your app receives the webhook and verifies it's from DocuSeal
3. Your app updates the contract status in the database
4. Your dashboard shows updated status automatically

If you're using e-signatures:

1. Log into your DocuSeal instance (Railway deployment)
2. Go to **Settings** → **Webhooks** (or **Integrations** → **Webhooks**)
3. Click **"Add Webhook"** or **"Create Webhook"**
4. Webhook URL: `https://your-app.vercel.app/api/esignature/webhook`
5. Select events: 
   - `submission.completed` - When contract is fully signed
   - `submission.declined` - When signer declines
   - `submission.canceled` - When request is canceled
6. Click **"Save"** or **"Create"**
7. Copy the **Webhook Secret** that's generated
8. Go back to Vercel → **Settings** → **Environment Variables**
9. Update `DOCUSEAL_WEBHOOK_SECRET` with the secret you copied
10. **Redeploy** your application

**What each event means:**
- **completed**: All parties have signed, contract is complete
- **declined**: A signer refused to sign the contract
- **canceled**: The signature request was canceled before completion

**Security:**
- Webhook secret ensures requests are from DocuSeal
- Your app verifies the signature before processing
- Prevents unauthorized status updates

---

### Step 9: Test Your Deployment

**What this does:** Verifies that all components of your application are working correctly in production.

**Why it's needed:**
- Catches issues before users encounter them
- Verifies database connections work
- Ensures authentication functions properly
- Confirms all features are accessible

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try to register a new account
3. Log in and test the dashboard
4. Create a test song and collaborator
5. Test contract generation (if DocuSeal is configured)

**What to test:**
- **Registration**: Can you create a new account?
- **Login**: Can you log in with your account?
- **Dashboard**: Does the dashboard load and show data?
- **Data Creation**: Can you create songs and collaborators?
- **Contract Generation**: Can you preview contracts?
- **Contract Sending**: Can you send contracts via DocuSeal? (if configured)

**Common issues to check:**
- Database connection errors
- Authentication not working
- Missing environment variables
- API routes returning errors

---

### Step 10: Set Up Your First Admin Account

**What this does:** Gives your account administrator privileges so you can manage the application.

**Why it's needed:**
- New accounts default to "collaborator" role
- Only admins can create/manage other collaborators
- Only admins can access admin features
- You need admin access to fully manage the app

1. Register a new account through the app
2. The first account will need to be manually set as admin in the database
3. Connect to your database and run:
   ```sql
   UPDATE "Collaborator" SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
4. Or use Prisma Studio to edit the role

**How to update via Supabase Dashboard:**
1. Go to Supabase Dashboard → Table Editor
2. Find the "Collaborator" table
3. Find your user record (by email)
4. Click to edit
5. Change "role" from "collaborator" to "admin"
6. Save

**How to update via SQL:**
1. Go to Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   UPDATE "Collaborator" 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

**What admin role enables:**
- Create and manage collaborators
- Access admin dashboard
- Manage all songs and contracts
- Set user roles
- Full system access

---

## 🎉 You're Done!

Your application should now be live on Vercel!

**What you've accomplished:**
- ✅ Deployed your application to production
- ✅ Connected to a production database
- ✅ Set up authentication
- ✅ Configured e-signatures (if applicable)
- ✅ Set up automatic deployments

**Next steps:**
- Monitor your application for errors
- Set up custom domain (optional)
- Configure backups for your database
- Set up monitoring and alerts

---

## 🔧 Troubleshooting

### Build Fails

**Symptoms:** Deployment shows "Build Failed" in Vercel dashboard

**Possible causes:**
- Missing environment variables
- TypeScript errors
- Missing dependencies
- Database connection issues during build

**Solutions:**
- Check build logs in Vercel dashboard for specific errors
- Ensure all required environment variables are set
- Verify `DATABASE_URL` is correct
- Check for TypeScript errors locally first
- Ensure `package.json` has all dependencies

**How to check:**
1. Go to Vercel → Deployments
2. Click on failed deployment
3. View build logs
4. Look for error messages

---

### Database Connection Errors

**Symptoms:** 
- "Can't reach database server" errors
- "Connection timeout" errors
- Registration/login fails

**Possible causes:**
- Incorrect `DATABASE_URL` format
- Database not allowing connections from Vercel IPs
- Missing SSL parameters
- Database server down

**Solutions:**
- Verify `DATABASE_URL` format is correct
- Check if database allows connections from Vercel IPs (some require IP whitelisting)
- Ensure connection string includes `?sslmode=require` for Supabase
- Try using connection pooler (port 6543) instead of direct connection (port 5432)
- Check database provider status page

**Connection string formats:**
- Direct: `postgresql://user:pass@host:5432/db?sslmode=require`
- Pooler: `postgresql://user:pass@host:6543/db?pgbouncer=true&sslmode=require`

**If using Supabase:**
- Use connection pooler for serverless (Vercel)
- Check Supabase dashboard for connection issues
- Verify project is active and not paused

---

### Authentication Not Working

**Symptoms:**
- Can't log in
- Session not persisting
- Redirect loops

**Possible causes:**
- `NEXTAUTH_URL` doesn't match actual URL
- `NEXTAUTH_SECRET` missing or incorrect
- Cookie domain issues

**Solutions:**
- Verify `NEXTAUTH_URL` matches your actual Vercel URL exactly
- Check `NEXTAUTH_SECRET` is set correctly
- Redeploy after changing environment variables
- Clear browser cookies and try again
- Check browser console for errors

**Common mistakes:**
- `NEXTAUTH_URL` has trailing slash (shouldn't)
- `NEXTAUTH_URL` uses `http://` instead of `https://`
- `NEXTAUTH_URL` doesn't match actual deployment URL

---

### DocuSeal Not Working

**Symptoms:**
- Can't send contracts
- "API key invalid" errors
- Contracts not appearing in DocuSeal

**Possible causes:**
- Incorrect `DOCUSEAL_API_KEY`
- Incorrect `DOCUSEAL_API_URL`
- DocuSeal instance not accessible
- Webhook not configured

**Solutions:**
- Verify `DOCUSEAL_API_KEY` is correct in DocuSeal dashboard
- Check `DOCUSEAL_API_URL` is correct and accessible
- Ensure DocuSeal instance is running on Railway
- Ensure webhook is configured if using status updates
- Check DocuSeal API status in your instance
- Verify email addresses are valid
- Check Railway logs for DocuSeal service errors

---

## 📞 Need Help?

**Resources:**
- Check build logs in Vercel dashboard for specific error messages
- Review Vercel documentation: https://vercel.com/docs
- Check Supabase documentation: https://supabase.com/docs
- Review Prisma documentation: https://www.prisma.io/docs

**Common places to check:**
1. Vercel deployment logs
2. Browser console (F12)
3. Network tab (F12 → Network)
4. Database connection status
5. Environment variables in Vercel dashboard

---

## 📝 Environment Variables Summary

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ Yes | Database connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | ✅ Yes | Authentication encryption key | `base64-encoded-secret` |
| `NEXTAUTH_URL` | ✅ Yes | Application base URL | `https://app.vercel.app` |
| `DOCUSEAL_API_KEY` | ⚠️ Optional | DocuSeal API authentication | `api-key-string` |
| `DOCUSEAL_API_URL` | ⚠️ Optional | DocuSeal instance URL | `https://your-docuseal.railway.app` |
| `DOCUSEAL_WEBHOOK_SECRET` | ⚠️ Optional | Webhook verification secret | `webhook-secret` |
| `CEO_EMAIL` | ⚠️ Optional | CEO email for contracts | `ceo@company.com` |

---

## 🔐 Security Best Practices

1. **Never commit secrets to Git** - All secrets are in `.gitignore`
2. **Use different secrets for each environment** - Production, Preview, Development
3. **Rotate secrets periodically** - Especially if exposed
4. **Use connection pooling** - Better for serverless, more secure
5. **Enable SSL for database** - Always use `sslmode=require`
6. **Restrict database access** - Use IP whitelisting if possible
7. **Monitor for exposed secrets** - Check logs regularly

---

## 🚀 Performance Tips

1. **Use connection pooling** - Essential for serverless (Vercel)
2. **Enable Prisma query logging** - Helps identify slow queries
3. **Use database indexes** - Already set up in schema
4. **Monitor database connections** - Watch for connection pool exhaustion
5. **Cache frequently accessed data** - Consider Redis for high traffic

---

## 📚 Additional Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **Prisma Documentation:** https://www.prisma.io/docs
- **Supabase Documentation:** https://supabase.com/docs
- **DocuSeal API Docs:** https://www.docuseal.com/docs/api
- **DocuSeal Railway Deployment:** https://railway.com/template/IGoDnc

---

*Last updated: December 2024*
