export function sanitizeCart(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value
    .filter((item) => {
      if (
        !item ||
        !Number.isInteger(item.product_id) ||
        item.product_id <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 20 ||
        seen.has(item.product_id)
      )
        return false
      seen.add(item.product_id)
      return true
    })
    .slice(0, 50)
    .map(({ product_id, quantity }) => ({ product_id, quantity }))
}

export function changeQuantity(cart, id, quantity) {
  if (!Number.isInteger(quantity)) return cart
  if (quantity <= 0) return cart.filter((item) => item.product_id !== id)
  const next = Math.min(quantity, 20)
  if (cart.some((item) => item.product_id === id))
    return cart.map((item) => (item.product_id === id ? { ...item, quantity: next } : item))
  return cart.length >= 50 ? cart : [...cart, { product_id: id, quantity: next }]
}
