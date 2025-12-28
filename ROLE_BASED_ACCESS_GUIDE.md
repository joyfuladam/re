# Role-Based Access Control Guide

## Overview

The application now supports two user roles:

1. **Admin** - Full access to all features
2. **Collaborator** - Limited access (can only view/update their own information and songs they're on)

## Database Changes

### Schema Updates

1. **User Model:**
   - Added `role` field (enum: `admin` | `collaborator`) - defaults to `collaborator`
   - Added `collaboratorId` field (optional) - links User to their Collaborator record

2. **Collaborator Model:**
   - Added optional relation to User (for collaborators who have accounts)

### Migration Steps

**⚠️ WARNING: This migration will modify the User table. Back up your database first!**

```bash
# Push schema changes to database
npx prisma db push

# Regenerate Prisma client
npx prisma generate
```

## Permissions Summary

### Admin Permissions
- ✅ Create, read, update, delete collaborators
- ✅ Create, read, update, delete songs
- ✅ Manage splits (publishing & master)
- ✅ Generate contracts
- ✅ Access all data

### Collaborator Permissions
- ✅ View their own collaborator record
- ✅ Update their own collaborator information
- ✅ View songs they're a collaborator on
- ✅ View splits on their songs (read-only)
- ❌ Cannot create/delete collaborators
- ❌ Cannot create/delete songs
- ❌ Cannot manage splits
- ❌ Cannot add collaborators to songs

## User and Collaborator Relationship

**Users and Collaborators are unified:**

- When a user registers, a Collaborator record is automatically created for them
- The User account is linked to the Collaborator record via `collaboratorId`
- Users can access their own Collaborator profile to update their information
- Admins can manage all users and collaborators

## Linking Existing Users to Collaborators

If a collaborator was created manually (by admin) and a user account exists with the same email, they are automatically linked when the collaborator is created.

For manual linking (admin only):
- Use the Admin UI: Dashboard → User Management → Link User to Collaborator
- Or use the API: `PATCH /api/users/{userId}/role`

Example API call:
```json
{
  "role": "collaborator",
  "collaboratorId": "clx123abc..." 
}
```

## Assigning Admin Role

To make a user an admin, use the API endpoint (admin only):

```bash
PATCH /api/users/{userId}/role
{
  "role": "admin"
}
```

Or manually update the database:
```sql
UPDATE "User" SET role = 'admin' WHERE email = 'admin@example.com';
```

## UI Changes

- Dashboard navigation shows/hides items based on role
- Role badge appears in navigation showing current user's role
- Collaborator pages redirect non-admins to dashboard
- Split editors are read-only for collaborators
- "Add Collaborator" buttons only visible to admins

## Testing

1. Create a test admin user:
   ```sql
   UPDATE "User" SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

2. Create a test collaborator user and link them:
   - Create a Collaborator record
   - Create a User with `role: 'collaborator'`
   - Update User with `collaboratorId` pointing to the Collaborator

3. Test permissions:
   - Log in as admin - should see all features
   - Log in as collaborator - should see limited features

