import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./db"
import bcrypt from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: "admin" | "collaborator"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "admin" | "collaborator"
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const collaborator = await db.collaborator.findUnique({
          where: { email: credentials.email }
        })

        if (!collaborator || !collaborator.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          collaborator.password
        )

        if (!isPasswordValid) {
          return null
        }

        const fullName = [collaborator.firstName, collaborator.middleName, collaborator.lastName].filter(Boolean).join(" ") || null
        return {
          id: collaborator.id,
          email: collaborator.email,
          name: fullName,
          role: collaborator.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role // Role is set in authorize callback
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as "admin" | "collaborator"
      }
      return session
    },
  },
}

