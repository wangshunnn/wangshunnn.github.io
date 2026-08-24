<script setup lang="ts">
import { data as blog } from '../blog.data'

const isFuture = (value?: Date | string | number) =>
  value === 'soon' || (value && new Date(value) > new Date())
</script>

<template>
  <div class="blog-index slide-enter-content">
    <p v-if="!blog.length" class="blog-empty">{ coming soon }</p>

    <a
      v-for="post in blog"
      :key="post.url"
      :href="isFuture(post.date.time) ? undefined : post.url"
      :aria-disabled="isFuture(post.date.time) || undefined"
      :tabindex="isFuture(post.date.time) ? -1 : undefined"
      class="blog-entry"
      :class="{ 'is-future': isFuture(post.date.time) }"
    >
      <article>
        <time v-if="!isFuture(post.date.time)" class="blog-entry-date">
          {{ post.date.string }}
        </time>

        <h3 class="blog-entry-title">{{ post.title }}</h3>

        <p v-if="post.description" class="blog-description">
          {{ post.description }}
        </p>
      </article>
    </a>
  </div>
</template>

<style scoped>
.blog-index {
  max-width: 36rem;
  margin-inline: auto;
  padding-top: 2rem;
  padding-left: 6rem;
}

.blog-empty {
  padding: 0.5rem 0;
  color: var(--site-ink-muted);
  text-align: center;
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
  position: relative;
}

.blog-entry-date {
  position: absolute;
  top: 0.2rem;
  right: calc(100% + 1.75rem);
  width: 5.25rem;
  color: var(--site-ink-faint);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  line-height: 1.3;
  text-align: right;
  white-space: nowrap;
  opacity: 0.62;
}

.blog-entry-title {
  margin: 0;
  color: var(--site-ink);
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.3;
}

.blog-description {
  margin: 0.45rem 0 0;
  color: var(--site-ink-faint);
  font-size: 0.875rem;
  line-height: 1.55;
}

@media (max-width: 767px) {
  .blog-index {
    padding-top: 0;
    padding-left: 0;
  }

  .blog-entry {
    margin-bottom: 1.5rem;
  }

  .blog-entry-date {
    position: static;
    display: block;
    width: auto;
    margin-bottom: 0.2rem;
    font-size: 0.75rem;
    line-height: 1.4;
    text-align: left;
    opacity: 0.72;
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
