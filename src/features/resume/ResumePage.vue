<script setup lang="ts">
// Owner: Person A. Placeholder — shows mock data so the types are visible.
import { mockResume } from '@/types/schemas'
</script>

<template>
  <h1 class="mb-4 text-2xl font-semibold">Resume</h1>
  <p class="mb-2 text-sm text-gray-500">Mock ParsedResume:</p>
  <pre class="overflow-auto rounded bg-white p-4 text-xs">{{ mockResume }}</pre>
</template>
