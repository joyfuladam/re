# Vercel Deployment Checklist

Follow these steps in order to deploy your application to Vercel.

## ✅ Automated Steps (Already Done)

- [x] Generated NEXTAUTH_SECRET
- [x] Created environment variable templates
- [x] Created deployment scripts
- [x] Verified build configuration

## 📋 Manual Steps

### Step 1: Set Up PostgreSQL Database

Choose one of these providers (all have free tiers):

**Option A: Supabase (Recommended - Easiest)**
1. Go to https://supabase.com
2. Sign up for free account
3. Create a new project
4. Go to Settings → Database
5. Copy the "Connection string" (URI format)
6. **Save this DATABASE_URL - you'll need it in Step 3**

**Option B: Neon**
1. Go to https://neon.tech
2. Sign up for free account
3. Create a new project
4. Copy the connection string
5. **Save this DATABASE_URL - you'll need it in Step 3**

**Option C: Railway**
1. Go to https://railway.app
2. Sign up for free account
3. Create new project → Add PostgreSQL
4. Copy the connection string
5. **Save this DATABASE_URL - you'll need it in Step 3**

**Option D: Vercel Postgres**
1. In your Vercel project dashboard
2. Go to Storage tab
3. Create Postgres database
4. Connection string will be auto-configured

---

### Step 2: Push Code to GitHub (If Not Already Done)

Your code should already be on GitHub at: `joyfuladam/riverandemberapp`

If you need to push latest changes:
```bash
git add -A
git commit -m "Prepare for deployment"
git push origin main
```

---

### Step 3: Connect Repository to Vercel

1. Go to https://vercel.com
2. Sign up/Log in with your GitHub account
3. Click "Add New Project"
4. Import your repository: `joyfuladam/riverandemberapp`
5. Vercel will auto-detect Next.js settings
6. **DO NOT deploy yet** - we need to add environment variables first

---

### Step 4: Add Environment Variables to Vercel

1. In your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add each variable below (click "Add" for each one):

#### Required Variables:

**DATABASE_URL**
- Key: `DATABASE_URL`
- Value: (The connection string from Step 1)
- Environments: ✅ Production, ✅ Preview, ✅ Development

**NEXTAUTH_SECRET**
- Key: `NEXTAUTH_SECRET`
- Value: `1M43nvkaX4LgfyIQ45ZCHUzXq5085bq7p3O4BfkyLUE=`
- Environments: ✅ Production, ✅ Preview, ✅ Development

**NEXTAUTH_URL**
- Key: `NEXTAUTH_URL`
- Value: `https://your-app-name.vercel.app` (Update after first deployment)
- Environments: ✅ Production, ✅ Preview, ✅ Development

#### Optional Variables (for HelloSign):

**HELLOSIGN_API_KEY**
- Key: `HELLOSIGN_API_KEY`
- Value: `31d7779d63c8b9aab6c8303815e2e5914314d7fc650e6c2f5c52d0da4b4a58b6`
- Environments: ✅ Production, ✅ Preview, ✅ Development

**HELLOSIGN_WEBHOOK_SECRET**
- Key: `HELLOSIGN_WEBHOOK_SECRET`
- Value: (You'll get this in Step 6)
- Environments: ✅ Production, ✅ Preview, ✅ Development

**HELLOSIGN_TEST_MODE**
- Key: `HELLOSIGN_TEST_MODE`
- Value: `false` (or `true` for testing)
- Environments: ✅ Production, ✅ Preview, ✅ Development

**CEO_EMAIL**
- Key: `CEO_EMAIL`
- Value: `adam@riverandember.com`
- Environments: ✅ Production, ✅ Preview, ✅ Development

---

### Step 5: Deploy to Vercel

1. Go to **Deployments** tab
2. Click **"Deploy"** button (or it may auto-deploy)
3. Wait for build to complete (should take 2-3 minutes)
4. Once deployed, copy your app URL (e.g., `https://riverandemberapp.vercel.app`)

---

### Step 6: Update NEXTAUTH_URL

1. Go back to **Settings** → **Environment Variables**
2. Find `NEXTAUTH_URL`
3. Click **Edit**
4. Update value to your actual Vercel URL: `https://your-actual-url.vercel.app`
5. Click **Save**
6. **Redeploy** your application (go to Deployments → click "Redeploy" on latest)

---

### Step 7: Run Database Migrations

After deployment, you need to create the database tables:

**Option A: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.production

# Run migrations
npx prisma migrate deploy
```

**Option B: Direct Connection**
```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy
```

**Option C: Using Prisma Studio (GUI)**
```bash
# Set DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Open Prisma Studio
npx prisma studio
# Then manually run migrations from the UI
```

---

### Step 8: Configure HelloSign Webhook (Optional)

If you're using e-signatures:

1. Log into HelloSign Dashboard: https://app.hellosign.com
2. Go to **Settings** → **API** → **Webhooks**
3. Click **"Add Webhook"**
4. Webhook URL: `https://your-app.vercel.app/api/esignature/webhook`
5. Select events: `signature_request_signed`, `signature_request_declined`, `signature_request_canceled`
6. Click **"Save"**
7. Copy the **Webhook Secret** that's generated
8. Go back to Vercel → **Settings** → **Environment Variables**
9. Update `HELLOSIGN_WEBHOOK_SECRET` with the secret you copied
10. **Redeploy** your application

---

### Step 9: Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try to register a new account
3. Log in and test the dashboard
4. Create a test song and collaborator
5. Test contract generation (if HelloSign is configured)

---

### Step 10: Set Up Your First Admin Account

1. Register a new account through the app
2. The first account will need to be manually set as admin in the database
3. Connect to your database and run:
   ```sql
   UPDATE "Collaborator" SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
4. Or use Prisma Studio to edit the role

---

## 🎉 You're Done!

Your application should now be live on Vercel!

## 🔧 Troubleshooting

**Build Fails:**
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `DATABASE_URL` is correct

**Database Connection Errors:**
- Verify `DATABASE_URL` format is correct
- Check if database allows connections from Vercel IPs
- Some providers require IP whitelisting

**Authentication Not Working:**
- Verify `NEXTAUTH_URL` matches your actual Vercel URL
- Check `NEXTAUTH_SECRET` is set correctly
- Redeploy after changing environment variables

**HelloSign Not Working:**
- Verify `HELLOSIGN_API_KEY` is correct
- Check `HELLOSIGN_TEST_MODE` setting
- Ensure webhook URL is accessible

## 📞 Need Help?

Check the build logs in Vercel dashboard for specific error messages.


