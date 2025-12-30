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

async function listCollaborators() {
  try {
    console.log("📋 Collaborators in production database:\n")

    const collaborators = await db.collaborator.findMany({
      where: { email: { not: null } },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        password: true,
      },
      orderBy: { email: "asc" },
    })

    if (collaborators.length === 0) {
      console.log("   No collaborators with emails found.")
    } else {
      collaborators.forEach((c, i) => {
        console.log(`${i + 1}. ${c.email}`)
        console.log(`   Name: ${c.firstName} ${c.lastName}`)
        console.log(`   Role: ${c.role}`)
        console.log(`   Has Password: ${c.password ? "✅ Yes" : "❌ No"}`)
        console.log("")
      })
    }
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

listCollaborators()

