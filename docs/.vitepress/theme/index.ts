import { h } from 'vue'
import { type Theme, inBrowser } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import busuanzi from 'busuanzi.pure.js'
// @ts-expect-error ignore
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import CustomLayout from './components/CustomLayout.vue'
import BlogHome from './components/BlogHome.vue'
import IconMeituan from './components/icons/IconMeituan.vue'

import '@shikijs/vitepress-twoslash/style.css'
import './styles/custom.css'
import './styles/rainbow.css'
import './styles/overrides.css'
import 'uno.css'

export default {
  ...DefaultTheme,
  Layout: () => {
    return h(CustomLayout)
  },
  enhanceApp({ app, router }) {
    app.use(TwoslashFloatingVue)
    app.component('BlogHome', BlogHome)
    app.component('IconMeituan', IconMeituan)
    if (inBrowser) {
      router.onAfterRouteChange = () => {
        busuanzi.fetch()
      }
    }
  }
} satisfies Theme
