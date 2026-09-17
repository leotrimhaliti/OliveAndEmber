import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Leaf, LogOut, Settings, ShoppingBag } from 'lucide-react'
import { useShop } from './context'
import { api } from './lib/api'
import { Brand, Empty, Protected } from './components'
import Menu from './pages/Menu'
import Auth from './pages/Auth'
import Cart from './pages/Cart'
import { Orders, OrderDetails } from './pages/Orders'
import AdminProducts from './pages/AdminProducts'
import AccountSecurity from './pages/AccountSecurity'
import { ForgotPassword, ResetPassword, TwoFactorChallenge } from './pages/AccountAccess'
import RouteMetadata from './components/RouteMetadata'

export default function App() {
  const { user, setUser, cart, setNotice } = useShop()
  const navigate = useNavigate()
  async function logout() {
    try {
      await api('/logout', { method: 'POST' })
      setUser(null)
      navigate('/')
      setNotice('You’re signed out.')
    } catch (error) {
      setNotice(error.message)
    }
  }
  return (
    <>
      <RouteMetadata />
      <div className="announcement">
        <Leaf size={13} />
        <span>A little fresh. A little fire. A whole lot of flavor.</span>
        <span className="announcement-right">
          Made with care, delivered to you <ArrowUpRight size={13} />
        </span>
      </div>
      <header className="header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <NavLink to="/">Our menu</NavLink>
            {user && <NavLink to="/orders">My orders</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin/products">Kitchen dashboard</NavLink>}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <Link className="icon-button" to="/account/security" aria-label="Account security">
                  <Settings size={18} />
                </Link>
                <span className="user-name">Hi, {user.name.split(' ')[0]}</span>
                <button className="icon-button" onClick={logout} aria-label="Sign out">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link className="login-link" to="/login">
                Sign in
              </Link>
            )}
            <Link className="bag-link" to="/cart">
              <ShoppingBag size={18} />
              <span>Your bag</span>
              <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>
            </Link>
          </div>
        </div>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/two-factor-challenge" element={<TwoFactorChallenge />} />
          <Route
            path="/account/security"
            element={
              <Protected>
                <AccountSecurity />
              </Protected>
            }
          />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/checkout"
            element={
              <Protected verified>
                <Cart checkout />
              </Protected>
            }
          />
          <Route
            path="/orders"
            element={
              <Protected>
                <Orders />
              </Protected>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <Protected>
                <OrderDetails />
              </Protected>
            }
          />
          <Route
            path="/admin/products"
            element={
              <Protected admin>
                <AdminProducts />
              </Protected>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <Protected admin>
                <Orders admin />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <Empty
                title="This page isn’t on the menu"
                text="Let’s find you something delicious instead."
              />
            }
          />
        </Routes>
      </main>
      <footer>
        <Brand />
        <p>Good ingredients. Honest cooking. Happy people.</p>
        <span>© {new Date().getFullYear()} Olive & Ember</span>
      </footer>
    </>
  )
}
