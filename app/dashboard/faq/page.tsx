"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FAQPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-2">
          This section will help you with everything you need to know in order to be a collaborator with River and Ember.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/faq/getting-paid">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle>Getting Paid</CardTitle>
              <CardDescription>
                Learn how to register with Wings Access to collect your revenue share
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/faq/ask-question">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
              <CardDescription>
                Have a question? Fill out our form and we&apos;ll get back to you
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
