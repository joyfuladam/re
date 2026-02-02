# DocuSeal E-Signature Setup Guide

This guide walks you through setting up DocuSeal integration for contract e-signatures.

## What's Been Implemented

✅ PDF generation from HTML contracts using Puppeteer  
✅ DocuSeal API client integration  
✅ Contract sending via DocuSeal API  
✅ Webhook endpoint for signature status updates  
✅ Contract status display in the UI  
✅ Status badges and button states (disabled when sent/signed)  
✅ Admin status display with refresh capability

## What You Need to Do Manually

### 1. Deploy DocuSeal on Railway

1. Visit https://railway.com/template/IGoDnc
2. Click "Deploy on Railway" (or use the one-click deploy button)
3. Railway will automatically provision:
   - DocuSeal application container
   - PostgreSQL database
   - Redis (if included in template)
4. Wait for deployment to complete (usually 2-5 minutes)
5. Note your DocuSeal instance URL (e.g., `https://your-docuseal.railway.app`)

### 2. Get Your API Key

1. Access your DocuSeal instance URL
2. Complete the initial setup (create admin account)
3. Navigate to **Settings** → **API** (or **Integrations** → **API**)
4. Generate an API key
5. Copy the API key
6. Add to your `.env` file:
   ```env
   DOCUSEAL_API_KEY="your-api-key-here"
   DOCUSEAL_API_URL="https://your-docuseal.railway.app"
   ```

### 3. Set Up Webhook (For Production)

Webhooks allow DocuSeal to notify your app when contracts are signed, declined, or canceled.

**For Production:**
1. In DocuSeal dashboard, go to **Settings** → **Webhooks** (or **Integrations** → **Webhooks**)
2. Click "Add Webhook" or "Create Webhook"
3. Enter your production URL: `https://your-domain.com/api/esignature/webhook`
4. Select events to listen for:
   - `submission.completed` - When contract is fully signed
   - `submission.declined` - When signer declines
   - `submission.canceled` - When request is canceled
5. Copy the webhook secret that's generated
6. Add to your `.env` file:
   ```env
   DOCUSEAL_WEBHOOK_SECRET="your-webhook-secret-here"
   ```

**For Local Testing (Optional):**
1. Install ngrok: `brew install ngrok` (macOS) or download from https://ngrok.com/
2. Start your Next.js dev server: `npm run dev`
3. In a new terminal, run: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. In DocuSeal dashboard, add webhook URL: `https://abc123.ngrok.io/api/esignature/webhook`
6. Copy the webhook secret and add to `.env`:
   ```env
   DOCUSEAL_WEBHOOK_SECRET="your-webhook-secret-here"
   ```

**Note:** Webhook secret is optional for local testing but **highly recommended for production** to verify webhook requests are from DocuSeal.

### 4. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Create a song and set up splits (lock publishing and master splits)

3. Navigate to the song detail page

4. Click "Preview" on a contract to verify it generates correctly

5. Click "Send" to send a contract via DocuSeal:
   - The contract will be converted to PDF
   - Sent to the collaborator's email address (and CEO email if configured)
   - Status will update to "Sent" in the UI

6. Check the collaborator's email for the DocuSeal signature request

7. After signing (or declining), the webhook will update the contract status automatically

8. As an admin, you can see the e-signature status next to contract buttons and refresh it manually

## Environment Variables Summary

Add these to your `.env` file:

```env
# Required for e-signature functionality
DOCUSEAL_API_KEY="your-api-key-here"
DOCUSEAL_API_URL="https://your-docuseal.railway.app"

# Optional but recommended for production
DOCUSEAL_WEBHOOK_SECRET="your-webhook-secret-here"
```

## Key Features

- **Parallel Signing**: Both CEO and collaborator can sign simultaneously (no order required)
- **Self-Hosted**: Full control over your documents and data
- **No Test Mode**: DocuSeal doesn't have a test mode concept - all signatures are real
- **Status Tracking**: Real-time status updates via webhooks and manual refresh

## Troubleshooting

### "DocuSeal API key not configured" error
- Check that `DOCUSEAL_API_KEY` is set in your `.env` file
- Check that `DOCUSEAL_API_URL` is set correctly
- Restart your dev server after adding the keys
- Verify the API key in DocuSeal dashboard

### "DocuSeal API URL not configured" error
- Ensure `DOCUSEAL_API_URL` is set to your Railway DocuSeal instance URL
- URL should include `https://` and no trailing slash
- Verify the URL is accessible from your server

### Webhook not updating contract status
- Check that the webhook URL is correctly configured in DocuSeal dashboard
- Verify `DOCUSEAL_WEBHOOK_SECRET` matches the secret in DocuSeal dashboard
- Check server logs for webhook errors
- For local testing, ensure ngrok is running and the URL is updated in DocuSeal
- Verify webhook events are enabled (submission.completed, submission.declined, submission.canceled)

### PDF generation fails
- Ensure Puppeteer is installed: `npm install puppeteer`
- On Linux, you may need additional dependencies (Puppeteer will prompt you)

### "Contract has already been signed" error
- This is expected behavior - signed contracts cannot be re-sent
- Generate a new contract or reset the contract status in the database if needed

### Template/Submission creation fails
- Verify your DocuSeal API URL is correct and accessible
- Check that the API key has proper permissions
- Review DocuSeal API documentation for current endpoint structure
- Check server logs for detailed error messages

## Next Steps

After setting up DocuSeal:

1. ✅ Test contract generation and preview
2. ✅ Test sending contracts via DocuSeal
3. ✅ Test webhook updates (sign a test contract)
4. ✅ Verify status updates in the UI
5. ✅ Test with multiple collaborators and contract types
6. ✅ Test parallel signing (CEO + collaborator)
7. ✅ Test admin status display and refresh
8. ✅ Set up production webhook URL before deploying

## Production Deployment

Before deploying to production:

1. Ensure DocuSeal instance is accessible from your production server
2. Configure production webhook URL in DocuSeal dashboard
3. Set `DOCUSEAL_WEBHOOK_SECRET` in production environment variables
4. Ensure `DOCUSEAL_API_KEY` and `DOCUSEAL_API_URL` are set in production
5. Test webhook connectivity from production URL
6. Verify SSL certificates are valid for your DocuSeal instance

## Updating DocuSeal on Railway

To update your DocuSeal instance:

1. Go to Railway dashboard
2. Navigate to your DocuSeal service
3. Go to **Deployments** tab
4. Click **"Redeploy"** from the last active commit dropdown menu
5. Wait for deployment to complete

## Migration from HelloSign

If you're migrating from HelloSign:

1. Existing contracts with HelloSign IDs will continue to work
2. New contracts will use DocuSeal
3. You can keep both systems running during transition
4. Update environment variables to use DocuSeal credentials
5. Update webhook configuration in DocuSeal dashboard
