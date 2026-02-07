import { Resend } from 'resend'

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    // Determine the from email based on whether domain is verified
    // If RESEND_FROM_EMAIL is set, use it (your verified domain)
    // Otherwise, use Resend's sandbox domain for testing
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = 'River & Ember'
    
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      text,
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(error.message)
    }

    console.log('Email sent via Resend:', data?.id)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

// Template for account approval email
export function getAccountApprovalEmail(
  firstName: string,
  setupLink: string
): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to River & Ember!</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Great news! Your account request has been approved by our team.</p>
            <p>Click the button below to set up your password and complete your account setup:</p>
            <p style="text-align: center;">
              <a href="${setupLink}" class="button">Set Up My Account</a>
            </p>
            <p><strong>Important:</strong> This link will expire in 48 hours for security reasons.</p>
            <p>If you didn't request this account, please ignore this email or contact us if you have concerns.</p>
            <p>Best regards,<br>The River & Ember Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} River & Ember. All rights reserved.</p>
            <p>If the button doesn't work, copy and paste this link:<br>${setupLink}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Welcome to River & Ember!

Hi ${firstName},

Great news! Your account request has been approved by our team.

Click the link below to set up your password and complete your account setup:
${setupLink}

Important: This link will expire in 48 hours for security reasons.

If you didn't request this account, please ignore this email or contact us if you have concerns.

Best regards,
The River & Ember Team

---
© ${new Date().getFullYear()} River & Ember. All rights reserved.
  `

  return { html, text }
}

// Template for account request notification (to admins)
export function getAccountRequestNotificationEmail(
  firstName: string,
  lastName: string,
  email: string,
  dashboardLink: string
): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info { background: white; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Account Request</h1>
          </div>
          <div class="content">
            <p>A new user has requested an account:</p>
            <div class="info">
              <p><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> ${email}</p>
            </div>
            <p style="text-align: center;">
              <a href="${dashboardLink}" class="button">Review Request</a>
            </p>
            <p>Please review this request in your admin dashboard and approve or reject as appropriate.</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
New Account Request

A new user has requested an account:

Name: ${firstName} ${lastName}
Email: ${email}

Please review this request in your admin dashboard:
${dashboardLink}
  `

  return { html, text }
}
