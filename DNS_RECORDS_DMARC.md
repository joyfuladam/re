# Add DMARC Record to Improve Email Deliverability

## What is DMARC?
DMARC (Domain-based Message Authentication, Reporting & Conformance) tells email providers how to handle emails from your domain. It significantly improves deliverability and prevents your emails from going to spam.

## DNS Record to Add

Go to your DNS provider (AWS Route 53 for riverandember.com) and add:

**Type:** TXT  
**Name:** `_dmarc`  
**Value:** `v=DMARC1; p=none; rua=mailto:admin@riverandember.com`

### What this means:
- `v=DMARC1` - DMARC version 1
- `p=none` - Monitor mode (doesn't reject emails, just reports)
- `rua=mailto:admin@riverandember.com` - Where to send aggregate reports

## Steps to Add in AWS Route 53:

1. Log into AWS Console
2. Go to Route 53 → Hosted Zones
3. Click on `riverandember.com`
4. Click "Create record"
5. Fill in:
   - Record name: `_dmarc`
   - Record type: `TXT`
   - Value: `v=DMARC1; p=none; rua=mailto:admin@riverandember.com`
6. Click "Create records"

## Verify DMARC Setup

After adding, verify at: https://mxtoolbox.com/dmarc.aspx

Enter: `riverandember.com`

It should show your DMARC policy as valid.

## Expected Improvement

- Emails less likely to go to spam
- Better sender reputation
- Reports on email delivery (sent to admin@riverandember.com)
- Takes 24-48 hours to fully propagate

## Current DNS Records for Email (Already Set)

Your Resend SPF and DKIM records are already configured correctly:
- SPF: TXT record for domain verification
- DKIM: TXT records starting with `resend._domainkey`

The DMARC record is the final piece for optimal deliverability.
