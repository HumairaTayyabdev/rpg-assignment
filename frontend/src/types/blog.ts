export interface BlogPost {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  createdAt: string
}

export interface BlogPublishedPayload {
  post: BlogPost
  authorName: string
}

export interface BlogNotificationRow {
  id: string
  read: boolean
  createdAt: string
  post: BlogPost
}
