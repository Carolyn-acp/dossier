<script setup lang="ts">
// Owner: Person B. Placeholder — receives jobId from the route (/jobs/:jobId/fixes).
import { mockMatch, mockResume } from '@/types/schemas'

defineProps<{ jobId: string }>()
</script>

<template>
  <h1 class="mb-4 text-2xl font-semibold">Fixes</h1>
  <p class="text-sm text-gray-500">jobId: {{ jobId }} · resumeId: {{ mockResume.id }}</p>
  <p class="mt-2 text-sm">Missing keywords (mock): {{ mockMatch.missingSkills.join(', ') }}</p>
</template>
