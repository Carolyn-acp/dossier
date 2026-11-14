<script setup lang="ts">
// Owner: Person B. Placeholder. Remember: never auto-submit; status -> "submitted"
// requires reviewedAt (also enforced by a DB trigger).
import { mockJob, mockResume, type Application } from '@/types/schemas'

const example: Application = {
  id: 'app_1',
  userId: mockResume.userId,
  jobId: mockJob.id,
  resumeId: mockResume.id,
  status: 'prepared',
  prepared: { answers: [] },
  updatedAt: '2026-11-14T08:00:00Z',
}
</script>

<template>
  <h1 class="mb-4 text-2xl font-semibold">Applications</h1>
  <pre class="overflow-auto rounded bg-white p-4 text-xs">{{ example }}</pre>
</template>
