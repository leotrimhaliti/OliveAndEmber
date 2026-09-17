export async function api(path, options = {}) {
  const method = options.method || 'GET'
  if (method !== 'GET') {
    const csrf = await fetch('/sanctum/csrf-cookie', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!csrf.ok) throw new Error('Could not start a secure session. Please try again.')
  }
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')
    .slice(1)
    .join('=')
  let response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the kitchen. Check your connection and try again.')
  }
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.message || 'Something went wrong. Please try again.')
    error.errors = body.errors || {}
    error.status = response.status
    throw error
  }
  return body
}

export const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
export const statusLabel = (status) => status.replaceAll('_', ' ')
export const statuses = ['pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled']
