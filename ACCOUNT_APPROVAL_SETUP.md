# Account Approval System Setup

This document explains how to set up and use the new account approval system for River & Ember.

## Overview

The account approval system replaces open registration with an admin-approved workflow:

1. Users request an account (name + email)
2. Admins receive notification and review requests in dashboard
3. Admins approve/reject requests
4. Approved users receive email with setup link
5. Users set their password via the setup link
6. Users are automatically logged in

## Setup Instructions

### 1. Database Migration

The `AccountRequest` model has been added to your Prisma schema. To apply it to production:

```bash
# Generate Prisma client locally (already done)
npx prisma generate

# Push to Railway production database
railway run npx prisma db push
```

### 2. Email Configuration (Google Workspace)

You need to configure SMTP credentials to send emails through your Google Workspace account.

#### Create App Password in Google Workspace:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select "Mail" and your device
5. Click "Generate"
6. Copy the 16-character password

#### Add to Environment Variables:

**Local Development (.env):**
```env
SMTP_USER="your-email@riverandember.com"
SMTP_PASSWORD="your-16-char-app-password"
```

**Railway Production:**
```bash
railway variables set SMTP_USER="your-email@riverandember.com"
railway variables set SMTP_PASSWORD="your-16-char-app-password"
```

### 3. Deploy Changes

```bash
git add .
git commit -m "Add account approval system"
git push origin main
```

Railway will automatically deploy the changes.

## How It Works

### For Users

1. **Request Account:**
   - Visit `/request-account` (or click "Request one" on login page)
   - Enter first name, last name, and email
   - Submit request

2. **Wait for Approval:**
   - User sees confirmation message
   - Admins are notified via email

3. **Setup Account (after approval):**
   - User receives email with setup link
   - Link is valid for 48 hours
   - User clicks link and sets password
   - User is automatically logged in

### For Admins

1. **View Requests:**
   - Dashboard shows count of pending requests (if any)
   - Click "Review Requests" or navigate to `/dashboard/account-requests`

2. **Review & Approve:**
   - See all pending requests with name, email, and timestamp
   - Click "Approve" to send setup email
   - Click "Reject" to decline request

3. **Track Status:**
   - Filter by Pending, Approved, Rejected, or All
   - See approval/rejection timestamps

## Email Templates

### Account Approval Email (to user)
- Subject: "Your River & Ember Account Has Been Approved!"
- Contains setup link valid for 48 hours
- Professional branded design

### Account Request Notification (to admins)
- Subject: "New Account Request - River & Ember"
- Shows requester name and email
- Link to dashboard for review

## API Endpoints

### Public Endpoints
- `POST /api/auth/request-account` - Submit account request
- `GET /api/auth/validate-setup-token?token=xxx` - Validate setup link
- `POST /api/auth/setup-account` - Complete account setup with password

### Admin Endpoints (require admin role)
- `GET /api/admin/account-requests?status=pending` - List requests
- `POST /api/admin/account-requests/:id/approve` - Approve request
- `POST /api/admin/account-requests/:id/reject` - Reject request

## Security Features

- ✅ Setup tokens are cryptographically random (32 bytes)
- ✅ Tokens expire after 48 hours
- ✅ Tokens are single-use (invalidated after account creation)
- ✅ Duplicate email detection
- ✅ Admin-only approval endpoints
- ✅ Passwords hashed with bcrypt

## Database Schema

```prisma
model AccountRequest {
  id          String    @id @default(cuid())
  firstName   String
  lastName    String
  email       String    @unique
  status      String    @default("pending") // pending, approved, rejected
  approvedBy  String?   // Admin collaborator ID
  approvedAt  DateTime?
  rejectedBy  String?
  rejectedAt  DateTime?
  setupToken  String?   @unique
  tokenExpiry DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([email])
  @@index([status])
  @@index([createdAt])
}
```

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials:**
   ```bash
   railway variables
   ```
   Verify `SMTP_USER` and `SMTP_PASSWORD` are set

2. **Check Google App Password:**
   - Must be 16 characters (no spaces)
   - Must have 2-Step Verification enabled
   - Try generating a new app password

3. **Check logs:**
   ```bash
   railway logs
   ```
   Look for email-related errors

### Setup Link Expired

- Links expire after 48 hours for security
- Admin can re-approve the request to send a new link
- User can submit a new request if needed

### User Already Exists

- System checks for existing accounts before creating
- If account exists, user should use "Forgot Password" (to be implemented)
- Admin can check `/dashboard/collaborators` for existing accounts

## Future Enhancements

Potential improvements:
- [ ] Password reset functionality
- [ ] Custom rejection email with reason
- [ ] Bulk approve/reject
- [ ] Request notes/comments
- [ ] Configurable token expiry time
- [ ] Email templates in database
- [ ] Resend approval email option

## Files Changed/Created

### New Files
- `lib/email.ts` - Email service and templates
- `app/request-account/page.tsx` - Account request form
- `app/setup-account/page.tsx` - Password setup page
- `app/dashboard/account-requests/page.tsx` - Admin review page
- `app/api/auth/request-account/route.ts` - Submit request API
- `app/api/auth/validate-setup-token/route.ts` - Validate token API
- `app/api/auth/setup-account/route.ts` - Complete setup API
- `app/api/admin/account-requests/route.ts` - List requests API
- `app/api/admin/account-requests/[id]/approve/route.ts` - Approve API
- `app/api/admin/account-requests/[id]/reject/route.ts` - Reject API

### Modified Files
- `prisma/schema.prisma` - Added AccountRequest model
- `app/login/page.tsx` - Changed "Sign up" to "Request one"
- `app/page.tsx` - Changed "Register" to "Request Account"
- `app/dashboard/page.tsx` - Added pending requests card
- `app/api/dashboard/stats/route.ts` - Added pending requests count
- `package.json` - Added nodemailer dependency

### Deprecated Files
- `app/register/page.tsx` - No longer used (can be deleted)
- `app/api/auth/register/route.ts` - No longer used (can be deleted)

## Support

For issues or questions:
1. Check Railway logs: `railway logs`
2. Check browser console for frontend errors
3. Verify environment variables are set correctly
4. Ensure database migration was applied
