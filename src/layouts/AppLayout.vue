<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function signOut() {
  await auth.signOut()
  await router.push({ name: 'login' })
}

const links = [
  { to: '/resume', label: 'Resume' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/applications', label: 'Applications' },
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <nav class="flex items-center gap-4 border-b bg-white px-6 py-3">
      <span class="font-semibold">Dossier</span>
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="text-sm text-gray-600 hover:text-gray-900"
        active-class="font-medium text-gray-900"
      >
        {{ link.label }}
      </RouterLink>
      <span class="ml-auto text-sm text-gray-500">{{ auth.user?.email }}</span>
      <button class="text-sm text-gray-600 hover:text-gray-900" @click="signOut">Sign out</button>
    </nav>
    <main class="mx-auto max-w-4xl p-6">
      <RouterView />
    </main>
  </div>
</template>
