import { PrismaClient } from '@prisma/client'

// #region agent log
if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/db.ts:1',message:'DB module loading',data:{env:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// #region agent log
if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/db.ts:10',message:'Before PrismaClient init',data:{hasExisting:!!globalForPrisma.prisma},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// #region agent log
if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/db.ts:19',message:'After PrismaClient init',data:{hasDb:!!db},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

