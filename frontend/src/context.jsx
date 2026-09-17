import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './lib/api'
import { changeQuantity, sanitizeCart } from './lib/cart'

const ShopContext = createContext(null)
export const useShop = () => useContext(ShopContext)

export function ShopProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [cart, setCart] = useState(() => {
    try {
      return sanitizeCart(JSON.parse(localStorage.getItem('olive-cart') || '[]'))
    } catch {
      return []
    }
  })
  useEffect(() => {
    api('/user')
      .then((result) => setUser(result.data))
      .catch((error) => {
        if (error.status !== 401) setAuthError(error)
      })
      .finally(() => setAuthLoading(false))
  }, [])
  async function reloadCatalog() {
    setLoading(true)
    setError(null)
    try {
      const [p, c] = await Promise.all([api('/products'), api('/categories')])
      setProducts(p.data)
      setCategories(c.data)
    } catch (error) {
      setError(error)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    reloadCatalog()
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('olive-cart', JSON.stringify(cart))
    } catch {
      /* In-memory cart still works when storage is disabled. */
    }
  }, [cart])
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 2600)
      return () => clearTimeout(timer)
    }
  }, [notice])
  const quantity = (id) => cart.find((item) => item.product_id === id)?.quantity || 0
  const updateQuantity = (id, count) => setCart((previous) => changeQuantity(previous, id, count))
  const add = (product) => {
    setCart((previous) =>
      changeQuantity(
        previous,
        product.id,
        (previous.find((item) => item.product_id === product.id)?.quantity || 0) + 1,
      ),
    )
    setNotice(`${product.name} added to your bag`)
  }
  return (
    <ShopContext.Provider
      value={{
        user,
        setUser,
        authLoading,
        authError,
        products,
        categories,
        loading,
        error,
        reloadCatalog,
        cart,
        setCart,
        quantity,
        updateQuantity,
        add,
        setNotice,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
        </div>
      )}
    </ShopContext.Provider>
  )
}
