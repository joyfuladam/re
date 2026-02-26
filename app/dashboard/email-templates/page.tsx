"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichEmailEditor, type RichEmailEditorHandle } from "@/components/email/RichEmailEditor"
import { EmailPlaceholderBar } from "@/components/email/EmailPlaceholderBar"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string | null
  bodyText: string | null
  scope: string | null
  createdAt: string
  updatedAt: string
}

export default function EmailTemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === "admin"

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  const editorRef = useRef<RichEmailEditorHandle | null>(null)

  const [formState, setFormState] = useState({
    name: "",
    subject: "",
    bodyHtml: "",
    bodyText: "",
    scope: "",
  })

  useEffect(() => {
    if (status === "loading") return
    if (!isAdmin) {
      // Non-admins are redirected away by layout, but guard just in case
      router.push("/dashboard")
      return
    }
    fetchTemplates()
  }, [status, isAdmin])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/email-templates")
      if (!res.ok) {
        console.error("Failed to load email templates")
        return
      }
      const data = await res.json()
      setTemplates(data)
    } catch (error) {
      console.error("Error fetching email templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedTemplate(null)
    setFormState({
      name: "",
      subject: "",
      bodyHtml: "",
      bodyText: "",
      scope: "",
    })
  }

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setFormState({
      name: template.name,
      subject: template.subject,
      bodyHtml: template.bodyHtml || "",
      bodyText: template.bodyText || "",
      scope: template.scope || "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: formState.name.trim(),
        subject: formState.subject.trim(),
        bodyHtml: formState.bodyHtml || null,
        bodyText: formState.bodyText || null,
        scope: formState.scope || null,
      }

      const url = selectedTemplate
        ? `/api/email-templates/${selectedTemplate.id}`
        : "/api/email-templates"
      const method = selectedTemplate ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        console.error("Failed to save email template:", error)
        alert(error.error || "Failed to save email template")
        return
      }

      await fetchTemplates()
      resetForm()
    } catch (error) {
      console.error("Error saving email template:", error)
      alert("Failed to save email template")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this email template? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/email-templates/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        console.error("Failed to delete email template:", error)
        alert(error.error || "Failed to delete email template")
        return
      }
      if (selectedTemplate?.id === id) {
        resetForm()
      }
      await fetchTemplates()
    } catch (error) {
      console.error("Error deleting email template:", error)
      alert("Failed to delete email template")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && templates.length === 0) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground">
          Create and manage reusable email templates for collaborators. Use the formatting toolbar
          and placeholder buttons to design messages that can be reused across songs and projects.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Saved Templates</CardTitle>
            <CardDescription>
              Select a template to edit or remove. Newest templates appear first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">No templates created yet.</p>
            )}
            {templates.length > 0 && (
              <div className="space-y-1">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                        {template.subject}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(template.id)}
                        disabled={deletingId === template.id}
                      >
                        {deletingId === template.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedTemplate ? "Edit Template" : "New Template"}</CardTitle>
            <CardDescription>
              Use placeholders like{" "}
              <code className="font-mono text-xs">{`{{song_title}}`}</code> to insert dynamic values.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="template-name">
                  Name
                </label>
                <Input
                  id="template-name"
                  value={formState.name}
                  onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Release update, Split confirmation, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="template-subject">
                  Subject
                </label>
                <Input
                  id="template-subject"
                  value={formState.subject}
                  onChange={(e) => setFormState((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Subject line for this email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="template-scope">
                  Scope (optional)
                </label>
                <Input
                  id="template-scope"
                  value={formState.scope}
                  onChange={(e) => setFormState((prev) => ({ ...prev, scope: e.target.value }))}
                  placeholder="e.g. collaborators, song_collaborators, global"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="template-body-html">
                  HTML Body
                </label>
                <EmailPlaceholderBar
                  onInsertPlaceholder={(token) =>
                    editorRef.current?.insertTextAtCursor(token)
                  }
                  onInsertLogo={() => {
                    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://riverandember.com"
                    const logoHtml = `<img src=\"${baseUrl}/images/logo.png\" alt=\"River & Ember\" style=\"width:150px;height:auto;\" />`
                    editorRef.current?.insertHtmlAtCursor(logoHtml)
                  }}
                />
                <RichEmailEditor
                  ref={editorRef}
                  value={formState.bodyHtml}
                  onChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      bodyHtml: value,
                    }))
                  }
                  placeholder="Main content of the email."
                />
              </div>


              <div className="flex items-center gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : selectedTemplate ? "Save Changes" : "Create Template"}
                </Button>
                {selectedTemplate && (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

