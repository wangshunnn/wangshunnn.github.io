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
  if (isFuture(p.date.time)) return 'Upcoming'
  return getYear(p.date.time)
}
</script>

<template>
  <ul>
    <template v-if="!blog.length">
      <div py2 op60>{ nothing here yet }</div>
    </template>

    <template v-for="(route, idx) in blog" :key="route.url">
      <div
        v-if="!isSameGroup(route, blog[idx - 1])"
        select-none
        relative
        h20
        pointer-events-none
        slide-enter
        :style="{
          '--enter-stage': idx - 2,
          '--enter-step': '60ms'
        }"
      >
        <span
          text-6em
          color-transparent
          absolute
          left--1rem
          top-3rem
          font-500
          text-stroke-2
          text-stroke-hex-aaa
          op60
          >{{ getGroupName(route) }}</span
        >
      </div>
      <div
        class="slide-enter"
        :style="{
          '--enter-stage': idx,
          '--enter-step': '60ms'
        }"
      >
        <a
          :href="route.url"
          class="item !color-inherit !no-underline"
          font-normal
          block
          mb-6
          mt-10
          hover="font-bold"
        >
          <li class="!no-underline" flex="~ col md:row gap-30 md:items-center">
            <div class="text-lg leading-1.2em title" flex="~ gap-2 wrap">
              <span align-middle>{{ route.title }}</span>
            </div>
            <div flex="~ gap-2 items-center">
              <span text-sm op60 ws-nowrap>
                {{ route.date.string }}
              </span>
              <span v-if="route.duration" text-sm op40 ws-nowrap
                >· {{ route.duration }}</span
              >
            </div>
          </li>
          <div v-if="route.lang" op60 text-sm hidden mt-2 md:block>
            {{ route.lang }}
          </div>
        </a>
      </div>
    </template>
  </ul>
</template>
