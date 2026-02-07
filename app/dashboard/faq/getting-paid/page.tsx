"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function GettingPaidPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/faq">
          <Button variant="outline" className="mb-4">
            ← Back to FAQ
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Getting Paid</h1>
        <p className="text-muted-foreground mt-2">
          Register with Wings Access to collect your revenue share from River and Ember releases
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wings Access Registration</CardTitle>
          <CardDescription>
            Wings Access is a free platform that allows you to collect your revenue share from digital music distribution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">What is Wings Access?</h2>
            <p className="text-muted-foreground mb-4">
              Wings Access is a free platform that connects artists and collaborators with their revenue from digital music distribution. 
              It provides a simple way to receive payments from streaming platforms, downloads, and other digital revenue sources.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Step 1: Create Your Account</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Visit the Wings Access website at <a href="https://wingsaccess.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">wingsaccess.com</a></li>
              <li>Click on &quot;Sign Up&quot; or &quot;Create Account&quot;</li>
              <li>Enter your email address and create a password</li>
              <li>Verify your email address by clicking the link sent to your inbox</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Step 2: Complete Your Profile</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Fill in your personal information (name, address, phone number)</li>
              <li>Add your payment information (bank account or PayPal details)</li>
              <li>Upload any required identification documents if prompted</li>
              <li>Complete your tax information (W-9 for US residents, W-8BEN for international)</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Step 3: Link Your River and Ember Account</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Once your Wings Access account is set up, contact River and Ember at <a href="mailto:admin@riverandember.com" className="text-primary hover:underline">admin@riverandember.com</a></li>
              <li>Provide your Wings Access account email address</li>
              <li>We will link your account to your revenue shares</li>
              <li>You will receive notifications when payments are available</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Step 4: Receive Payments</h2>
            <p className="text-muted-foreground mb-2">
              Once your account is linked:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>You will receive quarterly statements showing your revenue share</li>
              <li>Payments will be processed automatically based on your contract terms</li>
              <li>You can view your payment history and upcoming payments in your Wings Access dashboard</li>
              <li>Payments are typically processed within 30 days of the statement date</li>
            </ul>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Important Notes:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Wings Access registration is completely free - there are no fees to sign up or receive payments</li>
              <li>Make sure to use the same email address for Wings Access that you use for your River and Ember account</li>
              <li>Keep your payment information up to date to avoid payment delays</li>
              <li>If you have questions about Wings Access, contact their support team or reach out to us at <a href="mailto:admin@riverandember.com" className="text-primary hover:underline">admin@riverandember.com</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Need Help?</h2>
            <p className="text-muted-foreground">
              If you encounter any issues during registration or have questions about the process, please don&apos;t hesitate to reach out. 
              You can use our <Link href="/dashboard/faq/ask-question" className="text-primary hover:underline">Ask a Question</Link> form or email us directly at <a href="mailto:admin@riverandember.com" className="text-primary hover:underline">admin@riverandember.com</a>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
