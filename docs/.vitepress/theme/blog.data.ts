import { createContentLoader } from 'vitepress'

export interface Blog {
  title: string
  date: {
    time: number
    string: string
  }
  lang: string | undefined
  duration: string | undefined
  description: string | undefined
  url: string
}

export declare const data: Blog[]

export default createContentLoader('blog/*.md', {
  transform(raw): Blog[] {
    return raw
      .filter(({ frontmatter }) => !!frontmatter.date)
      .map(({ url, frontmatter }) => ({
        title: frontmatter.title,
        date: formatDate(frontmatter.date),
        lang: frontmatter.lang,
        duration: frontmatter.duration,
        description: frontmatter.description,
        url
      }))
      .sort((a, b) => b.date.time - a.date.time)
  }
})

function formatDate(raw: string): Blog['date'] {
  const date = new Date(raw)
  date.setUTCHours(12)
  return {
    time: +date,
    string: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}
