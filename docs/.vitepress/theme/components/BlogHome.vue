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
  <ul class="!pl-0">
    <template v-if="!blog.length">
      <div py-2 text-center>{ nothing here yet }</div>
    </template>

    <span i-simple-icons-meituan w5 h5></span>

    <template v-for="(route, idx) in blog" :key="route.url">
      <div
        v-if="!isSameGroup(route, blog[idx - 1])"
        select-none
        relative
        h15
        pointer-events-none
      >
        <span
          text-6em
          color-transparent
          absolute
          top-1.5rem
          font-bold
          text-stroke-2
          text-stroke-hex-bbb
          op40
          right-0
          md:left--3rem
          >{{ getGroupName(route) }}</span
        >
      </div>
      <div>
        <a
          :href="route.url"
          class="item !color-inherit !no-underline"
          font-normal
          block
          mt-10
          mb-10
          op70
          transition-transform-op
          hover="font-bold scale-101 op100"
        >
          <li class="!no-underline" flex="~ col md:row gap-2 md:items-center">
            <div class="text-lg leading-1.2em title" flex="~ gap-2 wrap">
              <span
                v-if="route.tag"
                align-middle
                flex-none
                absolute
                rounded
                my-auto
                bg-zinc:50
                text-xs
                ml--12
                mt-0
                px-1.5
                py-0.5
                hidden
                md:block
                op70
              >
                <!-- <span class="i-mdi:tag"> </span> -->
                {{ route.tag }}
              </span>
              <span align-middle>{{ route.title }}</span>
            </div>

            <div flex="~ gap-2 items-center">
              <span text-sm op60 ws-nowrap>
                <span class="i-lets-icons:date-range-light"></span>
                {{ route.date.string }}
              </span>
              <span v-if="route.duration" text-sm op50 ws-nowrap>
                <span class="i-icon-park-outline:tea-drink"></span>
                {{ route.duration }}
              </span>
              <span v-if="route.place" text-sm op50 ws-nowrap md:hidden>
                <span class="i-ic:outline-place"></span>
                {{ route.place }}
              </span>
            </div>
          </li>

          <div op60 text-sm hidden mt-2 flex="~ gap-2 items-center">
            <span v-if="route.place" hidden md:block>
              <span class="i-ic:outline-place"></span>
              <span> {{ route.place }}</span></span
            >
            <span v-if="route.tag">
              <span rounded my-auto bg-zinc:50 text-xs py-1 px-1.2 md:hidden>
                <span class="i-mdi:tag"></span>
                {{ route.tag }}
              </span>
            </span>
          </div>

          <div v-if="route.description" op60 text-sm mt-2 md:block>
            {{ route.description }}
          </div>
        </a>
      </div>
    </template>
  </ul>
</template>
