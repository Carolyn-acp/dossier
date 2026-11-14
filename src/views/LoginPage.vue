<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const info = ref<string | null>(null)

async function submit() {
  loading.value = true
  error.value = null
  info.value = null
  try {
    if (mode.value === 'signin') {
      await auth.signIn(email.value, password.value)
    } else {
      const needsConfirmation = await auth.signUp(email.value, password.value)
      if (needsConfirmation) {
        info.value = 'Check your email to confirm your account, then sign in.'
        mode.value = 'signin'
        return
      }
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/resume'
    await router.push(redirect)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <form class="w-full max-w-sm space-y-4 rounded border bg-white p-6" @submit.prevent="submit">
      <h1 class="text-xl font-semibold">{{ mode === 'signin' ? 'Sign in' : 'Create account' }}</h1>
      <input
        v-model="email"
        type="email"
        required
        placeholder="Email"
        autocomplete="email"
        class="w-full rounded border px-3 py-2"
      />
      <input
        v-model="password"
        type="password"
        required
        minlength="6"
        placeholder="Password"
        :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
        class="w-full rounded border px-3 py-2"
      />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="info" class="text-sm text-green-700">{{ info }}</p>
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50"
      >
        {{ loading ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up' }}
      </button>
      <button
        type="button"
        class="w-full text-sm text-gray-600"
        @click="mode = mode === 'signin' ? 'signup' : 'signin'"
      >
        {{ mode === 'signin' ? 'No account? Sign up' : 'Have an account? Sign in' }}
      </button>
    </form>
  </div>
</template>
