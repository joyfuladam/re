# SignWell Webhook Setup Guide

Based on the [SignWell API documentation](https://developers.signwell.com/reference/get_api-v1-hooks-1), here's how to set up webhooks for your application.

## Webhook Endpoint

Your webhook endpoint is already configured at:
```
https://river-ember-app-production.up.railway.app/api/esignature/webhook
```

## Setup Methods

### Method 1: Via SignWell Dashboard (Recommended)

1. **Log into SignWell Dashboard**
   - Go to https://www.signwell.com/
   - Log into your account

2. **Navigate to Webhooks Settings**
   - Go to **Settings** → **Webhooks** (or **Integrations** → **Webhooks**)
   - Or access directly via API settings

3. **Create New Webhook**
   - Click **"Add Webhook"** or **"Create Webhook"**
   - Enter webhook URL: `https://river-ember-app-production.up.railway.app/api/esignature/webhook`
   - Select events to subscribe to:
     - `document.completed` - When document is fully signed
     - `document.signed` - When document is signed
     - `document.declined` - When document is declined
     - `document.canceled` - When document is canceled
     - `document.sent` - When document is sent

4. **Save Webhook Secret**
   - SignWell will generate a webhook secret
   - Copy this secret
   - Update Railway environment variable:
     ```bash
     railway variables set SIGNWELL_WEBHOOK_SECRET="your-webhook-secret-here"
     ```

### Method 2: Via SignWell API

If the dashboard doesn't have webhook settings, you can create it via API:

```bash
curl -X POST https://www.signwell.com/api/v1/hooks/ \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "accept: application/json" \
  -d '{
    "callback_url": "https://river-ember-app-production.up.railway.app/api/esignature/webhook"
  }'
```

**Note:** 
- Replace `YOUR_API_KEY` with your actual SignWell API key
- SignWell uses `X-Api-Key` header (not `Authorization: Bearer`)
- The parameter is `callback_url` (not `url`)

### Method 3: Using the Setup Script

If the API endpoint structure is confirmed, you can use the provided script:

```bash
SIGNWELL_API_KEY="YWNjZXNzOjQ0ODUwZDBjYmY5ZmNkN2U4ZmYwZWE0YTU2M2MxN2E0" \
npx tsx scripts/setup-signwell-webhook.ts \
  https://river-ember-app-production.up.railway.app/api/esignature/webhook
```

## Verify Webhook Setup

1. **List existing webhooks**:
   ```bash
   curl -X GET https://www.signwell.com/api/v1/hooks/ \
     -H "X-Api-Key: YOUR_API_KEY" \
     -H "accept: application/json"
   ```

2. **Test webhook** by sending a test document through SignWell

3. **Check logs** in Railway to see if webhook events are being received

## Webhook Security

Your webhook endpoint already includes signature verification:

- **Header**: `x-signwell-signature` or `x-signature`
- **Secret**: Stored in `SIGNWELL_WEBHOOK_SECRET` environment variable
- **Algorithm**: HMAC SHA-256

The webhook handler will verify that incoming requests are from SignWell using the secret.

## Webhook Events Handled

Your application handles these events:

- ✅ `document.completed` / `document.signed` → Updates contract status to "signed"
- ✅ `document.declined` → Updates contract status to "declined"  
- ✅ `document.canceled` → Resets contract status to "pending"

## Troubleshooting

### Webhook not receiving events

1. **Verify webhook URL is accessible**
   ```bash
   curl https://river-ember-app-production.up.railway.app/api/esignature/webhook
   ```
   Should return: `{"status":"webhook endpoint active"}`

2. **Check Railway logs** for webhook requests:
   ```bash
   railway logs
   ```

3. **Verify webhook secret** matches in both:
   - SignWell dashboard/webhook configuration
   - Railway `SIGNWELL_WEBHOOK_SECRET` environment variable

4. **Test with a sample webhook** (if SignWell provides test functionality)

### Webhook signature verification failing

- Ensure `SIGNWELL_WEBHOOK_SECRET` in Railway matches the secret in SignWell
- Check that the webhook handler is reading the correct header (`x-signwell-signature`)

## Next Steps

1. ✅ Webhook endpoint is configured in your app
2. ⏳ Create webhook in SignWell dashboard or via API
3. ⏳ Set webhook secret in Railway (if different from current)
4. ⏳ Test by sending a contract and verifying webhook events are received

## Reference

- [SignWell API Documentation](https://developers.signwell.com/reference/getting-started-with-your-api-1)
- [SignWell Webhooks API](https://developers.signwell.com/reference/get_api-v1-hooks-1)
