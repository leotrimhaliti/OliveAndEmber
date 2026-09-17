import { readFile } from 'node:fs/promises'

const publicUrl = new URL(process.env.VITE_PUBLIC_URL || 'http://127.0.0.1:5173').origin
const indexingEnabled = process.env.VITE_INDEXING_ENABLED === 'true'
const [html, robots, sitemap] = await Promise.all([
  readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/robots.txt', import.meta.url), 'utf8'),
  readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8'),
])

const expected = [
  `rel="canonical" href="${publicUrl}/"`,
  `property="og:url" content="${publicUrl}/"`,
  `"@id": "${publicUrl}/#restaurant"`,
  `<loc>${publicUrl}/</loc>`,
]

for (const value of expected) {
  if (!`${html}\n${sitemap}`.includes(value)) {
    throw new Error(`Missing generated SEO value: ${value}`)
  }
}

if (html.includes('__PUBLIC_URL__') || html.includes('__ROBOTS_META__')) {
  throw new Error('Unresolved SEO placeholder found in the production build.')
}

const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
if (!jsonLd) throw new Error('JSON-LD metadata is missing.')
JSON.parse(jsonLd)

if (indexingEnabled) {
  if (!html.includes('content="index, follow, max-image-preview:large"')) {
    throw new Error('The production homepage is not indexable.')
  }
  if (!robots.includes(`Sitemap: ${publicUrl}/sitemap.xml`)) {
    throw new Error('robots.txt does not advertise the canonical sitemap.')
  }
} else if (!robots.includes('Disallow: /')) {
  throw new Error('Indexing-disabled builds must block crawling.')
}

console.log(`SEO build verified for ${publicUrl} (indexing: ${indexingEnabled}).`)
