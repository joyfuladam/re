import { Suspense } from "react"
import NewSongForm from "./NewSongForm"

export default function NewSongPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">Loading…</div>
      }
    >
      <NewSongForm />
    </Suspense>
  )
}
