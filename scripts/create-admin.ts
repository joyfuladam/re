import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const email = 'adam@adamfarrell.com'
    const password = 'LandonAddie134!'
    
    // Check if admin already exists
    const existing = await prisma.collaborator.findUnique({
      where: { email },
    })

    if (existing) {
      // Update existing to admin
      const hashedPassword = await bcrypt.hash(password, 10)
      const admin = await prisma.collaborator.update({
        where: { email },
        data: {
          role: 'admin',
          password: hashedPassword,
          firstName: existing.firstName || 'Adam',
          lastName: existing.lastName || 'Farrell',
        },
      })
      console.log(`✅ Updated ${admin.email} to admin`)
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash(password, 10)
      const admin = await prisma.collaborator.create({
        data: {
          email,
          password: hashedPassword,
          firstName: 'Adam',
          lastName: 'Farrell',
          role: 'admin',
          capableRoles: [], // Can be set later
          status: 'active',
        },
      })
      console.log(`✅ Created admin: ${admin.email}`)
      console.log(`User ID: ${admin.id}`)
    }
  } catch (error) {
    console.error(`❌ Failed to create admin:`, error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

