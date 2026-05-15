<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { formatDateTime } from '@/utils/datetime'
import { sortByCreatedAtDesc } from '@/utils/sorting'

export interface FeedNotification {
  id: string
  postId: string
  title: string
  content: string
  authorName: string
  authorId: string
  createdAt: string
  read: boolean
}

const props = defineProps<{
  userName: string
  currentUserId: string
  unreadCount: number
  notifications: FeedNotification[]
}>()

const notificationsOpen = defineModel<boolean>('notificationsOpen', { default: false })

const emit = defineEmits<{
  signOut: []
  openNotification: [notification: FeedNotification]
}>()

const menuOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const notifTab = ref<'activity' | 'yours'>('activity')

const initial = computed(() => {
  const trimmed = props.userName.trim()
  if (!trimmed) {
    return '?'
  }

  const first = [...trimmed][0]
  return first ? first.toUpperCase() : '?'
})

const badgeLabel = computed(() => {
  const n = props.unreadCount
  if (n <= 0) {
    return ''
  }
  return n > 99 ? '99+' : String(n)
})

const filteredNotifications = computed(() => {
  const list = sortByCreatedAtDesc(props.notifications)

  if (notifTab.value === 'yours') {
    return list.filter((n) => n.authorId === props.currentUserId)
  }

  return list
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) {
    notificationsOpen.value = false
  }
}

function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  if (notificationsOpen.value) {
    menuOpen.value = false
  }
}

function onSignOut() {
  menuOpen.value = false
  notificationsOpen.value = false
  emit('signOut')
}

function onDocumentClick(event: MouseEvent) {
  const el = rootRef.value
  if (!el) {
    return
  }

  if (event.target instanceof Node && !el.contains(event.target)) {
    menuOpen.value = false
    notificationsOpen.value = false
  }
}

function onNotificationClick(n: FeedNotification) {
  emit('openNotification', n)
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header ref="rootRef" class="app-header">
    <RouterLink class="brand" to="/blogs">RPG Blogs</RouterLink>

    <div class="actions">
      <div class="notif-wrap">
        <button
          type="button"
          class="icon-button bell"
          data-cy="header-notifications-btn"
          :aria-expanded="notificationsOpen"
          aria-haspopup="true"
          aria-label="Notifications"
          @click.stop="toggleNotifications"
        >
          <span class="bell-icon" aria-hidden="true">🔔</span>
          <span v-if="badgeLabel" class="badge">{{ badgeLabel }}</span>
        </button>

        <div
          v-if="notificationsOpen"
          class="notif-panel"
          data-cy="notif-panel"
          role="dialog"
          aria-label="Notifications"
        >
          <div class="notif-head">
            <p class="notif-title">Signal desk</p>
            <p class="notif-sub">Live publishes across RPG Blogs</p>
          </div>

          <div class="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="notifTab === 'activity'"
              class="tab"
              :class="{ active: notifTab === 'activity' }"
              @click="notifTab = 'activity'"
            >
              Activity
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="notifTab === 'yours'"
              class="tab"
              :class="{ active: notifTab === 'yours' }"
              @click="notifTab = 'yours'"
            >
              Yours
            </button>
          </div>

          <ul class="notif-list">
            <li v-if="!filteredNotifications.length" class="notif-empty">
              {{
                notifTab === 'yours'
                  ? 'No pings for your posts yet.'
                  : 'All quiet — new posts land here.'
              }}
            </li>
            <li v-for="n in filteredNotifications" :key="n.id" class="notif-item-wrap">
              <button
                type="button"
                class="notif-item"
                data-cy="notif-item"
                @click.stop="onNotificationClick(n)"
              >
                <span class="notif-dot" :class="{ unread: !n.read }" aria-hidden="true" />
                <div class="notif-body">
                  <p class="notif-line">
                    <span class="author">{{ n.authorName }}</span>
                    <span class="verb">published</span>
                  </p>
                  <p class="notif-post-title">{{ n.title }}</p>
                  <time class="notif-time" :datetime="n.createdAt">{{
                    formatDateTime(n.createdAt)
                  }}</time>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="profile">
        <button
          type="button"
          class="avatar"
          data-cy="header-account-btn"
          :aria-expanded="menuOpen"
          aria-haspopup="true"
          aria-label="Account menu"
          @click.stop="toggleMenu"
        >
          {{ initial }}
        </button>
        <div v-if="menuOpen" class="dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            class="dropdown-item"
            data-cy="header-sign-out"
            @click="onSignOut"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.5rem;
  border-bottom: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
}

.brand {
  color: var(--rp-teal-900, #003d36);
  font-size: 1.05rem;
  font-weight: 850;
  letter-spacing: 0.02em;
  text-decoration: none;
}

.brand:hover {
  color: var(--rp-orange, #f26522);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.notif-wrap {
  position: relative;
}

.icon-button {
  position: relative;
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 1px solid var(--rp-border-strong, rgba(0, 77, 64, 0.2));
  border-radius: 14px;
  background: var(--rp-white, #fff);
  cursor: pointer;
  color: var(--rp-teal-800, #004d40);
}

.icon-button:hover {
  background: var(--rp-teal-50, #eef9f7);
  border-color: var(--rp-teal-600, #1a7a6e);
}

.bell-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.badge {
  position: absolute;
  top: -0.2rem;
  right: -0.2rem;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: var(--rp-orange, #f26522);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 900;
  line-height: 1.15rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(242, 101, 34, 0.35);
}

.notif-panel {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  width: min(22rem, calc(100vw - 2rem));
  max-height: min(70vh, 26rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 16px;
  background: var(--rp-white, #fff);
  box-shadow: var(--rp-shadow-lg, 0 22px 50px rgba(0, 61, 54, 0.12));
  color: var(--rp-text, #1a1f1e);
  color-scheme: light;
}

.notif-head {
  padding: 1rem 1rem 0.65rem;
  border-bottom: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
}

.notif-title {
  margin: 0;
  color: var(--rp-teal-900, #003d36);
  font-size: 0.95rem;
  font-weight: 850;
  letter-spacing: 0.02em;
}

.notif-sub {
  margin: 0.25rem 0 0;
  color: var(--rp-text-soft, #6b7875);
  font-size: 0.78rem;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 0.5rem 0.5rem 0;
}

.tab {
  border: 0;
  border-radius: 10px 10px 0 0;
  padding: 0.55rem 0.5rem;
  background: transparent;
  color: var(--rp-text-soft, #6b7875);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
}

.tab.active {
  color: var(--rp-white, #fff);
  background: var(--rp-teal-800, #004d40);
}

.notif-list {
  flex: 1;
  margin: 0;
  padding: 0.35rem 0.35rem 0.65rem;
  overflow-y: auto;
  list-style: none;
}

.notif-empty {
  padding: 1.25rem 0.75rem;
  color: var(--rp-text-soft, #6b7875);
  font-size: 0.85rem;
  text-align: center;
}

.notif-item-wrap {
  list-style: none;
}

.notif-item {
  display: flex;
  width: 100%;
  gap: 0.55rem;
  padding: 0.65rem 0.55rem;
  border: 0;
  border-radius: 12px;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  background-color: transparent;
  color: var(--rp-text, #1a1f1e);
  cursor: pointer;
  font: inherit;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.notif-item:hover {
  background: var(--rp-teal-50, #eef9f7);
  background-color: var(--rp-teal-50, #eef9f7);
  color: var(--rp-teal-900, #003d36);
}

.notif-item:active {
  background: var(--rp-teal-100, #d0f0f0);
  background-color: var(--rp-teal-100, #d0f0f0);
}

.notif-item:focus-visible {
  outline: 2px solid var(--rp-focus, rgba(13, 107, 95, 0.45));
  outline-offset: 1px;
}

.notif-dot {
  width: 0.45rem;
  height: 0.45rem;
  margin-top: 0.35rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(0, 77, 64, 0.2);
}

.notif-dot.unread {
  background: var(--rp-orange, #f26522);
  box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.2);
}

.notif-body {
  min-width: 0;
}

.notif-line {
  margin: 0;
  font-size: 0.78rem;
  color: var(--rp-text-soft, #6b7875);
}

.author {
  color: var(--rp-teal-800, #004d40);
  font-weight: 800;
}

.verb {
  margin-left: 0.25rem;
}

.notif-post-title {
  margin: 0.2rem 0 0.15rem;
  color: var(--rp-text, #1a1f1e);
  font-size: 0.88rem;
  font-weight: 750;
  line-height: 1.3;
  word-break: break-word;
}

.notif-time {
  font-size: 0.72rem;
  color: var(--rp-text-soft, #6b7875);
}

.profile {
  position: relative;
}

.avatar {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 2px solid var(--rp-teal-800, #004d40);
  border-radius: 999px;
  background: var(--rp-peach, #fdf2e9);
  color: var(--rp-teal-900, #003d36);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 900;
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  min-width: 10rem;
  overflow: hidden;
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 14px;
  background: var(--rp-white, #fff);
  box-shadow: var(--rp-shadow-lg, 0 22px 50px rgba(0, 61, 54, 0.12));
}

.dropdown-item {
  width: 100%;
  border: 0;
  padding: 0.75rem 1rem;
  background: transparent;
  color: var(--rp-text, #1a1f1e);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--rp-teal-50, #eef9f7);
  color: var(--rp-teal-900, #003d36);
}
</style>
