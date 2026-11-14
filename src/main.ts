import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
app.use(createPinia())

// Restore the Supabase session before the router guard runs for the first time.
useAuthStore()
  .init()
  .finally(() => {
    app.use(router)
    app.mount('#app')
  })
