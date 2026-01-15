import { PrismaClient } from "@prisma/client"

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required.")
  console.error("Please set it to your production database connection string.")
  process.exit(1)
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function addFaqSubmissionTable() {
  try {
    console.log("Adding FaqSubmission table to production database...")

    // Use raw SQL to create the table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FaqSubmission" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "readAt" TIMESTAMP(3),
        "readBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "FaqSubmission_pkey" PRIMARY KEY ("id")
      );
    `)

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "FaqSubmission_read_idx" ON "FaqSubmission"("read");
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "FaqSubmission_createdAt_idx" ON "FaqSubmission"("createdAt");
    `)

    console.log("✅ Table and indexes created successfully!")

    // Verify the table exists by trying to query it
    const result = await prisma.$queryRawUnsafe<{ table_name: string }[]>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'FaqSubmission';
    `)

    if (result.length > 0) {
      console.log("✅ Verified: FaqSubmission table exists in database")
    } else {
      console.error("❌ Verification failed: FaqSubmission table does not exist after creation.")
      process.exit(1)
    }

    // Test a query to ensure Prisma Client can now use the table
    console.log("\n✅ Test query successful!")
    const count = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
      SELECT COUNT(*) as count FROM "FaqSubmission";
    `)
    console.log(`   Found ${count[0].count} submission(s) in the table`)

  } catch (error: any) {
    console.error("❌ Error adding FaqSubmission table:", error)
    if (error.message) {
      console.error("Error message:", error.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addFaqSubmissionTable()
