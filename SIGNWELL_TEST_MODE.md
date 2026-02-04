# SignWell Test Mode Guide

## Overview

Test mode allows you to test SignWell integration without sending real signature requests or consuming API credits.

**Official Documentation:** [SignWell API - Test Mode](https://developers.signwell.com/reference/getting-started-with-your-api-1#test-mode)

## How Test Mode Works

SignWell test mode is controlled via the `SIGNWELL_TEST_MODE` environment variable:

- **Default**: `true` (test mode enabled) - safer for development
- **Production**: Set to `"false"` to disable test mode

## Setting Up Test Mode

### Option 1: Use Separate Test API Key (Recommended)

1. **Get Test API Key from SignWell**
   - Log into your SignWell account
   - Navigate to Settings → API
   - Generate or copy your **test API key** (separate from production key)

2. **Set Test API Key Locally**
   ```bash
   # In your .env file
   SIGNWELL_API_KEY="your-test-api-key-here"
   SIGNWELL_TEST_MODE="true"
   ```

3. **Set Production API Key in Railway**
   ```bash
   railway variables set SIGNWELL_API_KEY="your-production-api-key-here"
   railway variables set SIGNWELL_TEST_MODE="false"
   ```

### Option 2: Use Environment Variable Flag

1. **Local Development** (`.env` file):
   ```bash
   SIGNWELL_API_KEY="your-api-key"
   SIGNWELL_TEST_MODE="true"  # Enable test mode
   ```

2. **Production** (Railway):
   ```bash
   railway variables set SIGNWELL_TEST_MODE="false"  # Disable test mode
   ```

## Test Mode Behavior

When test mode is enabled, the `test_mode: true` parameter is included in the API request per [SignWell's documentation](https://developers.signwell.com/reference/getting-started-with-your-api-1#test-mode):

- ✅ `test_mode: true` parameter is sent with document creation requests
- ✅ Logs will indicate test mode is active
- ✅ Documents are created in test environment
- ✅ No real signature requests are sent to recipients
- ✅ No API credits are consumed

## Verifying Test Mode

When you send a contract, check the logs for:
```
⚠️  Test mode: ENABLED (set SIGNWELL_TEST_MODE=false to disable)
Note: SignWell test mode depends on your account settings
ℹ️  Using test API key/account settings for testing
```

## SignWell Account Settings

SignWell test mode behavior depends on your account configuration:

1. **Separate Test API Key**: Some accounts have separate test and production API keys
2. **Account-Level Test Mode**: Some accounts have a test mode toggle in the dashboard
3. **No Built-in Test Mode**: Some accounts don't have test mode - all requests are real

**Check your SignWell dashboard** for test mode options:
- Settings → API → Test Mode
- Settings → Account → Sandbox/Test Environment

## Testing Safely

### Best Practices:

1. **Use Test Email Addresses**
   - Use test email addresses that you control
   - Avoid using real collaborator emails during testing

2. **Monitor API Usage**
   - Check your SignWell dashboard for API usage
   - Verify that test requests aren't consuming credits

3. **Use Draft Mode for Testing**
   - Enable draft mode to create documents without sending
   - Review documents in SignWell dashboard before sending

4. **Separate Test and Production**
   - Use different API keys for test and production
   - Use different webhook endpoints if possible

## Troubleshooting

### Test Mode Not Working

1. **Check Environment Variable**
   ```bash
   echo $SIGNWELL_TEST_MODE
   ```

2. **Verify API Key Type**
   - Ensure you're using a test API key (if available)
   - Check SignWell dashboard for key type

3. **Check SignWell Account Settings**
   - Some accounts require test mode to be enabled in dashboard
   - Contact SignWell support if test mode isn't available

### Still Getting Real Signature Requests

- SignWell may not have built-in test mode
- Use draft mode instead: Click "Draft" button instead of "Send"
- Use test email addresses that you control
- Monitor SignWell dashboard for actual requests

## Example Configuration

### Local Development (`.env`)
```bash
# Test mode enabled
SIGNWELL_API_KEY="test-api-key-from-signwell"
SIGNWELL_TEST_MODE="true"
SIGNWELL_API_URL="https://www.signwell.com/api"
```

### Production (Railway)
```bash
# Test mode disabled
SIGNWELL_API_KEY="production-api-key-from-signwell"
SIGNWELL_TEST_MODE="false"
SIGNWELL_API_URL="https://www.signwell.com/api"
SIGNWELL_WEBHOOK_SECRET="your-webhook-secret"
```

## References

- [SignWell API Documentation](https://developers.signwell.com/reference/getting-started-with-your-api-1)
- SignWell Dashboard → Settings → API
