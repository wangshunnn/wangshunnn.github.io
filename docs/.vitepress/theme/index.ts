import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import BlogHome from './components/BlogHome.vue'
import Data from './components/Data.vue'

import 'virtual:uno.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('BlogHome', BlogHome)
    app.component('Data', Data)
  },
} satisfies Theme
