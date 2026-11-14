import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => session.value !== null)

  let initialised = false
  async function init() {
    if (initialised) return
    initialised = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
    })
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
  }

  /** Returns true if the user must confirm their email before a session exists. */
  async function signUp(email: string, password: string): Promise<boolean> {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    session.value = data.session
    return data.session === null
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    session.value = null
  }

  return { session, user, isAuthenticated, init, signIn, signUp, signOut }
})
