<script setup lang="ts">
import { useApolloClient, useMutation, useSubscription } from '@vue/apollo-composable'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader, { type FeedNotification } from '@/components/AppHeader.vue'
import CreateBlogModal, { type PublishedBlogPost } from '@/components/CreateBlogModal.vue'
import {
  ALL_BLOG_POSTS_QUERY,
  BLOG_PUBLISHED_SUBSCRIPTION,
  DELETE_POST_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
  MY_NOTIFICATIONS_QUERY,
} from '@/graphql/blog'
import { ME_QUERY } from '@/graphql/auth'
import type { AuthUser, MeResponse } from '@/types/auth'
import type { BlogNotificationRow, BlogPost, BlogPublishedPayload } from '@/types/blog'
import { clearAuthSession, getAuthToken, setAuthUserJson } from '@/utils/auth-storage'
import { formatDateTime } from '@/utils/datetime'
import { extractGraphQLErrorMessage } from '@/utils/graphql-errors'
import { sortByCreatedAtDesc } from '@/utils/sorting'

function mapNotificationToFeed(n: BlogNotificationRow): FeedNotification {
  return {
    id: n.id,
    postId: n.post.id,
    title: n.post.title,
    content: n.post.content,
    authorName: n.post.authorName,
    authorId: n.post.authorId,
    createdAt: n.post.createdAt,
    read: n.read,
  }
}

const router = useRouter()
const { resolveClient } = useApolloClient()

const user = ref<AuthUser | null>(null)
const posts = ref<BlogPost[]>([])
const loading = ref(true)
const postsLoadFailed = ref(false)
const modalOpen = ref(false)
const editingPost = ref<BlogPost | null>(null)
const deleteConfirmPost = ref<BlogPost | null>(null)
const deleteError = ref('')
const notifications = ref<FeedNotification[]>([])
const notificationsOpen = ref(false)
const toasts = ref<{ id: string; message: string; kind: 'self' | 'other' }[]>([])
const previewPost = ref<BlogPost | null>(null)

let toastSeq = 0

const userName = computed(() => user.value?.name ?? '')
const currentUserId = computed(() => user.value?.id ?? '')

const feedTab = ref<'all' | 'mine'>('all')

const displayedPosts = computed(() => {
  if (feedTab.value !== 'mine' || !currentUserId.value) {
    return posts.value
  }

  return posts.value.filter((post) => post.authorId === currentUserId.value)
})

const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

const subscriptionOptions = computed(() => ({
  enabled: !!user.value?.id,
  errorPolicy: 'all' as const,
}))

const blogPublishedSub = useSubscription<{ blogPublished: BlogPublishedPayload }>(
  BLOG_PUBLISHED_SUBSCRIPTION,
  null,
  subscriptionOptions,
)

const { mutate: runDeletePost, loading: deletePostLoading } = useMutation(DELETE_POST_MUTATION)

blogPublishedSub.onResult(({ data }) => {
  const payload = data?.blogPublished
  if (!payload?.post) {
    return
  }

  ingestBlogPublished(payload)
})

blogPublishedSub.onError((err) => {
  if (import.meta.env.DEV) {
    console.warn('[BlogPublished subscription]', err.message)
  }
})

async function refetchNotifications(): Promise<void> {
  if (!user.value?.id) {
    return
  }

  try {
    const client = resolveClient()
    const { data } = await client.query<{ myNotifications: BlogNotificationRow[] }>({
      query: MY_NOTIFICATIONS_QUERY,
      fetchPolicy: 'network-only',
    })

    const list = data?.myNotifications
    notifications.value = Array.isArray(list) ? list.map(mapNotificationToFeed) : []
  } catch {
    /* keep existing list */
  }
}

function pushToast(message: string, kind: 'self' | 'other') {
  const id = `toast-${++toastSeq}`
  toasts.value = [...toasts.value, { id, message, kind }]

  window.setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4500)
}

function ingestBlogPublished(payload: BlogPublishedPayload) {
  const { post, authorName } = payload
  const meId = user.value?.id
  const isSelf = meId != null && post.authorId === meId

  mergePostIntoFeed(post, authorName)
  void refetchNotifications()

  const shortTitle = post.title.length > 48 ? `${post.title.slice(0, 48)}…` : post.title
  if (isSelf) {
    pushToast(`Your story is live: ${shortTitle}`, 'self')
  } else {
    pushToast(`${authorName} published: ${shortTitle}`, 'other')
  }
}

function mergePostIntoFeed(post: BlogPost, authorName: string) {
  const merged: BlogPost = {
    ...post,
    authorName: post.authorName || authorName,
  }
  const without = posts.value.filter((p) => p.id !== merged.id)
  posts.value = sortByCreatedAtDesc([...without, merged])
  postsLoadFailed.value = false
}

watch(modalOpen, (open) => {
  if (!open) {
    editingPost.value = null
  }
})

watch(notificationsOpen, async (open) => {
  if (!open) {
    return
  }

  try {
    const client = resolveClient()
    await client.mutate({ mutation: MARK_ALL_NOTIFICATIONS_READ_MUTATION })
    await refetchNotifications()
  } catch {
    notifications.value = notifications.value.map((n) => ({ ...n, read: true }))
  }
})

function openPostPreviewFromNotification(n: FeedNotification) {
  notificationsOpen.value = false

  const fromFeed = posts.value.find((p) => p.id === n.postId)
  if (fromFeed) {
    previewPost.value = { ...fromFeed }
    return
  }

  previewPost.value = {
    id: n.postId,
    title: n.title,
    content: n.content,
    authorId: n.authorId,
    authorName: n.authorName,
    createdAt: n.createdAt,
  }
}

function closePostPreview() {
  previewPost.value = null
}

function signOut() {
  clearAuthSession()
  void router.push('/')
}

async function loadData() {
  loading.value = true
  postsLoadFailed.value = false

  try {
    if (!getAuthToken()) {
      void router.replace('/')
      return
    }

    const client = resolveClient()
    const meResult = await client.query<MeResponse>({
      query: ME_QUERY,
      fetchPolicy: 'network-only',
    })

    if (!meResult.data?.me) {
      clearAuthSession()
      void router.replace('/')
      return
    }

    const me = meResult.data.me

    user.value = me
    setAuthUserJson(me)

    const [postsSettled, notifSettled] = await Promise.allSettled([
      client.query<{ allBlogPosts: BlogPost[] }>({
        query: ALL_BLOG_POSTS_QUERY,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      }),
      client.query<{ myNotifications: BlogNotificationRow[] }>({
        query: MY_NOTIFICATIONS_QUERY,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      }),
    ])

    if (notifSettled.status === 'fulfilled') {
      const notifList = notifSettled.value.data?.myNotifications
      notifications.value = Array.isArray(notifList) ? notifList.map(mapNotificationToFeed) : []
    }

    if (postsSettled.status === 'fulfilled') {
      const list = postsSettled.value.data?.allBlogPosts
      if (Array.isArray(list)) {
        posts.value = sortByCreatedAtDesc(list)
        postsLoadFailed.value = false
      } else {
        posts.value = []
        postsLoadFailed.value = true
      }
    } else {
      posts.value = []
      postsLoadFailed.value = true
    }
  } catch {
    clearAuthSession()
    void router.replace('/')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadData()
})

function openCreateModal() {
  editingPost.value = null
  modalOpen.value = true
}

function openEditModal(post: BlogPost) {
  editingPost.value = post
  modalOpen.value = true
}

function openDeleteConfirm(post: BlogPost) {
  deleteError.value = ''
  deleteConfirmPost.value = post
}

function cancelDeleteConfirm() {
  deleteConfirmPost.value = null
  deleteError.value = ''
}

async function confirmDeletePost() {
  const post = deleteConfirmPost.value
  if (!post) {
    return
  }

  deleteError.value = ''

  try {
    const result = await runDeletePost({ id: post.id })

    if (!result?.data?.deletePost) {
      throw new Error('Delete did not complete.')
    }

    posts.value = posts.value.filter((p) => p.id !== post.id)

    if (previewPost.value?.id === post.id) {
      previewPost.value = null
    }

    deleteConfirmPost.value = null
    void refetchNotifications()
  } catch (error) {
    deleteError.value = extractGraphQLErrorMessage(error)
  }
}

async function onPublished(created: PublishedBlogPost) {
  await loadData()

  const alreadyListed = posts.value.some((post) => post.id === created.id)

  if (postsLoadFailed.value || !alreadyListed) {
    posts.value = sortByCreatedAtDesc([
      created,
      ...posts.value.filter((post) => post.id !== created.id),
    ])
    postsLoadFailed.value = false
  }
}

function onPostUpdated(updated: PublishedBlogPost) {
  const merged: BlogPost = { ...updated }
  posts.value = sortByCreatedAtDesc(
    posts.value.map((p) => (p.id === merged.id ? merged : p)),
  )

  if (previewPost.value?.id === merged.id) {
    previewPost.value = { ...previewPost.value, ...merged }
  }

  postsLoadFailed.value = false
}
</script>

<template>
  <div class="blogs-layout" data-cy="blogs-root">
    <AppHeader
      v-model:notifications-open="notificationsOpen"
      :user-name="userName"
      :current-user-id="currentUserId"
      :unread-count="unreadCount"
      :notifications="notifications"
      @sign-out="signOut"
      @open-notification="openPostPreviewFromNotification"
    />

    <div class="toast-stack" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="t.kind === 'self' ? 'toast-self' : 'toast-other'"
          role="status"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>

    <main class="blogs-main">
      <div class="page-head">
        <div>
          <p class="eyebrow">Community</p>
          <h1 class="title">Published blogs</h1>
          <p class="subtitle">
            Plain text posts from everyone on the platform — new stories appear here as they are
            published.
          </p>
        </div>
        <button
          id="blogs-create-cta"
          type="button"
          class="cta-button"
          data-cy="blogs-create"
          @click="openCreateModal"
        >
          Create new blog
        </button>
      </div>

      <div
        v-if="!loading"
        class="feed-toolbar"
        data-cy="blogs-feed-toolbar"
        role="tablist"
        aria-label="Blog feed filter"
      >
        <button
          type="button"
          role="tab"
          class="feed-tab"
          data-cy="blogs-tab-all"
          :class="{ active: feedTab === 'all' }"
          :aria-selected="feedTab === 'all'"
          @click="feedTab = 'all'"
        >
          All blogs
        </button>
        <button
          type="button"
          role="tab"
          class="feed-tab"
          data-cy="blogs-tab-mine"
          :class="{ active: feedTab === 'mine' }"
          :aria-selected="feedTab === 'mine'"
          @click="feedTab = 'mine'"
        >
          My blogs
        </button>
      </div>

      <div v-if="loading" class="state muted" data-cy="blogs-loading">Loading posts…</div>

      <div v-else-if="!posts.length" class="state empty-card">
        <p class="empty-title">{{ postsLoadFailed ? 'Could not load posts' : 'No posts yet' }}</p>
        <p class="muted">
          {{
            postsLoadFailed
              ? 'We could not load the feed. You can still try publishing a new blog.'
              : 'Be the first to publish with the button above.'
          }}
        </p>
      </div>

      <div v-else-if="!displayedPosts.length" class="state empty-card">
        <p class="empty-title">No posts of yours yet</p>
        <p class="muted">
          Switch to &quot;All blogs&quot; to see what others are publishing, or create your first
          post with the button above.
        </p>
      </div>

      <ul v-else class="post-list" data-cy="blogs-post-list">
        <li v-for="post in displayedPosts" :key="post.id" class="post-card" data-cy="blogs-post-card">
          <p class="post-author">
            <span v-if="post.authorId === currentUserId" class="author-pill yours">You</span>
            <span v-else class="author-pill">{{ post.authorName }}</span>
          </p>
          <h2 class="post-title">{{ post.title }}</h2>
          <div class="post-body">{{ post.content }}</div>
          <div class="post-footer">
            <time class="post-date" :datetime="post.createdAt">{{
              formatDateTime(post.createdAt)
            }}</time>
            <div v-if="post.authorId === currentUserId" class="post-actions">
              <button
                type="button"
                class="post-action-btn"
                aria-label="Edit post"
                title="Edit"
                @click.stop="openEditModal(post)"
              >
                <svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="post-action-btn post-action-btn-danger"
                aria-label="Delete post"
                title="Delete"
                @click.stop="openDeleteConfirm(post)"
              >
                <svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"
                  />
                </svg>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </main>

    <CreateBlogModal
      v-model="modalOpen"
      :editing-post="editingPost"
      @published="onPublished"
      @updated="onPostUpdated"
    />

    <Teleport to="body">
      <div
        v-if="previewPost"
        class="preview-backdrop"
        data-cy="post-preview-backdrop"
        role="presentation"
        @click.self="closePostPreview"
      >
        <div
          class="preview-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-post-title"
          @click.stop
        >
          <div class="preview-card post-card" data-cy="post-preview">
            <div class="preview-head">
              <p class="post-author">
                <span v-if="previewPost.authorId === currentUserId" class="author-pill yours"
                  >You</span
                >
                <span v-else class="author-pill">{{ previewPost.authorName }}</span>
              </p>
              <button
                type="button"
                class="preview-close"
                aria-label="Close"
                @click="closePostPreview"
              >
                ×
              </button>
            </div>
            <h2 id="preview-post-title" class="post-title">{{ previewPost.title }}</h2>
            <div class="post-body post-body-full">{{ previewPost.content }}</div>
            <time class="post-date" :datetime="previewPost.createdAt">{{
              formatDateTime(previewPost.createdAt)
            }}</time>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="deleteConfirmPost"
        class="preview-backdrop"
        role="presentation"
        @click.self="cancelDeleteConfirm"
      >
        <div
          class="delete-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
          @click.stop
        >
          <h3 id="delete-dialog-title" class="delete-dialog-title">Delete this post?</h3>
          <p id="delete-dialog-desc" class="delete-dialog-desc">
            This removes the post for everyone and cannot be undone.
          </p>
          <p v-if="deleteError" class="delete-dialog-error">{{ deleteError }}</p>
          <div class="delete-dialog-actions">
            <button type="button" class="delete-btn-secondary" @click="cancelDeleteConfirm">
              Cancel
            </button>
            <button
              type="button"
              class="delete-btn-primary"
              :disabled="deletePostLoading"
              @click="confirmDeletePost"
            >
              {{ deletePostLoading ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.blogs-layout {
  min-height: 100vh;
  background: transparent;
}

.toast-stack {
  position: fixed;
  top: 5.25rem;
  right: 1.25rem;
  z-index: 60;
  display: flex;
  max-width: min(22rem, calc(100vw - 2.5rem));
  flex-direction: column;
  align-items: flex-end;
  gap: 0.55rem;
  pointer-events: none;
}

.toast {
  pointer-events: none;
  border-radius: 14px;
  padding: 0.75rem 1rem;
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.35;
  box-shadow: var(--rp-shadow, 0 8px 28px rgba(0, 61, 54, 0.08));
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
}

.toast-self {
  color: var(--rp-teal-900, #003d36);
  background: linear-gradient(
    135deg,
    var(--rp-peach-deep, #ffe9d9) 0%,
    var(--rp-teal-100, #d0f0f0) 100%
  );
}

.toast-other {
  color: var(--rp-text, #1a1f1e);
  background: var(--rp-white, #fff);
  border-color: var(--rp-teal-200, #a3e4dc);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.blogs-main {
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 3rem;
}

.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.feed-toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 22rem;
  margin-bottom: 1.25rem;
  padding: 0.2rem;
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 14px;
  background: var(--rp-teal-50, #eef9f7);
}

.feed-tab {
  border: 0;
  border-radius: 11px;
  padding: 0.55rem 0.75rem;
  background: transparent;
  color: var(--rp-text-soft, #6b7875);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 800;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
}

.feed-tab.active {
  color: var(--rp-white, #fff);
  background: var(--rp-teal-800, #004d40);
  box-shadow: 0 4px 14px rgba(0, 77, 64, 0.18);
}

.feed-tab:focus-visible {
  outline: 2px solid var(--rp-focus, rgba(13, 107, 95, 0.45));
  outline-offset: 2px;
}

.eyebrow {
  margin-bottom: 0.35rem;
  color: var(--rp-teal-700, #0d6b5f);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.title {
  margin: 0 0 0.35rem;
  color: var(--rp-teal-900, #003d36);
  font-size: clamp(1.75rem, 4vw, 2.35rem);
  font-weight: 820;
  letter-spacing: -0.04em;
}

.subtitle {
  margin: 0;
  color: var(--rp-text-muted, #4a5654);
  font-size: 0.95rem;
}

.cta-button {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1.25rem;
  color: var(--rp-white, #fff);
  background: var(--rp-orange, #f26522);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 850;
  white-space: nowrap;
  box-shadow: 0 12px 28px rgba(242, 101, 34, 0.28);
}

.cta-button:hover {
  background: var(--rp-orange-hover, #e05518);
}

.state {
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 20px;
  padding: 2rem 1.25rem;
  text-align: center;
  background: var(--rp-white, #fff);
  box-shadow: var(--rp-shadow, 0 8px 28px rgba(0, 61, 54, 0.08));
}

.muted {
  color: var(--rp-text-muted, #4a5654);
}

.empty-card {
  background: linear-gradient(165deg, var(--rp-peach, #fdf2e9) 0%, var(--rp-white, #fff) 70%);
}

.empty-title {
  margin: 0 0 0.35rem;
  color: var(--rp-teal-900, #003d36);
  font-size: 1.15rem;
  font-weight: 800;
}

.post-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-card {
  display: flex;
  min-height: 12rem;
  flex-direction: column;
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 20px;
  padding: 1.1rem 1.15rem;
  background: linear-gradient(165deg, var(--rp-peach, #fdf2e9) 0%, var(--rp-white, #fff) 55%);
  box-shadow: var(--rp-shadow, 0 8px 28px rgba(0, 61, 54, 0.08));
}

.post-author {
  margin: 0 0 0.5rem;
}

.author-pill {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--rp-teal-100, #d0f0f0);
  color: var(--rp-teal-800, #004d40);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.author-pill.yours {
  color: var(--rp-white, #fff);
  background: var(--rp-orange, #f26522);
}

.post-title {
  margin: 0 0 0.65rem;
  color: var(--rp-teal-900, #003d36);
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.25;
}

.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
}

.post-date {
  margin: 0;
  min-width: 0;
  flex: 1;
  color: var(--rp-text-soft, #6b7875);
  font-size: 0.78rem;
}

.post-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
}

.post-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--rp-border-strong, rgba(0, 77, 64, 0.2));
  border-radius: 10px;
  background: var(--rp-white, #fff);
  color: var(--rp-teal-800, #004d40);
  cursor: pointer;
}

.post-action-btn:hover {
  background: var(--rp-teal-50, #eef9f7);
  color: var(--rp-orange, #f26522);
  border-color: var(--rp-orange, #f26522);
}

.post-action-btn-danger:hover {
  border-color: rgba(200, 48, 48, 0.55);
  color: #c12a2a;
  background: rgba(200, 48, 48, 0.06);
}

.post-action-icon {
  width: 1rem;
  height: 1rem;
}

.post-body {
  flex: 1;
  min-height: 0;
  margin: 0;
  overflow: hidden;
  color: var(--rp-text-muted, #4a5654);
  font-family: inherit;
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  line-clamp: 6;
}

.post-body-full {
  display: block;
  overflow: visible;
  -webkit-line-clamp: unset;
  line-clamp: unset;
}

.preview-backdrop {
  position: fixed;
  inset: 0;
  z-index: 75;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(0, 45, 40, 0.45);
  backdrop-filter: blur(10px);
}

.preview-dialog {
  width: min(100%, 520px);
  max-height: min(90vh, 640px);
  overflow: auto;
}

.preview-card {
  min-height: unset;
}

.preview-card .post-date {
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
}

.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.preview-head .post-author {
  margin: 0;
}

.preview-close {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--rp-border-strong, rgba(0, 77, 64, 0.2));
  border-radius: 12px;
  background: var(--rp-white, #fff);
  color: var(--rp-teal-800, #004d40);
  cursor: pointer;
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1;
}

.preview-close:hover {
  background: var(--rp-teal-50, #eef9f7);
  color: var(--rp-orange, #f26522);
}

.delete-dialog {
  width: min(100%, 400px);
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 20px;
  padding: 1.35rem 1.4rem 1.4rem;
  background: linear-gradient(165deg, var(--rp-peach, #fdf2e9) 0%, var(--rp-white, #fff) 65%);
  box-shadow: var(--rp-shadow-lg, 0 22px 50px rgba(0, 61, 54, 0.12));
}

.delete-dialog-title {
  margin: 0 0 0.5rem;
  color: var(--rp-teal-900, #003d36);
  font-size: 1.2rem;
  font-weight: 800;
}

.delete-dialog-desc {
  margin: 0 0 1.1rem;
  color: var(--rp-text-muted, #4a5654);
  font-size: 0.92rem;
  line-height: 1.45;
}

.delete-dialog-error {
  margin: 0 0 1rem;
  border-radius: 12px;
  padding: 0.65rem 0.85rem;
  color: #8b1d1d;
  background: rgba(242, 101, 34, 0.12);
  font-size: 0.88rem;
  font-weight: 700;
}

.delete-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
}

.delete-btn-secondary {
  border: 1px solid var(--rp-border-strong, rgba(0, 77, 64, 0.2));
  border-radius: 999px;
  padding: 0.65rem 1rem;
  background: var(--rp-white, #fff);
  color: var(--rp-teal-900, #003d36);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 750;
}

.delete-btn-secondary:hover {
  background: var(--rp-teal-50, #eef9f7);
}

.delete-btn-primary {
  border: 0;
  border-radius: 999px;
  padding: 0.65rem 1.15rem;
  background: #c12a2a;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
}

.delete-btn-primary:hover:not(:disabled) {
  background: #a32222;
}

.delete-btn-primary:disabled {
  cursor: wait;
  opacity: 0.65;
}

@media (max-width: 960px) {
  .post-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .post-list {
    grid-template-columns: 1fr;
  }

  .toast-stack {
    right: 0.85rem;
    left: 0.85rem;
    max-width: none;
    align-items: stretch;
  }
}
</style>
