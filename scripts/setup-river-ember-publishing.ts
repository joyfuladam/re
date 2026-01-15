import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Check if River & Ember Publishing already exists
  const existing = await prisma.publishingEntity.findFirst({
    where: {
      name: {
        contains: "River & Ember",
        mode: "insensitive",
      },
      isInternal: true,
    },
  })

  if (existing) {
    console.log("River & Ember Publishing entity already exists:", existing.id)
    return
  }

  // Create River & Ember Publishing entity
  const riverEmber = await prisma.publishingEntity.create({
    data: {
      name: "River & Ember Publishing",
      isInternal: true,
      notes: "Default internal publishing entity for River & Ember",
    },
  })

  console.log("Created River & Ember Publishing entity:", riverEmber.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




