<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()

const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

const date = computed(() => {
  const rawDate = frontmatter.value.date
  if (!rawDate)
    return undefined

  const value = String(rawDate)
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)

  if (!match)
    return { datetime: value, label: value }

  const [, year, month, day] = match
  const monthLabel = monthLabels[Number(month) - 1]

  if (!monthLabel)
    return { datetime: value, label: value }

  return {
    datetime: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    label: `${monthLabel} ${Number(day)}, ${year}`
  }
})

const readingTime = computed(() => {
  const duration = frontmatter.value.duration
  if (!duration)
    return undefined

  const minutes = String(duration).match(/\d+(?:\.\d+)?/)?.[0]
  return minutes ? `${minutes} min read` : String(duration)
})
</script>

<template>
  <p v-if="date || readingTime" class="article-meta" aria-label="文章信息">
    <time v-if="date" :datetime="date.datetime">{{ date.label }}</time>
    <span v-if="date && readingTime" class="article-meta-separator" aria-hidden="true">
      ·
    </span>
    <span v-if="readingTime">{{ readingTime }}</span>
  </p>
</template>

<style scoped>
.article-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0 2rem;
  color: var(--site-ink-faint);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0.025em;
}

.article-meta-separator {
  opacity: 0.62;
}

.article-meta + :global(br) {
  display: none;
}

@media (max-width: 640px) {
  .article-meta {
    font-size: 0.6875rem;
  }
}
</style>
