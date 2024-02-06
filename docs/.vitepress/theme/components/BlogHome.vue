<script setup lang="ts">
import { data as blog, type Blog } from '../blog.data'

const getYear = (a: Date | string | number) => new Date(a).getFullYear()
const isFuture = (a?: Date | string | number) => a && new Date(a) > new Date()
const isSameYear = (a?: Date | string | number, b?: Date | string | number) =>
  a && b && getYear(a) === getYear(b)

function isSameGroup(a: Blog, b?: Blog) {
  return (
    isFuture(a.date.time) === isFuture(b?.date?.time) &&
    isSameYear(a.date.time, b?.date?.time)
  )
}

function getGroupName(p: Blog) {
  if (isFuture(p.date.time)) return 'Soon'
  return getYear(p.date.time)
}
</script>

<template>
  <ul class="!pl-0 md:!pl-10">
    <div v-if="!blog.length">
      <div py-2 text-center>{ coming soon }</div>
    </div>

    <div v-for="(route, idx) in blog" :key="route.url">
      <div v-if="!isSameGroup(route, blog[idx - 1])" select-none relative h10 pointer-events-none>
        <span text-6em color-transparent absolute md:top-1.5rem font-bold op30 right-0 text-stroke-2 text-stroke-hex-bbb
          italic font-fantasy>{{ getGroupName(route) }}</span>
      </div>

      <div>
        <a :href="route.url" class="item !color-inherit !no-underline" font-normal block mt-0 mb-8 op85
          transition-transform-op hover="scale-101 op100">
          <li class="!no-underline" flex="~ col md:row gap-2 md:items-center">
            <div class="text-lg leading-1.2em title" flex="~ gap-2 wrap">
              <span align-middle text-rainbow>{{ route.title }}</span>
            </div>
          </li>

          <div mt-1.5 flex="~ gap-2 items-center">
            <span text-sm op60 ws-nowrap>
              <span class="i-lets-icons:date-range-light"></span>
              {{ route.date.string }}
            </span>
            <span v-if="route.duration" text-sm op50 ws-nowrap>
              <span class="i-icon-park-outline:tea-drink"></span>
              {{ route.duration }}
            </span>
            <span v-if="route.place" text-sm op50 ws-nowrap>
              <span class="i-ic:outline-place"></span>
              {{ route.place }}
            </span>
            <span v-if="route.tag" text-sm op50 ws-nowrap hidden md:block bg-zinc:50 text-xs pl-1.5 pr-2 py-0.4 rounded-full>
              <span class="i-mdi:tag-multiple-outline" />
              {{ route.tag }}
            </span>
          </div>

          <div v-if="route.tag" op60 text-sm mt-1.5 flex="~ gap-2 items-center" md:hidden>
            <span rounded my-auto bg-zinc:50 text-xs pl-1.5 pr-2 py-0.4 rounded-full>
              <span class="i-mdi:tag-multiple-outline" />
              {{ route.tag }}
            </span>
          </div>

          <div v-if="route.description" op60 text-sm mt-1.5 md:block>
            {{ route.description }}
          </div>
        </a>
      </div>

    </div>
  </ul>
</template>
