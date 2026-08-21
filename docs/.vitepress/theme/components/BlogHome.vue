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
            <h3 class="blog-entry-title">{{ post.title }}</h3>

            <div v-if="!isFuture(post.date.time)" class="blog-entry-meta">
              <span>{{ post.date.string }}</span>
              <span v-if="post.duration" class="blog-meta-item">
                {{ post.duration }}
              </span>
              <span v-if="post.place" class="blog-meta-item">
                {{ post.place }}
              </span>
              <span v-if="post.tag" class="blog-tag">{{ post.tag }}</span>
            </div>

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
  padding-left: 2.5rem;
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
  opacity: 0.58;
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
  margin-bottom: 2rem;
  color: inherit;
  opacity: 0.88;
  text-decoration: none;
  transition:
    color 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
}

.blog-entry:hover,
.blog-entry:focus-visible {
  color: inherit;
  opacity: 1;
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

.blog-entry-title {
  margin: 0;
  color: var(--site-ink);
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.3;
}

.blog-entry-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.45rem;
  color: var(--site-ink-muted);
  font-size: 0.875rem;
}

.blog-meta-item::before {
  margin-right: 0.35rem;
  color: var(--site-ink-faint);
  content: '·';
}

.blog-tag {
  margin-left: 0.25rem;
  border: 1px solid var(--site-chip-border);
  border-radius: 999px;
  padding: 0.08rem 0.5rem;
  background: var(--site-chip-bg);
  color: var(--site-ink-muted);
  font-size: 0.75rem;
  line-height: 1.35;
}

.blog-description {
  margin: 0.45rem 0 0;
  color: var(--site-ink-muted);
  font-size: 0.875rem;
  line-height: 1.55;
}

@media (max-width: 767px) {
  .blog-index {
    padding-left: 0;
  }

  .blog-group {
    padding-top: 3.75rem;
  }

  .blog-group + .blog-group {
    margin-top: 0.25rem;
  }

  .blog-year {
    top: 0.4rem;
    right: 0;
    font-size: 4.5rem;
    opacity: 0.5;
    -webkit-text-stroke-width: 1.5px;
  }

  .blog-entry {
    margin-bottom: 2.25rem;
  }

  .blog-entry-title {
    font-size: 1.0625rem;
  }

  .blog-tag {
    width: fit-content;
    margin-top: 0.15rem;
    margin-left: 0;
  }
}
</style>
