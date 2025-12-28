# Handling Collaborators with Multiple Roles

## Overview

The system now supports collaborators having **different roles on different songs**. This is essential for real-world scenarios where:

- A musician on one song might be a writer on another
- A producer might also contribute as a writer to some songs
- Someone might be a musician on Song A but a producer on Song B

## How It Works

### 1. Collaborator Base Role

When you create a collaborator, you assign them a **primary/default role**. This is stored in the `Collaborator` table and is useful for:
- Filtering and searching collaborators
- Default display in lists
- General categorization

**This base role does NOT restrict what roles they can have on individual songs.**

### 2. Role Per Song (`roleInSong`)

When you add a collaborator to a song, you **select their role for that specific song**. This is stored in the `SongCollaborator` table as `roleInSong`.

This role determines:
- ✅ Revenue eligibility for that song
- ✅ Validation rules (e.g., can they receive publishing?)
- ✅ Contract type generated
- ✅ Split eligibility

### 3. Example Scenario

**Sarah Smith** - Primary Role: Musician

- On **Song A**: Added as "Musician" → Gets digital-only master royalties, NO publishing
- On **Song B**: Added as "Writer" → Gets publishing ownership, NO master royalties
- On **Song C**: Added as "Producer" → Gets full master royalties, NO publishing

Each song is independent. Sarah's role on Song A doesn't affect her eligibility on Song B or C.

## Usage

### Adding a Collaborator to a Song

1. Go to a song's detail page
2. Click "Add Collaborator"
3. Select the collaborator from the list
4. **Select their role for THIS song** (Musician, Writer, Producer, or Label)
5. The system will use this role to determine eligibility and validation

### Important Notes

- **Revenue eligibility is based on `roleInSong`, not the base role**
- A collaborator's base role is just for organization/searching
- You can add the same collaborator to multiple songs with different roles
- Validation rules apply per song based on that song's role assignment

## Validation Rules Per Role

### Musician (`roleInSong`)
- ✅ Master ownership allowed (digital-only revenue)
- ❌ Publishing ownership MUST be 0%
- ❌ Cannot receive physical sales or sync revenue

### Writer (`roleInSong`)
- ✅ Publishing ownership REQUIRED (must have > 0%)
- ✅ Master ownership optional (if also artist)
- ✅ Can receive all publishing revenue types

### Producer (`roleInSong`)
- ✅ Master ownership allowed (full revenue)
- ❌ Publishing ownership NOT allowed (unless also writer - add separately)
- ✅ Can receive all master revenue types

### Label (`roleInSong`)
- ✅ Both publishing and master ownership allowed
- ✅ All revenue types allowed

## Technical Implementation

- The `Collaborator.role` field is informational only
- All validation uses `SongCollaborator.roleInSong`
- Split editors filter by `roleInSong`, not `collaborator.role`
- Contract generation uses `roleInSong` to determine contract type

## Common Patterns

### Pattern 1: Multi-Talented Artist
Create one collaborator record, add them to different songs with different roles.

### Pattern 2: Producer Who Also Writes
- Add as "Producer" for master rights
- Add as "Writer" separately for publishing rights
- They appear twice on the song with different roles

### Pattern 3: Session Musician Turned Writer
- Song A: Add as "Musician" (session work)
- Song B: Add as "Writer" (wrote the song)

