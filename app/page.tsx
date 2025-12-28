import Link from "next/link"

export default function Home() {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:4',message:'Home component rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">River & Ember</h1>
      <p className="text-xl mb-8">Record Label Management System</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
        >
          Register
        </Link>
      </div>
    </div>
  )
}

