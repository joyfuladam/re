# Quick Deployment Reference

## 🚀 Fast Track Deployment

### 1. Get PostgreSQL Database
- **Supabase**: https://supabase.com (Free tier)
- **Neon**: https://neon.tech (Free tier)
- **Railway**: https://railway.app (Free tier)

Copy the connection string (DATABASE_URL)

### 2. Deploy to Vercel
1. Go to https://vercel.com
2. Import GitHub repo: `joyfuladam/riverandemberapp`
3. **Add Environment Variables** (Settings → Environment Variables):

```
DATABASE_URL=your-postgres-connection-string
NEXTAUTH_SECRET=1M43nvkaX4LgfyIQ45ZCHUzXq5085bq7p3O4BfkyLUE=
NEXTAUTH_URL=https://your-app.vercel.app (update after first deploy)
HELLOSIGN_API_KEY=31d7779d63c8b9aab6c8303815e2e5914314d7fc650e6c2f5c52d0da4b4a58b6
HELLOSIGN_TEST_MODE=false
CEO_EMAIL=adam@riverandember.com
```

4. Click **Deploy**

### 3. Update NEXTAUTH_URL
After first deployment:
1. Copy your Vercel URL
2. Update `NEXTAUTH_URL` in Vercel environment variables
3. Redeploy

### 4. Run Migrations
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link
vercel login
vercel link

# Pull env vars
vercel env pull .env.production

# Run migrations
./scripts/migrate-production.sh
```

### 5. Configure HelloSign Webhook (Optional)
1. HelloSign Dashboard → Settings → API → Webhooks
2. URL: `https://your-app.vercel.app/api/esignature/webhook`
3. Copy webhook secret
4. Add `HELLOSIGN_WEBHOOK_SECRET` to Vercel
5. Redeploy

## ✅ Done!

Your app is live at: `https://your-app.vercel.app`

For detailed steps, see: **DEPLOYMENT_CHECKLIST.md**




