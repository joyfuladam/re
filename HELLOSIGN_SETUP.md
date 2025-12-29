# HelloSign E-Signature Setup Guide

This guide walks you through setting up HelloSign/Dropbox Sign integration for contract e-signatures.

## What's Been Implemented

✅ PDF generation from HTML contracts using Puppeteer  
✅ HelloSign SDK client integration  
✅ Contract sending via HelloSign API  
✅ Webhook endpoint for signature status updates  
✅ Contract status display in the UI  
✅ Status badges and button states (disabled when sent/signed)  

## What You Need to Do Manually

### 1. Create a HelloSign/Dropbox Sign Account

- Visit https://www.hellosign.com/ or https://www.dropbox.com/sign
- Sign up for an account (free tier available)
- Complete account verification

### 2. Get Your API Key

1. Log into your HelloSign/Dropbox Sign account
2. Navigate to **Settings** → **API**
3. If you don't have an API key yet:
   - Click "Create API Key" or "Generate API Key"
   - Copy the API key (it starts with a long string of characters)
4. Add to your `.env` file:
   ```env
   HELLOSIGN_API_KEY="your-api-key-here"
   ```

### 3. Set Up Webhook (For Production)

Webhooks allow HelloSign to notify your app when contracts are signed, declined, or canceled.

**For Production:**
1. In HelloSign dashboard, go to **Settings** → **API** → **Event Callbacks**
2. Click "Add Callback URL"
3. Enter your production URL: `https://your-domain.com/api/esignature/webhook`
4. Copy the webhook secret that's generated
5. Add to your `.env` file:
   ```env
   HELLOSIGN_WEBHOOK_SECRET="your-webhook-secret-here"
   ```

**For Local Testing (Optional):**
1. Install ngrok: `brew install ngrok` (macOS) or download from https://ngrok.com/
2. Start your Next.js dev server: `npm run dev`
3. In a new terminal, run: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. In HelloSign dashboard, add callback URL: `https://abc123.ngrok.io/api/esignature/webhook`
6. Copy the webhook secret and add to `.env`:
   ```env
   HELLOSIGN_WEBHOOK_SECRET="your-webhook-secret-here"
   ```

**Note:** Webhook secret is optional for local testing but **highly recommended for production** to verify webhook requests are from HelloSign.

### 4. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Create a song and set up splits (lock publishing and master splits)

3. Navigate to the song detail page

4. Click "Preview" on a contract to verify it generates correctly

5. Click "Send" to send a contract via HelloSign:
   - The contract will be converted to PDF
   - Sent to the collaborator's email address
   - Status will update to "Sent" in the UI

6. Check the collaborator's email for the HelloSign signature request

7. After signing (or declining), the webhook will update the contract status automatically

## Environment Variables Summary

Add these to your `.env` file:

```env
# Required for e-signature functionality
HELLOSIGN_API_KEY="your-api-key-here"

# Optional but recommended for production
HELLOSIGN_WEBHOOK_SECRET="your-webhook-secret-here"
```

## Testing Without Real Signatures

HelloSign supports test mode. The implementation automatically uses test mode when `NODE_ENV !== "production"`, so:

- Test contracts won't count toward your HelloSign usage
- Signatures in test mode are not legally binding
- Perfect for development and testing

**⚠️ Important Test Mode Restriction:**
- In test mode, HelloSign only allows sending emails to addresses within your HelloSign account's domain
- If you need to test with external email addresses, you can disable test mode by setting `HELLOSIGN_TEST_MODE=false` in your `.env` file
- Disabling test mode will use real API credits, so use it carefully

## Troubleshooting

### "HelloSign API key not configured" error
- Check that `HELLOSIGN_API_KEY` is set in your `.env` file
- Restart your dev server after adding the key
- Verify the API key in HelloSign dashboard

### Webhook not updating contract status
- Check that the webhook URL is correctly configured in HelloSign dashboard
- Verify `HELLOSIGN_WEBHOOK_SECRET` matches the secret in HelloSign dashboard
- Check server logs for webhook errors
- For local testing, ensure ngrok is running and the URL is updated in HelloSign

### PDF generation fails
- Ensure Puppeteer is installed: `npm install puppeteer`
- On Linux, you may need additional dependencies (Puppeteer will prompt you)

### "Contract has already been sent" error
- This is expected behavior - contracts can only be sent once
- Generate a new contract or reset the contract status in the database if needed

## Next Steps

After setting up HelloSign:

1. ✅ Test contract generation and preview
2. ✅ Test sending contracts via HelloSign
3. ✅ Test webhook updates (sign a test contract)
4. ✅ Verify status updates in the UI
5. ✅ Test with multiple collaborators and contract types
6. ✅ Set up production webhook URL before deploying

## Production Deployment

Before deploying to production:

1. Set `NODE_ENV=production` in your production environment
2. Configure production webhook URL in HelloSign dashboard
3. Set `HELLOSIGN_WEBHOOK_SECRET` in production environment variables
4. Ensure `HELLOSIGN_API_KEY` is set in production
5. Test webhook connectivity from production URL

