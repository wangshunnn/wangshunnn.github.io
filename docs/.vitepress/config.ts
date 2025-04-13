import * as path from 'node:path'
import fse from 'fs-extra'
import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'
import sharp from 'sharp'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { i18n, localSearchTranslations } from './const'
import juejinSVG from './theme/components/icons/juejin.svg'
import { splitTextByWidth } from './utils'

const ogUrl = 'https://soonwang.me/'
const title = 'Soon Wang'
const description = 'Welcome to my personal website'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title,
  description,

  head: [
    [
      'link',
      { rel: 'icon', href: '/logo.png', type: 'image/png', sizes: '16x16' }
    ],
    ['meta', { name: 'author', content: title }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    [
      'meta',
      { property: 'og:image', content: 'https://soonwang.me/og/index.png' }
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }],
    [
      'meta',
      { name: 'twitter:image', content: 'https://soonwang.me/og/index.png' }
    ],
    ['meta', { name: 'twitter:site', content: '@wangshunnn' }]
  ],

  // for prod
  async transformHead({ pageData }) {
    const ogTitle = pageData.title || title
    const ogDescription = pageData.description || ''
    const date = pageData.frontmatter?.date || ''
    const relativePath = pageData.relativePath

    if (relativePath === 'index.md' || relativePath === '404.md') {
      return
    }

    let pagePathName =
      relativePath.split('/').at(-1)?.replace(/\.md$/, '') || 'index'
    if (pagePathName === 'index') {
      pagePathName =
        relativePath.split('/').at(-2)?.replace(/\.md$/, '') || 'index'
    }

    const ogImage = `${ogUrl}og/${pagePathName}.png`
    // console.log('relativePath', relativePath, pagePathName, ogTitle)
    const output = path.resolve(__dirname, `../public/og/${pagePathName}.png`)
    if (!fse.existsSync(output)) {
      generateOg(output, { title: ogTitle, description: ogDescription, date })
    }

    return [
      ['meta', { property: 'og:title', content: ogTitle }],
      ['meta', { property: 'og:description', content: ogDescription }],
      ['meta', { property: 'og:image', content: ogImage }],
      ['meta', { name: 'twitter:title', content: ogTitle }],
      ['meta', { name: 'twitter:description', content: ogDescription }],
      ['meta', { name: 'twitter:image', content: ogImage }]
    ]
  },

  // for dev
  transformPageData(pageData) {
    const ogTitle = pageData.title || title
    const ogDescription = pageData.description || description
    const relativePath = pageData.relativePath || 'index'
    const pagePathName = relativePath.split('/').at(-1)?.replace(/\.md$/, '')
    const ogImage = `${ogUrl}og/${pagePathName}.png`
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['meta', { property: 'og:title', content: ogTitle }],
      ['meta', { property: 'og:description', content: ogDescription }],
      ['meta', { property: 'og:image', content: ogImage }],
      ['meta', { name: 'twitter:title', content: ogTitle }],
      ['meta', { name: 'twitter:description', content: ogDescription }],
      ['meta', { name: 'twitter:image', content: ogImage }]
    )
  },

  lastUpdated: false,
  cleanUrls: true,

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    // @ts-expect-error ignore
    codeTransformers: [transformerTwoslash()]
  },

  vite: {
    plugins: [UnoCSS()]
  },

  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
    siteTitle: '',

    logo: { src: '/logo.png', width: 24, height: 24 },

    nav: [
      { text: '博客', activeMatch: '^/($|blog/)', link: '/index' },
      { text: '关于', activeMatch: '^/about/', link: '/about/index' }
    ],

    search: {
      // provider: 'algolia',
      // options: {
      //   appId: 'K3MSC93R2T',
      //   apiKey: 'a28a755619f9dd70f9b9ba1879854748',
      //   indexName: 'wangshunnnio',
      //   placeholder: '搜索博客',
      //   translations: algoliaTranslations
      // }
      provider: 'local',
      options: {
        translations: localSearchTranslations
      }
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'short'
      }
    },

    outline: 'deep',

    sidebar: {
      more: [
        {
          text: '算法',
          items: []
        },
        {
          text: '阅读',
          items: []
        },
        {
          text: '旅游',
          items: []
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/wangshunnn' },
      { icon: 'x', link: 'https://twitter.com/wangshunnn' },
      {
        icon: { svg: juejinSVG },
        link: 'https://juejin.cn/user/2129123907471864/posts'
      }
      // { icon: 'bluesky', link: 'https://bsky.app/profile/soonwang.bsky.social' }
      // {
      //   icon: { svg: zhihuSVG },
      //   link: 'https://www.zhihu.com/people/wangshunnn'
      // }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © 2023-${new Date().getFullYear()} Soon Wang`
    },

    // i18n
    sidebarMenuLabel: i18n.menu,
    outlineTitle: i18n.toc,
    returnToTopLabel: i18n.returnToTop,
    darkModeSwitchLabel: i18n.appearance,
    docFooter: {
      prev: i18n.previous,
      next: i18n.next
    }
  }
})

async function generateOg(
  output: string,
  {
    title = '',
    description = '',
    date = ''
  }: {
    title: string
    description?: string
    date?: string
  }
) {
  const ogSVg = fse.readFileSync(
    path.resolve(__dirname, '../public/og/template.svg'),
    'utf-8'
  )

  title = title.trim()
  description = description.trim()
  let dateText = ''
  if (date) {
    dateText = new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const titleLines = splitTextByWidth(title, 28, 2)
  description = description ? splitTextByWidth(description, 56, 1)[0] : ''

  const data: Record<string, string> = {
    title_line1: titleLines[0]?.replaceAll('&', '&amp;'),
    title_line2: titleLines[1]?.replaceAll('&', '&amp;'),
    description,
    date: dateText
  }
  const svg = ogSVg.replace(/\{\{([^}]+)\}\}/g, (_, name) => data[name] || '')

  console.log(`Generating og image: ${output}`)
  try {
    await sharp(Buffer.from(svg))
      .resize(1200 * 1.1, 630 * 1.1)
      .png()
      .toFile(output)
  } catch (e) {
    console.error('Failed to generate og image', output, title, description, e)
  }
}
