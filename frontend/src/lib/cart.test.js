import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeCart, changeQuantity } from './cart.js'

test('restores only safe IDs and bounded quantities from untrusted storage', () => {
  assert.deepEqual(
    sanitizeCart([
      null,
      { product_id: 1, quantity: 2, price: 1 },
      { product_id: 1, quantity: 3 },
      { product_id: 2, quantity: -1 },
      { product_id: 3, quantity: 21 },
    ]),
    [{ product_id: 1, quantity: 2 }],
  )
  assert.deepEqual(sanitizeCart({}), [])
})
test('quantity changes merge products, enforce limits and remove zero quantities', () => {
  const cart = changeQuantity([], 1, 2)
  assert.deepEqual(changeQuantity(cart, 1, 99), [{ product_id: 1, quantity: 20 }])
  assert.deepEqual(changeQuantity(cart, 1, 0), [])
  assert.deepEqual(changeQuantity(cart, 1, 1.5), cart)
})
