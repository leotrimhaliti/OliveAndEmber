import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function seoPlugin(publicUrl, indexingEnabled) {
  const robotsMeta = indexingEnabled
    ? 'index, follow, max-image-preview:large'
    : 'noindex, nofollow'

  return {
    name: 'olive-and-ember-seo',
    transformIndexHtml(html) {
      return html
        .replaceAll('__PUBLIC_URL__', publicUrl)
        .replaceAll('__ROBOTS_META__', robotsMeta)
        .replaceAll('__INDEXING_ENABLED__', String(indexingEnabled))
    },
    generateBundle() {
      const robots = indexingEnabled
        ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /sanctum/\nSitemap: ${publicUrl}/sitemap.xml\n`
        : 'User-agent: *\nDisallow: /\n'
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${publicUrl}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`

      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredUrl = env.VITE_PUBLIC_URL || 'http://127.0.0.1:5173'
  const parsedUrl = new URL(configuredUrl)

  if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
    throw new Error('VITE_PUBLIC_URL must be a public HTTP(S) origin without credentials.')
  }
  if (parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
    throw new Error('VITE_PUBLIC_URL must be an origin without a path, query, or fragment.')
  }

  const publicUrl = parsedUrl.origin
  const indexingEnabled = env.VITE_INDEXING_ENABLED === 'true'

  return {
    plugins: [react(), seoPlugin(publicUrl, indexingEnabled)],
    server: {
      port: 5173,
      strictPort: true,
      proxy: Object.fromEntries(
        ['/api', '/sanctum'].map((path) => [
          path,
          { target: 'http://127.0.0.1:8000', changeOrigin: false },
        ]),
      ),
    },
  }
})
