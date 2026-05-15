import { getAuthToken } from '@/utils/auth-storage'
import { createRouter, createWebHistory } from 'vue-router'
import BlogsView from '../views/BlogsView.vue'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/blogs',
      name: 'blogs',
      component: BlogsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getAuthToken()) {
    return { name: 'home' }
  }

  return true
})

export default router
