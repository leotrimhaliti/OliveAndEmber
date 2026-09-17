import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bike, ShieldCheck, Trash2 } from 'lucide-react'
import { useShop } from '../context'
import { api, money } from '../lib/api'
import { Empty, ErrorBox, FoodImage, Loading, PageHeading, Quantity } from '../components'

export default function Cart({ checkout = false }) {
  const {
    cart,
    products,
    loading,
    error: catalogError,
    reloadCatalog,
    updateQuantity,
    setCart,
    user,
    setNotice,
  } = useShop()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const idempotencyKey = useRef(crypto.randomUUID())
  const navigate = useNavigate()
  if (loading) return <Loading />
  if (catalogError) return <ErrorBox error={catalogError} retry={reloadCatalog} />
  if (!cart.length)
    return (
      <Empty
        title="Your bag is waiting for something good"
        text="A little hungry? We’ve got just the thing."
      />
    )
  const lines = cart.map((item) => ({
    ...item,
    product: products.find((p) => p.id === item.product_id),
  }))
  const invalid = lines.some((line) => !line.product?.is_available)
  const total = lines.reduce(
    (sum, line) => sum + (line.product?.price_cents || 0) * line.quantity,
    0,
  )
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await api('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey.current },
        body: { ...Object.fromEntries(new FormData(event.currentTarget)), items: cart },
      })
      setCart([])
      setNotice('Order placed. We’ll get cooking!')
      navigate(`/orders/${result.data.id}`)
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow={checkout ? 'ONE LAST THING' : 'SAVED YOU THE GOOD STUFF'}
        title={checkout ? 'Let’s make it a meal.' : 'Your bag.'}
        text={
          checkout
            ? 'Tell us where to bring your favorites.'
            : 'A little happiness, ready to order.'
        }
      />
      <Link className="back-link" to={checkout ? '/cart' : '/'}>
        <ArrowLeft size={15} />
        {checkout ? 'Back to your bag' : 'Keep exploring'}
      </Link>
      <div className="checkout-grid">
        <div>
          {checkout ? (
            <form id="checkout-form" className="panel" onSubmit={submit}>
              <h2>Delivery details</h2>
              <ErrorBox error={error} />
              <label>
                Full name
                <input
                  name="customer_name"
                  autoComplete="name"
                  defaultValue={user?.name}
                  required
                  maxLength={150}
                />
              </label>
              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  pattern="[+0-9() .\-]{7,40}"
                  maxLength={40}
                  placeholder="+1 202 555 0148"
                />
              </label>
              <label>
                Delivery address
                <textarea
                  name="address"
                  autoComplete="street-address"
                  required
                  maxLength={500}
                  rows={3}
                  placeholder="Street, apartment, city, and postal code"
                />
              </label>
              <label>
                Delivery notes <small>(optional)</small>
                <textarea
                  name="notes"
                  maxLength={1000}
                  rows={2}
                  placeholder="Anything we should know?"
                />
              </label>
              <div className="payment-note">
                <ShieldCheck size={22} />
                <div>
                  <strong>Pay on delivery</strong>
                  <p>No online payment needed. Have your payment ready when your food arrives.</p>
                </div>
              </div>
            </form>
          ) : (
            <div className="panel cart-lines">
              {lines.map((line) => (
                <div className="cart-line" key={line.product_id}>
                  {line.product && <FoodImage product={line.product} />}
                  <div className="cart-line-info">
                    <h3>{line.product?.name || 'Removed product'}</h3>
                    <p>
                      {line.product ? money(line.product.price_cents) : 'No longer on the menu'}
                    </p>
                    {!line.product?.is_available && (
                      <small className="unavailable">Unavailable — please remove this item.</small>
                    )}
                    <Quantity
                      name={line.product?.name || 'item'}
                      quantity={line.quantity}
                      onChange={(q) => updateQuantity(line.product_id, q)}
                    />
                  </div>
                  <strong>{money((line.product?.price_cents || 0) * line.quantity)}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${line.product?.name || 'item'} from bag`}
                    onClick={() => updateQuantity(line.product_id, 0)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="panel order-summary">
          <h2>Your little feast</h2>
          {lines.map((line) => (
            <div className="summary-line" key={line.product_id}>
              <span>
                {line.quantity} × {line.product?.name || 'Removed product'}
              </span>
              <b>{money((line.product?.price_cents || 0) * line.quantity)}</b>
            </div>
          ))}
          <div className="summary-line divider">
            <span>Subtotal</span>
            <b>{money(total)}</b>
          </div>
          <div className="summary-line">
            <span>Delivery</span>
            <span className="green">On us</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <p className="muted">
            USD · Prices include applicable taxes. Final prices are confirmed by the kitchen at
            checkout.
          </p>
          {invalid && (
            <div className="error">
              Please remove unavailable items before checking out. <Link to="/cart">Edit bag</Link>
            </div>
          )}
          {checkout ? (
            <button form="checkout-form" disabled={busy || invalid} className="button full">
              {busy ? 'Placing your order…' : 'Place order'}
              <ArrowRight size={17} />
            </button>
          ) : (
            <Link
              aria-disabled={invalid}
              className={`button full ${invalid ? 'disabled' : ''}`}
              to="/checkout"
            >
              Continue to checkout
              <ArrowRight size={17} />
            </Link>
          )}
          <div className="delivery-note">
            <Bike size={18} />
            Usually at your door in 25–40 min
          </div>
        </aside>
      </div>
    </div>
  )
}
