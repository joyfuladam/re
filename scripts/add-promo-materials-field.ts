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

async function addPromoMaterialsField() {
  try {
    console.log("Adding promoMaterialsFolderId field to Song table...")

    // Use raw SQL to add the column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Song" 
      ADD COLUMN IF NOT EXISTS "promoMaterialsFolderId" TEXT;
    `)

    console.log("✅ Field added successfully!")

    // Verify the column exists
    const result = await prisma.$queryRawUnsafe<{ column_name: string }[]>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Song' AND column_name = 'promoMaterialsFolderId';
    `)

    if (result.length > 0) {
      console.log("✅ Verified: promoMaterialsFolderId column exists in Song table")
    } else {
      console.error("❌ Verification failed: promoMaterialsFolderId column does not exist after creation.")
      process.exit(1)
    }

  } catch (error: any) {
    console.error("❌ Error adding promoMaterialsFolderId field:", error)
    if (error.message) {
      console.error("Error message:", error.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addPromoMaterialsField()
