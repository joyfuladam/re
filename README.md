# River & Ember Record Label Management System

A comprehensive web-based record label management application with strict role-based revenue eligibility, publishing/master split separation, sequential split locking, and role-specific contract generation.

## Features

- **Collaborator Management**: Manage artists, musicians, producers, and writers with role-based configurations
- **Song Catalog**: Track songs with industry-standard fields (ISRC, PRO registration, etc.)
- **Split Management**: 
  - Publishing splits (writers + label) - must total 100% and be locked first
  - Master splits (all eligible roles) - available after publishing is locked
- **Role-Based Revenue Eligibility**: Strict enforcement of revenue streams per role
- **Contract Generation**: Role-specific contract templates with PDF generation
- **E-Signature Integration**: HelloSign/Dropbox Sign API integration for contract signing
- **Dashboard**: Overview with statistics and quick actions

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts
- **E-Signature**: HelloSign/Dropbox Sign API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- HelloSign/Dropbox Sign API key (optional, for e-signatures)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd REAPP
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
DATABASE_URL="postgresql://user:password@localhost:5432/river_ember"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
HELLOSIGN_API_KEY="your-hellosign-api-key"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

The application uses Prisma for database management. Key tables:

- `Collaborator`: Stores collaborator information with role-based flags
- `Song`: Stores song information and split lock status
- `SongCollaborator`: Junction table linking songs to collaborators with ownership percentages
- `Contract`: Stores generated contracts and e-signature status
- `SplitHistory`: Audit trail for split changes

## Role-Based Revenue Logic

### Musician
- **Publishing**: NOT eligible (must be 0%)
- **Master**: Eligible (digital only)
- **Revenue**: Streaming, digital downloads, platform ad revenue
- **Excluded**: Physical sales, sync licensing, publishing income

### Writer
- **Publishing**: REQUIRED (must have > 0%)
- **Master**: Optional (only if also artist)
- **Revenue**: Publishing income, mechanicals, sync (publishing share)

### Producer
- **Publishing**: NOT eligible (unless also writer)
- **Master**: Eligible (full)
- **Revenue**: All master revenue streams

### Label (River & Ember)
- **Publishing**: Eligible
- **Master**: Eligible
- **Revenue**: All revenue streams

## Split Workflow

1. **Publishing Splits**: Set publishing ownership for writers and label (must total 100%)
2. **Lock Publishing**: Lock publishing splits (becomes read-only)
3. **Master Splits**: Set master ownership for all eligible roles (must total 100%)
4. **Lock Master**: Lock master splits (becomes read-only)
5. **Generate Contracts**: Contracts can be generated after master splits are locked

## Contract Generation

Contracts are automatically generated based on collaborator role:

- **Musician**: Digital-Only Master Participation Agreement
- **Writer**: Songwriter / Publishing Agreement
- **Producer**: Producer Agreement
- **Label**: Internal Ownership Record

## E-Signature Integration

The application integrates with HelloSign/Dropbox Sign API for contract signing:

1. Generate contract from song detail page
2. Send contract via HelloSign API
3. Track signature status
4. Store signed documents

## Development

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration-name

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```

### Building for Production

```bash
npm run build
npm start
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js
- `NEXTAUTH_URL`: Base URL of your application
- `HELLOSIGN_API_KEY`: HelloSign/Dropbox Sign API key (optional)

## License

Private - River & Ember

