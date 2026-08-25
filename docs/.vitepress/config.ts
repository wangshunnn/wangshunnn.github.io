import * as path from 'node:path'
import fse from 'fs-extra'
import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'
import sharp from 'sharp'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { i18n, localSearchTranslations } from './const'
import juejinSVG from './theme/components/icons/juejin.svg'

const ogUrl = 'https://soonwang.me/'
const ogWidth = 1200
const ogHeight = 630
const title = 'Soon Wang'
const description = 'Welcome to my personal website'

interface OgImageOptions {
  title: string
  description: string
  watermark: string
  footerNote: string
}

interface OgPageData {
  title: string
  description?: string
  relativePath: string
  frontmatter?: Record<string, unknown>
}

const ogImageJobs = new Map<string, { signature: string; job: Promise<void> }>()

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
    ['meta', { name: 'twitter:site', content: '@wangshunnn' }],
    ['meta', { name: 'twitter:creator', content: '@wangshunnn' }]
  ],

  // for prod
  async transformHead({ pageData }) {
    const pageOg = getPageOg(pageData)
    if (!pageOg) return

    await ensureOgImage(pageOg.output, pageOg.imageOptions)
    return createSocialHead(pageOg)
  },

  // for dev
  async transformPageData(pageData) {
    const pageOg = getPageOg(pageData)
    if (!pageOg) return

    await ensureOgImage(pageOg.output, pageOg.imageOptions)
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(...createSocialHead(pageOg))
  },

  lastUpdated: false,
  cleanUrls: true,

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    // @ts-expect-error ignore
    codeTransformers: [transformerTwoslash()],
    config(md) {
      const renderHeadingClose = md.renderer.rules.heading_close

      md.renderer.rules.heading_close = (tokens, index, options, env, self) => {
        const rendered = renderHeadingClose
          ? renderHeadingClose(tokens, index, options, env, self)
          : self.renderToken(tokens, index, options)

        const isArticleTitle =
          tokens[index].tag === 'h1' &&
          env.relativePath?.startsWith('blog/') &&
          !env.articleMetaInjected

        if (!isArticleTitle) return rendered

        env.articleMetaInjected = true
        return `${rendered}<ArticleMeta />\n`
      }
    }
  },

  vite: {
    plugins: [UnoCSS()]
  },

  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
    siteTitle: '',

    logo: { src: '/logo.png', alt: '首页', width: 24, height: 24 },

    nav: [{ text: '关于', activeMatch: '^/about/', link: '/about/index' }],

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
      copyright: `© 2023–${new Date().getFullYear()} Soon Wang · <a href="https://github.com/wangshunnn/wangshunnn.github.io/blob/main/LICENSE">MIT License</a>`
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

function getPageOg(pageData: OgPageData) {
  const relativePath = pageData.relativePath || 'index.md'
  if (relativePath === '404.md') return

  const isHome = relativePath === 'index.md'
  const isArticle = relativePath.startsWith('blog/')
  const pageTitle = isHome ? title : pageData.title || title
  const pageDescription = pageData.description || (isHome ? description : '')
  const date = String(pageData.frontmatter?.date || '')
  const pagePathName = getOgFileName(relativePath)
  const image = `${ogUrl}og/${pagePathName}.png`
  const watermark = getDateYear(date) || 'BLOG'
  const footerNote = date ? formatOgDate(date).toUpperCase() : ''

  return {
    title: pageTitle,
    description: pageDescription,
    image,
    imageAlt: `${pageTitle} — ${pageDescription || 'Soon Wang'}`,
    pageUrl: getPageUrl(relativePath),
    type: isArticle ? 'article' : 'website',
    output: path.resolve(__dirname, `../public/og/${pagePathName}.png`),
    imageOptions: {
      title: pageTitle,
      description: pageDescription,
      watermark,
      footerNote
    } satisfies OgImageOptions
  }
}

function getOgFileName(relativePath: string) {
  const segments = relativePath.replace(/\.md$/, '').split('/')
  const name = segments.at(-1) === 'index' ? segments.at(-2) : segments.at(-1)
  return name || 'index'
}

function getPageUrl(relativePath: string) {
  if (relativePath === 'index.md') return ogUrl

  const route = relativePath.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1')
  return new URL(route, ogUrl).toString()
}

function createSocialHead({
  title: pageTitle,
  description: pageDescription,
  image,
  imageAlt,
  pageUrl,
  type
}: NonNullable<ReturnType<typeof getPageOg>>) {
  return [
    ['meta', { property: 'og:type', content: type }],
    ['meta', { property: 'og:site_name', content: title }],
    ['meta', { property: 'og:title', content: pageTitle }],
    ['meta', { property: 'og:description', content: pageDescription }],
    ['meta', { property: 'og:url', content: pageUrl }],
    ['meta', { property: 'og:image', content: image }],
    ['meta', { property: 'og:image:width', content: String(ogWidth) }],
    ['meta', { property: 'og:image:height', content: String(ogHeight) }],
    ['meta', { property: 'og:image:alt', content: imageAlt }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: pageTitle }],
    ['meta', { name: 'twitter:description', content: pageDescription }],
    ['meta', { name: 'twitter:image', content: image }],
    ['meta', { name: 'twitter:image:alt', content: imageAlt }]
  ]
}

async function ensureOgImage(output: string, options: OgImageOptions) {
  const signature = JSON.stringify(options)
  const previous = ogImageJobs.get(output)

  if (previous?.signature === signature && fse.existsSync(output)) {
    await previous.job
    return
  }

  const job = (async () => {
    await previous?.job
    await generateOg(output, options)
  })()
  ogImageJobs.set(output, { signature, job })
  await job
}

async function generateOg(
  output: string,
  { title, description, watermark, footerNote }: OgImageOptions
) {
  const ogSvg = fse.readFileSync(
    path.resolve(__dirname, '../public/og/template.svg'),
    'utf-8'
  )
  title = title.trim()
  description = description.trim()
  const titleWidth = Math.max(getTextEmWidth(title), 1)
  const titleFontSize = Math.min(52, Math.max(24, Math.floor(980 / titleWidth)))

  const data: Record<string, string> = {
    title: escapeXml(title),
    title_font_size: String(titleFontSize),
    watermark: escapeXml(watermark),
    footer_note: escapeXml(footerNote)
  }
  const svg = ogSvg.replace(
    /\{\{([^}]+)\}\}/g,
    (_, name: string) => data[name] || ''
  )

  console.log(`Generating og image: ${output}`)
  try {
    await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(output)
  } catch (e) {
    console.error('Failed to generate og image', output, title, description, e)
    throw e
  }
}

function getTextEmWidth(text: string) {
  return [...text].reduce((width, char) => {
    if (/[^\u0000-\u00ff]/.test(char)) return width + 1
    if (char === ' ') return width + 0.32
    if (/[A-Z0-9]/.test(char)) return width + 0.64
    if (/[a-z]/.test(char)) return width + 0.53
    return width + 0.5
  }, 0)
}

function getDateYear(date: string) {
  return date.match(/^(\d{4})/)?.[1] || ''
}

function formatOgDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!match) return date

  const [, year, month, day] = match
  const monthLabels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]
  const monthLabel = monthLabels[Number(month) - 1]
  return monthLabel ? `${monthLabel} ${Number(day)}, ${year}` : date
}

function escapeXml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll(/'/g, '&apos;')
}
