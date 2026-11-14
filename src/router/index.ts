import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: '/resume' },
        {
          path: 'resume',
          name: 'resume',
          component: () => import('@/features/resume/ResumePage.vue'),
        },
        { path: 'jobs', name: 'jobs', component: () => import('@/features/jobs/JobsPage.vue') },
        {
          path: 'jobs/:jobId/fixes',
          name: 'fixes',
          component: () => import('@/features/fixes/FixesPage.vue'),
          props: true,
        },
        {
          path: 'applications',
          name: 'applications',
          component: () => import('@/features/applications/ApplicationsPage.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/resume' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'resume' }
  }
})

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
  }
}

export default router
