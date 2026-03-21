export type ThreadType =
  | "direct"
  | "group"
  | "song_scoped"
  | "songwriting"
  | "org_wide"
  | "work_collab"

export interface MessageSender {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  /** Profile image URL when set */
  image?: string | null
}

export interface ThreadSummary {
  id: string
  subject: string
  threadType: ThreadType
  song: { id: string; title: string } | null
  work?: { id: string; title: string } | null
  /** For direct threads: the other participant’s display name (API-enriched). */
  directPeerName?: string | null
  lastMessage: {
    id: string
    createdAt: string
    preview: string
    sender: MessageSender
  } | null
  updatedAt: string
  unreadCount: number
}

export interface MessageReaction {
  emoji: string
  userIds: string[]
}

export interface MessageAttachment {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  url: string
}

export interface ThreadMessage {
  id: string
  createdAt: string
  updatedAt?: string | null
  bodyHtml: string | null
  bodyText: string | null
  parentMessageId: string | null
  rootMessageId: string | null
  deletedAt?: string | null
  sender: MessageSender
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
}

export interface ThreadParticipantBrief {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  image: string | null
}

export interface ThreadDetail {
  id: string
  subject: string
  threadType: ThreadType
  song: { id: string; title: string } | null
  work?: { id: string; title: string } | null
  directPeerName?: string | null
  participants?: ThreadParticipantBrief[]
  messages: ThreadMessage[]
}

export const THREAD_TYPE_LABEL: Record<ThreadType, string> = {
  direct: "Direct",
  group: "Group",
  song_scoped: "Recording",
  songwriting: "Songwriting",
  org_wide: "Org-wide",
  work_collab: "Composition",
}

export const THREAD_SECTION_ORDER: ThreadType[] = [
  "direct",
  "group",
  "song_scoped",
  "songwriting",
  "work_collab",
  "org_wide",
]

export function displayName(sender: MessageSender) {
  const n = `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim()
  return n || sender.email || "Unknown"
}

export function threadListTitle(t: ThreadSummary): string {
  if (t.threadType === "direct" && t.directPeerName) {
    return t.directPeerName
  }
  return t.subject
}
