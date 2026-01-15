"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "next-auth/react"

export default function AskQuestionPage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    subject: "",
    message: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/faq/ask-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({
          name: session?.user?.name || "",
          email: session?.user?.email || "",
          subject: "",
          message: "",
        })
      } else {
        const data = await response.json()
        setError(data.error || "Failed to send question. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting question:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/faq">
          <Button variant="outline" className="mb-4">
            ← Back to FAQ
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <div className="space-y-4">
              <div className="text-4xl">✓</div>
              <h2 className="text-2xl font-semibold">Question Submitted!</h2>
              <p className="text-muted-foreground">
                Thank you for your question. We&apos;ll get back to you as soon as possible at {formData.email}.
              </p>
              <Button onClick={() => setSubmitted(false)} variant="outline">
                Ask Another Question
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/faq">
          <Button variant="outline" className="mb-4">
            ← Back to FAQ
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Ask a Question</h1>
        <p className="text-muted-foreground mt-2">
          Have a question about your collaboration with River and Ember? Fill out the form below and we&apos;ll get back to you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Form</CardTitle>
          <CardDescription>
            We typically respond within 1-2 business days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Question about revenue share, Wings Access registration, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Please provide as much detail as possible..."
                rows={8}
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Sending..." : "Send Question"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
