"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ThreadType } from "./types"
import type { Peer, SongOption, WorkOption } from "./compose-types"

export function ComposeThreadDialog({
  open,
  onClose,
  isAdmin,
  composeSubject,
  setComposeSubject,
  composeType,
  setComposeType,
  composeSongId,
  setComposeSongId,
  composeWorkId,
  setComposeWorkId,
  composeParticipantIds,
  peers,
  songs,
  worksOptions,
  creatingThread,
  onSubmit,
  togglePeer,
}: {
  open: boolean
  onClose: () => void
  isAdmin: boolean
  composeSubject: string
  setComposeSubject: (v: string) => void
  composeType: ThreadType
  setComposeType: (v: ThreadType) => void
  composeSongId: string
  setComposeSongId: (v: string) => void
  composeWorkId: string
  setComposeWorkId: (v: string) => void
  composeParticipantIds: string[]
  peers: Peer[]
  songs: SongOption[]
  worksOptions: WorkOption[]
  creatingThread: boolean
  onSubmit: (e: React.FormEvent) => void
  togglePeer: (id: string) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[10vh]">
      <Card className="relative w-full max-w-lg border-primary/50 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Start a conversation</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="subj">Subject</Label>
              <Input
                id="subj"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                required
                placeholder="Topic"
              />
            </div>
            <div className="space-y-2">
              <Label>Channel type</Label>
              <Select
                value={composeType}
                onValueChange={(v) => {
                  setComposeType(v as ThreadType)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="direct">Direct (1 other person)</SelectItem>
                  <SelectItem value="song_scoped">Recording-scoped</SelectItem>
                  <SelectItem value="work_collab">Composition (work)</SelectItem>
                  {isAdmin && <SelectItem value="org_wide">Org-wide (admin)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {composeType === "song_scoped" && (
              <div className="space-y-2">
                <Label>Recording</Label>
                <Select value={composeSongId} onValueChange={setComposeSongId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recording" />
                  </SelectTrigger>
                  <SelectContent>
                    {songs.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {composeType === "work_collab" && (
              <div className="space-y-2">
                <Label>Composition (Work)</Label>
                <Select value={composeWorkId} onValueChange={setComposeWorkId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select composition" />
                  </SelectTrigger>
                  <SelectContent>
                    {worksOptions.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{composeType === "direct" ? "Other person" : "Participants"}</Label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {peers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No collaborators available.</p>
                )}
                {peers.map((p) => {
                  const checked =
                    composeType === "direct"
                      ? composeParticipantIds[0] === p.id
                      : composeParticipantIds.includes(p.id)
                  return (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type={composeType === "direct" ? "radio" : "checkbox"}
                        name={composeType === "direct" ? "direct-peer" : undefined}
                        checked={checked}
                        onChange={() =>
                          composeType === "direct"
                            ? togglePeer(p.id) // parent sets [id] for direct via togglePeer
                            : togglePeer(p.id)
                        }
                      />
                      <span>
                        {p.firstName} {p.lastName}
                        {p.email ? ` (${p.email})` : ""}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={creatingThread}>
                {creatingThread ? "Creating…" : "Create"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
