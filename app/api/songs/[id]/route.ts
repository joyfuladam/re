import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong, canManageSongs } from "@/lib/permissions"
import { z } from "zod"

const songUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  isrcCode: z.string().optional().nullable(),
  iswcCode: z.string().optional().nullable(),
  catalogNumber: z.string().optional().nullable(),
  releaseDate: z.string().datetime().optional().nullable(),
  proWorkRegistrationNumber: z.string().optional().nullable(),
  publishingAdmin: z.string().optional().nullable(),
  masterOwner: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  subGenre: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  recordingDate: z.string().datetime().optional().nullable(),
  recordingLocation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  promoMaterialsFolderId: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "archived"]).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // #region agent log
  try{const fs=require('fs');const p='/Users/adamf/projects/REAPP/.cursor/debug.log';fs.appendFileSync(p,JSON.stringify({location:'app/api/songs/[id]/route.ts:25',message:'GET handler entry',data:{paramsId:params?.id,paramsType:typeof params,paramsKeys:params?Object.keys(params):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n');}catch(e){}
  // #endregion
  try {
    const session = await getServerSession(authOptions)
    // #region agent log
    try{const fs=require('fs');const p='/Users/adamf/projects/REAPP/.cursor/debug.log';fs.appendFileSync(p,JSON.stringify({location:'app/api/songs/[id]/route.ts:31',message:'Session check',data:{hasSession:!!session,userId:session?.user?.id,userRole:session?.user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n');}catch(e){}
    // #endregion
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user can access this song
    const canAccess = await canAccessSong(session, params.id)
    // #region agent log
    try{const fs=require('fs');const p='/Users/adamf/projects/REAPP/.cursor/debug.log';fs.appendFileSync(p,JSON.stringify({location:'app/api/songs/[id]/route.ts:37',message:'canAccessSong result',data:{canAccess,songId:params.id,userId:session.user.id,userRole:session.user.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n');}catch(e){}
    // #endregion
    if (!canAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this song" },
        { status: 403 }
      )
    }

    // #region agent log
    try{const fs=require('fs');const p='/Users/adamf/projects/REAPP/.cursor/debug.log';fs.appendFileSync(p,JSON.stringify({location:'app/api/songs/[id]/route.ts:44',message:'Before database query',data:{songId:params.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})+'\n');}catch(e){}
    // #endregion
    let song
    try {
      song = await db.song.findUnique({
        where: { id: params.id },
        include: {
          songCollaborators: {
            include: {
              collaborator: true,
            },
          },
          songPublishingEntities: {
            include: {
              publishingEntity: true,
            },
          },
        },
      })
      // #region agent log
      try{const fs=require('fs');const p='/Users/adamf/projects/REAPP/.cursor/debug.log';fs.appendFileSync(p,JSON.stringify({location:'app/api/songs/[id]/route.ts:66',message:'Database query completed',data:{songFound:!!song,songId:params.id,foundSongId:song?.id,foundSongTitle:song?.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})+'\n');}catch(e){}
      // #endregion
    } catch (dbError: any) {
      // #region agent log
      try{const fs=require('fs');const p='/Users/adamf/projects/REAPP/.cursor/debug.log';fs.appendFileSync(p,JSON.stringify({location:'app/api/songs/[id]/route.ts:68',message:'Database query error',data:{error:dbError?.message,errorName:dbError?.name,stack:dbError?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})+'\n');}catch(e){}
      // #endregion
      throw dbError
    }

    // #region agent log
    try{const fs=require('fs');const p='/Users/adamf/projects/REAPP/.cursor/debug.log';fs.appendFileSync(p,JSON.stringify({location:'app/api/songs/[id]/route.ts:72',message:'After database query',data:{songFound:!!song},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})+'\n');}catch(e){}
    // #endregion
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    return NextResponse.json(song)
  } catch (error: any) {
    // #region agent log
    try{const fs=require('fs');const p='/Users/adamf/projects/REAPP/.cursor/debug.log';fs.appendFileSync(p,JSON.stringify({location:'app/api/songs/[id]/route.ts:80',message:'Catch block error',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})+'\n');}catch(e){}
    // #endregion
    console.error("Error fetching song:", error)
    return NextResponse.json(
      { error: "Failed to fetch song" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update songs
    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can update songs" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = songUpdateSchema.parse(body)

    // Remove catalogNumber from update - it's permanent and cannot be changed
    const { catalogNumber, ...rest } = validated
    
    // Build update data with proper Date conversions
    const updateData: any = { ...rest }
    if (validated.releaseDate) {
      updateData.releaseDate = new Date(validated.releaseDate)
    }
    if (validated.recordingDate) {
      updateData.recordingDate = new Date(validated.recordingDate)
    }

    const song = await db.song.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(song)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating song:", error)
    return NextResponse.json(
      { error: "Failed to update song" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete songs
    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete songs" },
        { status: 403 }
      )
    }

    await db.song.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting song:", error)
    return NextResponse.json(
      { error: "Failed to delete song" },
      { status: 500 }
    )
  }
}

