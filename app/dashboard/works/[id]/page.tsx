"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkPublishingSplitEditor } from "@/components/splits/WorkPublishingSplitEditor"
import { CollaboratorRole } from "@prisma/client"

type SongBrief = {
  id: string
  title: string
  isrcCode: string | null
  catalogNumber: string | null
  status: string
}

type WorkCollaboratorRow = {
  id: string
  roleInWork: string
  publishingOwnership: unknown
  collaborator: {
    id: string
    firstName?: string
    middleName?: string | null
    lastName?: string
  }
}

type WorkPublishingEntityRow = {
  id: string
  ownershipPercentage: unknown
  publishingEntity: { id: string; name: string; isInternal: boolean }
}

type WorkDetail = {
  id: string
  title: string
  iswcCode: string | null
  compositionStatus?: "in_progress" | "finalized"
  labelPublishingShare: unknown
  publishingLocked?: boolean
  createdAt: string
  updatedAt: string
  songs: SongBrief[]
  workCollaborators?: WorkCollaboratorRow[]
  workPublishingEntities?: WorkPublishingEntityRow[]
}

export default function WorkDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === "string" ? params.id : params?.id?.[0]

  const [work, setWork] = useState<WorkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [iswcCode, setIswcCode] = useState("")
  const [labelPct, setLabelPct] = useState("50")
  const [finalizing, setFinalizing] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  const workCollaboratorsForEditor = useMemo(() => {
    if (!work?.workCollaborators?.length) return []
    return work.workCollaborators.map((wc) => ({
      ...wc,
      roleInWork: wc.roleInWork as CollaboratorRole,
      publishingOwnership:
        wc.publishingOwnership != null
          ? parseFloat(String(wc.publishingOwnership)) * 100
          : null,
    }))
  }, [work])

  const workPublishingEntitiesForEditor = useMemo(() => {
    if (!work?.workPublishingEntities?.length) return []
    return work.workPublishingEntities.map((wpe) => ({
      ...wpe,
      ownershipPercentage:
        wpe.ownershipPercentage != null
          ? parseFloat(String(wpe.ownershipPercentage)) * 100
          : null,
    }))
  }, [work])

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/works/${id}`)
      if (!res.ok) {
        setWork(null)
        return
      }
      const data: WorkDetail = await res.json()
      setWork(data)
      setTitle(data.title)
      setIswcCode(data.iswcCode || "")
      const pct =
        data.labelPublishingShare != null
          ? (parseFloat(String(data.labelPublishingShare)) * 100).toString()
          : "50"
      setLabelPct(pct)
    } catch {
      setWork(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id])

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/dashboard")
    }
  }, [session, isAdmin, router])

  const handleFinalizeComposition = async () => {
    if (!id || !work || work.compositionStatus !== "in_progress") return
    if (
      !confirm(
        "Mark this composition as finalized? Use when the work is registered or ready for catalog."
      )
    ) {
      return
    }
    setFinalizing(true)
    try {
      const res = await fetch(`/api/works/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionStatus: "finalized" }),
      })
      if (res.ok) {
        const data: WorkDetail = await res.json()
        setWork(data)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(typeof err.error === "string" ? err.error : "Failed to update")
      }
    } catch {
      alert("Failed to update")
    } finally {
      setFinalizing(false)
    }
  }

  const handleSave = async () => {
    if (!id || !work) return
    const pct = parseFloat(labelPct)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      alert("Label publishing share must be between 0 and 100.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/works/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          iswcCode: iswcCode.trim() || null,
          labelPublishingSharePercent: pct,
        }),
      })
      if (res.ok) {
        const data: WorkDetail = await res.json()
        setWork(data)
        setEditing(false)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(typeof err.error === "string" ? err.error : "Failed to save")
      }
    } catch {
      alert("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  if (loading) {
    return <div>Loading…</div>
  }

  if (!work) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Composition not found</h1>
        <Link href="/dashboard/works">
          <Button variant="outline">Back to works</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{work.title}</h1>
          <p className="text-muted-foreground">
            {work.iswcCode ? `ISWC: ${work.iswcCode}` : "No ISWC on file"}
            {work.compositionStatus && (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-foreground">
                  {work.compositionStatus === "in_progress"
                    ? "Composition in progress"
                    : "Composition finalized"}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setTitle(work.title)
                  setIswcCode(work.iswcCode || "")
                  const pct =
                    work.labelPublishingShare != null
                      ? (parseFloat(String(work.labelPublishingShare)) * 100).toString()
                      : "50"
                  setLabelPct(pct)
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)}>Edit</Button>
              {work.compositionStatus === "in_progress" && (
                <Button
                  variant="secondary"
                  onClick={() => void handleFinalizeComposition()}
                  disabled={finalizing}
                >
                  {finalizing ? "Updating…" : "Mark composition finalized"}
                </Button>
              )}
            </>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard/works">All works</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Composition details</CardTitle>
          <CardDescription>
            Label publishing share applies at the composition level (for future publishing workflows).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iswc">ISWC</Label>
                <Input
                  id="iswc"
                  value={iswcCode}
                  onChange={(e) => setIswcCode(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labelPct">Label publishing share (%)</Label>
                <Input
                  id="labelPct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={labelPct}
                  onChange={(e) => setLabelPct(e.target.value)}
                />
              </div>
            </>
          ) : (
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Label publishing share</dt>
                <dd className="font-medium">
                  {work.labelPublishingShare != null
                    ? `${(parseFloat(String(work.labelPublishingShare)) * 100).toFixed(1)}%`
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing splits</CardTitle>
          <CardDescription>
            Writer and publisher shares apply to this composition and stay in sync with every
            linked recording. You can also edit from a song page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl">
          {work.songs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a recording first, then add collaborators on that song — splits will appear here.
            </p>
          ) : workCollaboratorsForEditor.length === 0 &&
            workPublishingEntitiesForEditor.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No splits yet. Add collaborators and publishing entities on a linked recording, or save
              once splits exist on a song.
            </p>
          ) : (
            <WorkPublishingSplitEditor
              workId={work.id}
              workCollaborators={workCollaboratorsForEditor}
              workPublishingEntities={workPublishingEntitiesForEditor}
              isLocked={!!work.publishingLocked}
              onUpdate={() => void load()}
            />
          )}
          {work.songs.length > 0 && (
            <p className="text-sm">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/songs/${work.songs[0].id}`}>
                  Open a recording
                </Link>
              </Button>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recordings</CardTitle>
          <CardDescription>
            Songs in the catalog linked to this composition
          </CardDescription>
        </CardHeader>
        <CardContent>
          {work.songs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No recordings yet. Link from a song’s edit screen or create a new song.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {work.songs.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <Link
                      href={`/dashboard/songs/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.title}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {s.isrcCode && `ISRC ${s.isrcCode}`}
                      {s.isrcCode && s.catalogNumber && " • "}
                      {s.catalogNumber && `Cat ${s.catalogNumber}`}
                      {!s.isrcCode && !s.catalogNumber && "—"}
                      <span className="capitalize"> • {s.status}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/songs/${s.id}`}>Open</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
