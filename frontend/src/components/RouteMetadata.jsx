import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const descriptions = {
  '/': 'Order burgers, pizza, salads, sides, desserts, and drinks from Olive & Ember. Freshly prepared comfort food, delivered.',
  '/login': 'Sign in to your Olive & Ember account.',
  '/register': 'Create your Olive & Ember account.',
  '/forgot-password': 'Reset your Olive & Ember account password.',
  '/cart': 'Review your Olive & Ember order.',
}

const titles = {
  '/': 'Olive & Ember | Fresh Food Delivery',
  '/login': 'Sign in | Olive & Ember',
  '/register': 'Create an account | Olive & Ember',
  '/forgot-password': 'Forgot password | Olive & Ember',
  '/cart': 'Your bag | Olive & Ember',
}

export default function RouteMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const isHomepage = pathname === '/'
    const robots = document.querySelector('meta[name="robots"]')
    const description = document.querySelector('meta[name="description"]')
    const indexingEnabled = robots?.dataset.indexingEnabled === 'true'

    document.title = titles[pathname] || 'Olive & Ember'
    description?.setAttribute(
      'content',
      descriptions[pathname] || 'Olive & Ember customer account and ordering page.',
    )
    robots?.setAttribute(
      'content',
      isHomepage && indexingEnabled
        ? 'index, follow, max-image-preview:large'
        : 'noindex, nofollow',
    )
  }, [pathname])

  return null
}
