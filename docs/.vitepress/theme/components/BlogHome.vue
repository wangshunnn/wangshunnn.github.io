<script setup lang="ts">
import { data as blog, type Blog } from '../blog.data'

interface BlogGroup {
  name: string
  posts: Blog[]
}

const getYear = (value: Date | string | number) =>
  new Date(value).getFullYear()

const isFuture = (value?: Date | string | number) =>
  value === 'soon' || (value && new Date(value) > new Date())

const getShortDate = (value: Date | string | number) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit'
  })

function getGroupName(post: Blog) {
  return isFuture(post.date.time) ? 'Soon' : String(getYear(post.date.time))
}

const groups = blog.reduce<BlogGroup[]>((result, post) => {
  const name = getGroupName(post)
  const current = result.at(-1)

  if (current?.name === name) current.posts.push(post)
  else result.push({ name, posts: [post] })

  return result
}, [])
</script>

<template>
  <div class="blog-index slide-enter-content">
    <p v-if="!groups.length" class="blog-empty">{ coming soon }</p>

    <section
      v-for="group in groups"
      :key="group.name"
      class="blog-group"
      :aria-labelledby="`blog-year-${group.name}`"
    >
      <h2 :id="`blog-year-${group.name}`" class="blog-year">
        {{ group.name }}
      </h2>

      <div class="blog-list">
        <a
          v-for="post in group.posts"
          :key="post.url"
          :href="isFuture(post.date.time) ? undefined : post.url"
          :aria-disabled="isFuture(post.date.time) || undefined"
          :tabindex="isFuture(post.date.time) ? -1 : undefined"
          class="blog-entry"
          :class="{ 'is-future': isFuture(post.date.time) }"
        >
          <article>
            <time
              v-if="!isFuture(post.date.time)"
              :datetime="post.date.string"
              class="blog-entry-date"
            >
              {{ getShortDate(post.date.time) }}
            </time>

            <h3 class="blog-entry-title">{{ post.title }}</h3>

            <p v-if="post.description" class="blog-description">
              {{ post.description }}
            </p>
          </article>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.blog-index {
  --blog-date-width: 3rem;
  --blog-date-gap: 1.75rem;
  --blog-date-rail: calc(var(--blog-date-width) + var(--blog-date-gap));

  margin-inline-start: calc(2.5rem - var(--blog-date-rail));
  padding-inline-start: var(--blog-date-rail);
}

@media (min-width: 960px) {
  :global(.VPDoc:not(.has-sidebar) .content:has(.blog-index)) {
    max-width: 47.5rem;
    padding-inline: 0 2.25rem;
  }

  .blog-index {
    margin-inline-start: 0;
  }
}

@media (min-width: 1440px) {
  :global(.VPDoc:not(.has-sidebar) .content:has(.blog-index)) {
    max-width: 49.5rem;
  }
}

.blog-empty {
  padding: 0.5rem 0;
  color: var(--site-ink-muted);
  text-align: center;
}

.blog-group {
  position: relative;
  padding-top: 4.25rem;
}

.blog-group + .blog-group {
  margin-top: 0.5rem;
}

.blog-year {
  position: absolute;
  top: 0.25rem;
  right: 1rem;
  z-index: 0;
  margin: 0;
  border-top: 0;
  padding-top: 0;
  color: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 6rem;
  font-weight: 700;
  line-height: 1;
  opacity: 0.28;
  pointer-events: none;
  user-select: none;
  -webkit-text-stroke: 2px var(--site-year-stroke);
}

.blog-list {
  position: relative;
  z-index: 1;
}

.blog-entry {
  display: block;
  margin-bottom: 1.75rem;
  color: inherit;
  text-decoration: none;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.blog-entry:hover,
.blog-entry:focus-visible {
  color: inherit;
  transform: translateX(2px);
}

.blog-entry:focus-visible {
  border-radius: 3px;
  outline: 2px solid var(--site-accent);
  outline-offset: 5px;
}

.blog-entry.is-future {
  cursor: default;
}

.blog-entry article {
  display: grid;
  grid-template-columns: var(--blog-date-width) minmax(0, 1fr);
  column-gap: var(--blog-date-gap);
  margin-inline-start: calc(0rem - var(--blog-date-rail));
}

.blog-entry-date {
  grid-row: 1;
  grid-column: 1;
  align-self: start;
  margin-top: 0.2rem;
  color: var(--site-ink-faint);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  line-height: 1.3;
  text-align: end;
  white-space: nowrap;
  opacity: 0.78;
}

.blog-entry-title {
  grid-row: 1;
  grid-column: 2;
  margin: 0;
  color: var(--site-ink);
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.3;
}

.blog-description {
  grid-row: 2;
  grid-column: 2;
  margin: 0.45rem 0 0;
  color: var(--site-ink-faint);
  font-size: 0.875rem;
  line-height: 1.55;
}

@media (max-width: 767px) {
  .blog-index {
    margin-inline-start: 0;
    padding-inline-start: 0;
  }

  .blog-group {
    padding-top: 3.25rem;
  }

  .blog-group + .blog-group {
    margin-top: 0.25rem;
  }

  .blog-year {
    top: 0.25rem;
    right: 0;
    font-size: 4rem;
    opacity: 0.2;
    -webkit-text-stroke-width: 1.5px;
  }

  .blog-entry {
    margin-bottom: 1.5rem;
  }

  .blog-entry article {
    display: block;
    margin-inline-start: 0;
  }

  .blog-entry-date {
    display: block;
    width: auto;
    margin-top: 0;
    margin-bottom: 0.2rem;
    font-size: 0.75rem;
    line-height: 1.4;
    text-align: left;
    opacity: 0.78;
  }

  .blog-entry-title {
    font-size: 1rem;
    line-height: 1.35;
  }

  .blog-description {
    display: none;
  }
}
</style>
