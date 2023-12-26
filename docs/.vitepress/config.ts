import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'

const ogUrl = 'https://wangshunnn.github.io/'
const ogImage = '' //`${ogUrl}og.png#1`
const title = 'Soon Wang'
const description = 'My personal website'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title,
  description,

  head: [
    // ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    [
      'link',
      { rel: 'icon', href: '/logo.png', type: 'image/png', sizes: '16x16' }
    ],
    ['meta', { name: 'author', content: title }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: title }],
    ['meta', { name: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: ogImage }],
    ['meta', { name: 'twitter:site', content: '@wangshunnn' }],
    ['meta', { name: 'twitter:url', content: ogUrl }]
  ],

  lastUpdated: true,
  cleanUrls: true,

  vite: {
    plugins: [UnoCSS()]
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    siteTitle: '',

    logo: { src: '/logo.png', width: 24, height: 24 },

    nav: [
      { text: '博客', link: '/blog/index' },
      { text: '其他', link: '/else/index' }
    ],

    search: {
      provider: 'local'
    },

    sidebar: {
      blog: [],
      else: [
        {
          text: '',
          items: [{ text: '算法', link: '/else/index' }]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/wangshunnn' },
      { icon: 'x', link: 'https://twitter.com/wangshunnn' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2019-PRESENT Shun Wang'
    }
  }
})
