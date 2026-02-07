# Email and Logo Troubleshooting Guide

## Current Status ✅

**Emails ARE Being Sent Successfully!**
- Logs show: `Email sent via Resend: 983e9e54-760e-4bc7-9faf-cf3facfb4e25`
- Resend is accepting and delivering emails
- Admin notifications ARE working (you received the account request email)

**Logo IS Committed to Git**
- File: `public/images/logo.png` (300x295px, PNG)
- Deployed URL should be: `https://river-ember-app-production.up.railway.app/images/logo.png`

---

## Issue 1: Approval Emails Not Received by New Account Holders

### Root Cause
Emails are going to **spam folder** because:
1. Your domain (`riverandember.com`) is newly configured for sending
2. Email providers need time to build trust with your domain
3. Missing DMARC policy (optional but recommended)

### Immediate Action Items

**For the test user:**
1. ✅ **Check spam/junk folder** for emails from `admin@riverandember.com`
2. ✅ **Mark as "Not Spam"** if found there
3. ✅ **Add `admin@riverandember.com` to contacts**
4. ✅ **Check "All Mail" folder** (in Gmail) in case it's not in inbox or spam

**What was the email address you approved?** (Gmail, Yahoo, Outlook, etc.)

### Long-term Solution: Add DMARC Record

**Go to AWS Route 53:**
1. Navigate to Route 53 → Hosted Zones → `riverandember.com`
2. Create new record:
   - **Type:** TXT
   - **Name:** `_dmarc`
   - **Value:** `v=DMARC1; p=none; rua=mailto:admin@riverandember.com`
3. Click "Create records"

**Why this helps:**
- Significantly improves deliverability
- Prevents emails from going to spam
- Builds sender reputation
- Takes 24-48 hours to fully take effect

**Verify after adding:**
- Visit: https://mxtoolbox.com/dmarc.aspx
- Enter: `riverandember.com`
- Should show valid DMARC policy

---

## Issue 2: Logo Not Visible in Emails/Contracts

### Possible Causes

**For Emails:**
1. **Email client blocking images** (common security feature)
2. **Logo URL might be wrong** for production environment
3. **Image not loading from `railway.app` domain**

**For Contracts:**
1. Logo should appear in generated PDFs
2. May need to test by generating a new contract

### Action Items to Test Logo

**Test 1: Direct URL Access**
```
https://river-ember-app-production.up.railway.app/images/logo.png
```
Open this URL in your browser. If it loads, the logo is deployed correctly.

**Test 2: Send yourself a test email**
1. Create a new account request
2. Approve it (using your own email)
3. Check if logo shows in the email

**Test 3: Generate a contract**
1. Go to a song with locked splits
2. Generate a contract for a collaborator
3. Check if logo appears at the top of the PDF

### If Logo Still Doesn't Show

**For Emails:**
- Email clients often block images by default
- Users need to click "Show Images" or "Display Images"
- This is normal behavior and NOT a bug

**For Contracts:**
- The logo should embed properly in PDFs
- If not showing, we may need to adjust the image path or encoding

---

## Quick Test Script

Run these commands to verify everything:

```bash
# Test if logo is accessible
curl -I https://river-ember-app-production.up.railway.app/images/logo.png

# Check Railway deployment status
railway status

# View recent logs
railway logs
```

Expected response for logo test:
```
HTTP/2 200
content-type: image/png
```

---

## Email Deliverability Checklist

✅ **Already Configured:**
- [x] Resend API key set
- [x] RESEND_FROM_EMAIL set to `admin@riverandember.com`
- [x] Domain verified in Resend
- [x] SPF record added
- [x] DKIM records added

⏳ **To Add:**
- [ ] DMARC policy (improves deliverability by ~30%)
- [ ] Domain warming (send emails gradually over 2-3 weeks)

📧 **Email Warm-up Tips:**
- Start with 10-20 emails per day
- Gradually increase over 2-3 weeks
- Ask early recipients to reply (improves reputation)
- Avoid sending to inactive/bouncing emails

---

## Monitoring Email Delivery

**Check Resend Dashboard:**
1. Go to: https://resend.com/emails
2. View sent emails and their statuses
3. Check for bounces or spam reports

**Resend Email Statuses:**
- `sent` - Delivered to recipient's mail server
- `delivered` - Successfully delivered to inbox
- `bounced` - Email address invalid or mailbox full
- `complained` - Marked as spam by recipient

---

## Next Steps

### Immediate (Right Now):
1. Have test user check spam folder
2. Test logo URL in browser
3. Check Resend dashboard for email delivery status

### Short-term (Today):
1. Add DMARC record to DNS
2. Test logo in a newly generated email
3. Generate a test contract to verify logo appears

### Long-term (Next Week):
1. Monitor email deliverability in Resend dashboard
2. Ask early users to mark emails as "Not Spam"
3. Build domain reputation gradually

---

## Support

If issues persist:
1. Check Railway logs: `railway logs`
2. Check Resend dashboard: https://resend.com/emails  
3. Test DNS records: https://mxtoolbox.com
4. Email deliverability test: https://www.mail-tester.com
