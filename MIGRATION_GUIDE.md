# Database Migration Guide

## Breaking Schema Change: Multiple Roles Per Collaborator

The database schema has been updated to support **multiple roles per collaborator** and **removed "label" as an assignable collaborator role**.

### Changes Made

1. **Collaborator Model:**
   - ❌ Removed: `role` (single CollaboratorRole)
   - ❌ Removed: `publishingEligible` (computed field)
   - ❌ Removed: `masterEligible` (computed field)
   - ❌ Removed: `masterRevenueScope` (computed field)
   - ✅ Added: `capableRoles` (array of CollaboratorRole - musician, writer, producer only)

2. **Label Role:**
   - "Label" is no longer assignable to collaborators
   - "Label" remains available for `roleInSong` (system/internal use)
   - River & Ember should be added to songs as "label" role directly, not as a collaborator

### Migration Steps

**⚠️ WARNING: This migration will delete existing data. Back up your database first!**

#### Option 1: Fresh Start (Recommended for Development)

```bash
# Reset database completely
npx prisma db push --force-reset

# This will:
# - Drop all tables
# - Recreate schema with new structure
# - Lose all existing data
```

#### Option 2: Manual Migration (For Production/Existing Data)

If you have existing data you want to preserve:

1. **Backup your database first!**

2. **Create a migration script** to convert existing data:

```sql
-- Add new column
ALTER TABLE "Collaborator" ADD COLUMN "capableRoles" CollaboratorRole[];

-- Migrate existing role to capableRoles array
UPDATE "Collaborator" 
SET "capableRoles" = ARRAY[role]::CollaboratorRole[]
WHERE "capableRoles" IS NULL;

-- Remove old columns
ALTER TABLE "Collaborator" DROP COLUMN "role";
ALTER TABLE "Collaborator" DROP COLUMN "publishingEligible";
ALTER TABLE "Collaborator" DROP COLUMN "masterEligible";
ALTER TABLE "Collaborator" DROP COLUMN "masterRevenueScope";
```

3. **Run Prisma migration:**

```bash
npx prisma db push
```

### After Migration

1. **Update existing collaborators:**
   - Go through each collaborator and add their additional capable roles
   - If someone was "musician" but can also "write", add "writer" to their capableRoles

2. **Remove any "label" role collaborators:**
   - These should not exist as collaborators
   - River & Ember should be added directly to songs, not as a collaborator person

3. **Verify data:**
   - Check that all collaborators have at least one role in `capableRoles`
   - Verify songs still have correct collaborators assigned

### Application Updates Required

The application code has been updated to:
- ✅ Use `capableRoles` array instead of single `role`
- ✅ Filter role selection based on `capableRoles`
- ✅ Remove "label" from collaborator creation
- ✅ Validate `roleInSong` is in collaborator's `capableRoles` (or is "label")

### Key Behavioral Changes

1. **Creating Collaborators:**
   - You can now select multiple roles (checkboxes)
   - "Label" is not an option
   - At least one role must be selected

2. **Adding Collaborator to Song:**
   - Only shows roles the collaborator is capable of
   - "Label" is always available (system role)
   - Validation ensures role is in `capableRoles` or is "label"

3. **Existing Songs:**
   - Songs with collaborators assigned keep their `roleInSong`
   - The system validates based on `roleInSong`, not `capableRoles` (for backward compatibility during migration)

