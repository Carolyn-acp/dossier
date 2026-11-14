<script setup lang="ts">
// Owner: Person A. Placeholder — shows mock data so the types are visible.
import { RouterLink } from 'vue-router'
import { mockJob, mockMatch } from '@/types/schemas'
</script>

<template>
  <h1 class="mb-4 text-2xl font-semibold">Jobs</h1>
  <div class="rounded border bg-white p-4">
    <div class="font-medium">{{ mockJob.title }} — {{ mockJob.company }}</div>
    <div class="text-sm text-gray-500">
      {{ mockJob.location }} · {{ mockJob.type }} · match {{ mockMatch.score }}/100
    </div>
    <div class="mt-2 text-sm">Missing: {{ mockMatch.missingSkills.join(', ') }}</div>
    <RouterLink :to="`/jobs/${mockJob.id}/fixes`" class="mt-2 inline-block text-sm underline">
      Suggest fixes →
    </RouterLink>
  </div>
</template>
