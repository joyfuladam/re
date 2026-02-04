/**
 * Script to create a SignWell webhook via API
 * 
 * Usage:
 *   npx tsx scripts/setup-signwell-webhook.ts <webhook-url>
 * 
 * Example:
 *   npx tsx scripts/setup-signwell-webhook.ts https://your-app.railway.app/api/esignature/webhook
 */

// Environment variables should be set in the environment or .env file
const SIGNWELL_API_KEY = process.env.SIGNWELL_API_KEY
// SignWell API base URL - based on documentation: https://www.signwell.com/api/v1/hooks/
const SIGNWELL_API_URL = process.env.SIGNWELL_API_URL || "https://www.signwell.com/api"

if (!SIGNWELL_API_KEY) {
  console.error("❌ SIGNWELL_API_KEY not found in environment variables")
  process.exit(1)
}

async function createWebhook(webhookUrl: string) {
  try {
    console.log("📡 Creating SignWell webhook...")
    console.log(`   URL: ${webhookUrl}`)
    console.log(`   API: ${SIGNWELL_API_URL}`)

    // SignWell webhook creation endpoint: POST /v1/hooks/
    // Based on SignWell API documentation: https://developers.signwell.com/reference/post_api-v1-hooks-1
    const response = await fetch(`${SIGNWELL_API_URL}/v1/hooks/`, {
      method: "POST",
      headers: {
        "X-Api-Key": SIGNWELL_API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json",
      },
      body: JSON.stringify({
        callback_url: webhookUrl,
        // api_application_id is optional (UUID)
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Failed to create webhook:", errorText)
      console.error(`   Status: ${response.status}`)
      process.exit(1)
    }

    const webhookData = await response.json()
    console.log("✅ Webhook created successfully!")
    console.log(`   Webhook ID: ${webhookData.id || webhookData.hook?.id || "N/A"}`)
    console.log(`   URL: ${webhookData.url || webhookData.hook?.url || webhookUrl}`)
    
    if (webhookData.secret) {
      console.log(`\n⚠️  Webhook Secret: ${webhookData.secret}`)
      console.log("   Update SIGNWELL_WEBHOOK_SECRET in Railway with this value:")
      console.log(`   railway variables set SIGNWELL_WEBHOOK_SECRET="${webhookData.secret}"`)
    }

    return webhookData
  } catch (error) {
    console.error("❌ Error creating webhook:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
    }
    process.exit(1)
  }
}

async function listWebhooks() {
  try {
    console.log("📋 Listing existing webhooks...")
    
    const response = await fetch(`${SIGNWELL_API_URL}/v1/hooks/`, {
      method: "GET",
      headers: {
        "X-Api-Key": SIGNWELL_API_KEY,
        "accept": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Failed to list webhooks:", errorText)
      return
    }

    const data = await response.json()
    const webhooks = data.hooks || data.data || data

    if (Array.isArray(webhooks) && webhooks.length > 0) {
      console.log(`\n📋 Found ${webhooks.length} webhook(s):`)
      webhooks.forEach((hook: any, index: number) => {
        console.log(`\n   ${index + 1}. ID: ${hook.id}`)
        console.log(`      URL: ${hook.url}`)
        console.log(`      Events: ${hook.events?.join(", ") || "N/A"}`)
      })
    } else {
      console.log("   No webhooks found")
    }
  } catch (error) {
    console.error("❌ Error listing webhooks:", error)
  }
}

// Main execution
const webhookUrl = process.argv[2]

if (!webhookUrl) {
  console.error("❌ Webhook URL is required")
  console.error("\nUsage:")
  console.error("  npx tsx scripts/setup-signwell-webhook.ts <webhook-url>")
  console.error("\nExample:")
  console.error("  npx tsx scripts/setup-signwell-webhook.ts https://your-app.railway.app/api/esignature/webhook")
  console.error("\nTo list existing webhooks:")
  console.error("  npx tsx scripts/setup-signwell-webhook.ts --list")
  process.exit(1)
}

if (webhookUrl === "--list") {
  listWebhooks()
} else {
  createWebhook(webhookUrl)
}
