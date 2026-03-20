"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

  const isAdmin = session?.user?.role === "admin"

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
            <Button onClick={() => setEditing(true)}>Edit</Button>
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
            Writer and publisher shares are stored per composition and kept in sync across all
            recordings. Edit splits on any linked song below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {work.publishingLocked ? (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Publishing locked (all recordings on this composition are locked).
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Publishing is editable.</p>
          )}
          {work.songs && work.songs.length > 0 && (
            <p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/songs/${work.songs[0].id}`}>
                  Open first recording to edit splits
                </Link>
              </Button>
            </p>
          )}
          {(work.workCollaborators?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Writer&apos;s share (50%)</h4>
              <ul className="text-sm space-y-1 border rounded-md p-3">
                {work.workCollaborators!.map((wc) => {
                  const name = [wc.collaborator.firstName, wc.collaborator.middleName, wc.collaborator.lastName]
                    .filter(Boolean)
                    .join(" ")
                  const pct =
                    wc.publishingOwnership != null
                      ? (parseFloat(String(wc.publishingOwnership)) * 100).toFixed(2)
                      : "0"
                  return (
                    <li key={wc.id} className="flex justify-between gap-2">
                      <span>
                        {name} <span className="text-muted-foreground">({wc.roleInWork})</span>
                      </span>
                      <span>{pct}%</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {(work.workPublishingEntities?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Publisher&apos;s share (50%)</h4>
              <ul className="text-sm space-y-1 border rounded-md p-3">
                {work.workPublishingEntities!.map((wpe) => {
                  const pct =
                    wpe.ownershipPercentage != null
                      ? (parseFloat(String(wpe.ownershipPercentage)) * 100).toFixed(2)
                      : "0"
                  return (
                    <li key={wpe.id} className="flex justify-between gap-2">
                      <span>{wpe.publishingEntity.name}</span>
                      <span>{pct}%</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {(work.workCollaborators?.length ?? 0) === 0 &&
            (work.workPublishingEntities?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">
                No work-level splits yet — they will appear after you save publishing splits on a
                linked recording.
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
