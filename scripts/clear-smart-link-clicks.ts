import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.smartLinkClick.deleteMany({})
  console.log(`Deleted ${result.count} smart link click record(s). Counts are now zero.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
