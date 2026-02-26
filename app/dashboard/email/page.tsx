"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichEmailEditor, type RichEmailEditorHandle } from "@/components/email/RichEmailEditor"
import { EmailPlaceholderBar } from "@/components/email/EmailPlaceholderBar"

type Scope = "all_collaborators" | "song_collaborators" | "specific_collaborators"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string | null
  bodyText: string | null
  scope: string | null
}

interface SongOption {
  id: string
  title: string
}

interface CollaboratorOption {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

export default function EmailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const isAdmin = session?.user?.role === "admin"

  const initialSongId = searchParams.get("songId") || ""
  const initialScopeParam = searchParams.get("scope") as Scope | null

  const [scope, setScope] = useState<Scope>(initialScopeParam || (initialSongId ? "song_collaborators" : "all_collaborators"))
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [songId, setSongId] = useState(initialSongId)
  const [songs, setSongs] = useState<SongOption[]>([])
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([])
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const editorRef = useRef<RichEmailEditorHandle | null>(null)
  const [previewHtml, setPreviewHtml] = useState("")

  useEffect(() => {
    if (status === "loading") return
    if (!isAdmin) {
      router.push("/dashboard")
      return
    }
    void initialize()
  }, [status, isAdmin])

  const initialize = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchTemplates(), fetchSongs(), fetchCollaborators()])
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/email-templates")
      if (!res.ok) return
      const data = await res.json()
      setTemplates(data)
    } catch (error) {
      console.error("Error fetching email templates:", error)
    }
  }

  const fetchSongs = async () => {
    try {
      const res = await fetch("/api/songs")
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setSongs(
          data.map((s: any) => ({
            id: s.id,
            title: s.title,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching songs:", error)
    }
  }

  const fetchCollaborators = async () => {
    try {
      const res = await fetch("/api/collaborators?status=active")
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setCollaborators(
          data.map((c: any) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email ?? null,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error)
    }
  }

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id)
    if (!id) return
    const template = templates.find((t) => t.id === id)
    if (!template) return
    setSubject(template.subject)
    setBodyHtml(template.bodyHtml || "")
    setBodyText(template.bodyText || "")
  }

  const handleScopeChange = (newScope: Scope) => {
    setScope(newScope)
  }

  const toggleCollaboratorSelection = (id: string) => {
    setSelectedCollaboratorIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const currentSongTitle = useMemo(() => {
    if (!songId) return ""
    const song = songs.find((s) => s.id === songId)
    return song?.title || ""
  }, [songId, songs])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const payload: any = {
        templateId: selectedTemplateId || null,
        subject,
        bodyHtml,
        bodyText,
        scope,
        songId: scope === "song_collaborators" ? songId || null : null,
        collaboratorIds: scope === "specific_collaborators" ? selectedCollaboratorIds : null,
        bccMode: "single_bcc",
      }

      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error("Failed to send email:", data)
        alert(data.error || "Failed to send email")
        return
      }

      alert(`Email queued to ${data.recipients ?? "the selected"} collaborator(s).`)
    } catch (error) {
      console.error("Error sending email:", error)
      alert("Failed to send email")
    } finally {
      setSending(false)
    }
  }

  const computePreview = () => {
    // Simple placeholder replacement for preview purposes (client-side only)
    let html = bodyHtml || ""
    if (currentSongTitle) {
      html = html.replace(/\{\{song_title\}\}/g, currentSongTitle)
    }
    setPreviewHtml(html)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Collaborators</h1>
        <p className="text-muted-foreground">
          Send broadcast emails to all collaborators, collaborators on a specific song, or a
          selected group.
        </p>
      </div>

      <form className="space-y-6 max-w-5xl" onSubmit={handleSend}>
        <Card>
          <CardHeader>
            <CardTitle>Audience</CardTitle>
            <CardDescription>
              Choose who should receive this email. Emails are sent as a single message with all
              recipients in BCC.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Scope</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={scope}
                onChange={(e) => handleScopeChange(e.target.value as Scope)}
              >
                <option value="all_collaborators">All collaborators (entire database)</option>
                <option value="song_collaborators">Collaborators on a specific song</option>
                <option value="specific_collaborators">Selected collaborators</option>
              </select>
            </div>

            {scope === "song_collaborators" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Song</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={songId}
                  onChange={(e) => setSongId(e.target.value)}
                  required
                >
                  <option value="">Select a song…</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                    </option>
                  ))}
                </select>
                {currentSongTitle && (
                  <p className="text-xs text-muted-foreground">
                    Sending to collaborators attached to <strong>{currentSongTitle}</strong>.
                  </p>
                )}
              </div>
            )}

            {scope === "specific_collaborators" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Collaborators</label>
                <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1 bg-background">
                  {collaborators.length === 0 && (
                    <p className="text-xs text-muted-foreground">No collaborators found.</p>
                  )}
                  {collaborators.map((c) => {
                    const label = `${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ""}`
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={selectedCollaboratorIds.includes(c.id)}
                          onChange={() => toggleCollaboratorSelection(c.id)}
                        />
                        <span>{label}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedCollaboratorIds.length} collaborator
                  {selectedCollaboratorIds.length === 1 ? "" : "s"}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              Choose a template or compose a one-off message. You can still edit the subject and
              body after selecting a template. Formatting and dynamic placeholders are supported via
              the toolbar below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template (optional)</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">No template (custom message)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email-subject">
                Subject
              </label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email-body-html">
                HTML Body
              </label>
              <EmailPlaceholderBar
                onInsertPlaceholder={(token) =>
                  editorRef.current?.insertTextAtCursor(token)
                }
                onInsertLogo={() => {
                  const baseUrl =
                    process.env.NEXT_PUBLIC_SITE_URL ||
                    process.env.NEXTAUTH_URL ||
                    "https://riverandember.com"
                  const logoHtml = `<img src=\"${baseUrl}/images/logo.png\" alt=\"River & Ember\" style=\"width:150px;height:auto;\" />`
                  editorRef.current?.insertHtmlAtCursor(logoHtml)
                }}
              />
              <RichEmailEditor
                ref={editorRef}
                value={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Main content of the email."
              />
              <p className="text-xs text-muted-foreground">
                Supported placeholders:{" "}
                <code className="font-mono text-xs">{`{{song_title}}`}</code>. Additional placeholders
                can be added later.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email-body-text">
                Plain Text Body (optional)
              </label>
              <Textarea
                id="email-body-text"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="min-h-[140px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send Email"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Emails are sent as a single message with everyone in BCC to keep addresses private.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              This preview shows how the HTML body will roughly look with basic placeholders (like
              song title) filled in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={computePreview}>
                Refresh Preview
              </Button>
              {currentSongTitle && (
                <p className="text-xs text-muted-foreground">
                  Using <code className="font-mono text-xs">{`{{song_title}}`}</code> →{" "}
                  <strong>{currentSongTitle}</strong>
                </p>
              )}
            </div>
            {previewHtml ? (
              <div className="border rounded-md p-4 prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Click &quot;Refresh Preview&quot; to view a rendered version of your email body.
              </p>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

