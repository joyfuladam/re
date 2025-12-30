import { PrismaClient } from "@prisma/client"

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required")
  process.exit(1)
}

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function setAdmin() {
  try {
    const email = process.argv[2]

    if (!email) {
      console.error("Usage: DATABASE_URL='...' npx tsx scripts/set-admin-production.ts your-email@example.com")
      process.exit(1)
    }

    console.log(`🔍 Looking for collaborator with email: ${email}`)

    const collaborator = await db.collaborator.findUnique({
      where: { email },
    })

    if (!collaborator) {
      console.error(`❌ No collaborator found with email: ${email}`)
      console.log("\n📋 Available collaborators:")
      const all = await db.collaborator.findMany({
        where: { email: { not: null } },
        select: { email: true, firstName: true, lastName: true, role: true },
      })
      all.forEach((c) => {
        console.log(`   - ${c.email} (${c.firstName} ${c.lastName}) - Role: ${c.role}`)
      })
      process.exit(1)
    }

    console.log(`✅ Found: ${collaborator.firstName} ${collaborator.lastName}`)
    console.log(`   Current role: ${collaborator.role}`)
    console.log(`   Has password: ${collaborator.password ? "Yes" : "No"}`)

    if (collaborator.role === "admin") {
      console.log(`\n✅ Already an admin!`)
    } else {
      await db.collaborator.update({
        where: { email },
        data: { role: "admin" },
      })
      console.log(`\n✅ Updated role to admin!`)
    }

    if (!collaborator.password) {
      console.log(`\n⚠️  WARNING: This collaborator has no password set.`)
      console.log(`   You won't be able to log in until a password is set.`)
    } else {
      console.log(`\n✅ Ready to log in!`)
      console.log(`   Email: ${email}`)
      console.log(`   Use the password from your local database`)
    }
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

setAdmin()

