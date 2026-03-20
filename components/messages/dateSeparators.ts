export function formatDayLabel(d: Date): string {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
