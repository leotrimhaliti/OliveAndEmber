import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import { api, money, statusLabel, statuses } from '../lib/api'
import { useShop } from '../context'
import { Empty, ErrorBox, Loading, PageHeading } from '../components'

export function AdminTabs() {
  return (
    <div className="admin-tabs">
      <Link to="/admin/products">Products</Link>
      <Link to="/admin/orders">Orders</Link>
    </div>
  )
}
export function Orders({ admin = false }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api(`${admin ? '/admin' : ''}/orders?page=${page}${status ? `&status=${status}` : ''}`)
      .then((data) => {
        if (active) setResult(data)
      })
      .catch((error) => {
        if (active) setError(error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [admin, page, status, refresh])
  return (
    <div className="page">
      <PageHeading
        eyebrow={admin ? 'THE KITCHEN DASHBOARD' : 'FROM OUR KITCHEN TO YOUR TABLE'}
        title={admin ? 'Orders, at a glance.' : 'Your orders.'}
        text={
          admin
            ? 'A little care in every order.'
            : 'Keep up with your latest meal, or revisit an old favorite.'
        }
      >
        <button className="secondary-button" onClick={() => setRefresh((r) => r + 1)}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </PageHeading>
      {admin && (
        <>
          <AdminTabs />
          <label className="filter-label">
            Filter status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <ErrorBox error={error} retry={() => setRefresh((r) => r + 1)} />
      {loading ? (
        <Loading />
      ) : (
        !error &&
        (result?.data.length ? (
          <>
            <div className="orders-list">
              {result.data.map((order) => (
                <Link className="panel order-card" key={order.id} to={`/orders/${order.id}`}>
                  <span className="order-icon">
                    <ShoppingIcon status={order.status} />
                  </span>
                  <div>
                    <h3>Order #{String(order.id).padStart(4, '0')}</h3>
                    <p>
                      {new Date(order.created_at).toLocaleString()} ·{' '}
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </p>
                    {admin && <p>{order.customer_name}</p>}
                  </div>
                  <span className={`status ${order.status}`}>{statusLabel(order.status)}</span>
                  <strong>{money(order.total_cents)}</strong>
                  <ArrowRight size={18} />
                </Link>
              ))}
            </div>
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {result.current_page} of {result.last_page}
              </span>
              <button disabled={page >= result.last_page} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </>
        ) : (
          <Empty
            title={admin ? 'No orders here yet' : 'Your first favorite is waiting'}
            text={
              admin
                ? 'New orders will appear here. Try another filter.'
                : 'Your meals will appear here once you place an order.'
            }
          />
        ))
      )}
    </div>
  )
}
function ShoppingIcon({ status }) {
  return status === 'completed' ? (
    <PackageCheck />
  ) : status === 'out_for_delivery' ? (
    <Truck />
  ) : (
    <UtensilsCrossed />
  )
}
export function OrderDetails() {
  const { id } = useParams()
  const { user, setNotice } = useShop()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  async function load() {
    setError(null)
    try {
      const result = await api(`/orders/${id}`)
      setOrder(result.data)
      setStatus(result.data.status)
    } catch (error) {
      setError(error)
    }
  }
  useEffect(() => {
    load()
  }, [id])
  async function update(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } })
      setOrder(result.data)
      setNotice('Order status updated.')
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  if (!order)
    return (
      <div className="page">{error ? <ErrorBox error={error} retry={load} /> : <Loading />}</div>
    )
  const activeStep = statuses.indexOf(order.status)
  return (
    <div className="page">
      <Link className="back-link" to={user.role === 'admin' ? '/admin/orders' : '/orders'}>
        <ArrowLeft size={15} />
        Back to orders
      </Link>
      <PageHeading
        eyebrow="THANKS FOR ORDERING WITH US"
        title={`Order #${String(order.id).padStart(4, '0')}`}
        text={`Placed ${new Date(order.created_at).toLocaleString()}`}
      >
        <button className="secondary-button" onClick={load}>
          <RefreshCw size={16} />
          Refresh status
        </button>
      </PageHeading>
      <ErrorBox error={error} />
      <div className="panel tracking">
        <span className={`status ${order.status}`}>{statusLabel(order.status)}</span>
        <h2>
          {order.status === 'cancelled'
            ? 'This order was cancelled.'
            : order.status === 'completed'
              ? 'Hope that hit the spot.'
              : 'Good things are on their way.'}
        </h2>
        {order.status !== 'cancelled' && (
          <div className="steps">
            {[Clock3, UtensilsCrossed, Truck, Check].map((Icon, index) => (
              <div className={index <= activeStep ? 'done' : ''} key={index}>
                <span>
                  <Icon size={20} />
                </span>
                <small>{statusLabel(statuses[index])}</small>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="checkout-grid">
        <div className="panel">
          <h2>What’s in your order</h2>
          {order.items.map((item) => (
            <div className="summary-line order-item" key={item.id}>
              <div>
                <strong>
                  {item.quantity} × {item.product_name}
                </strong>
                <p>{money(item.unit_price_cents)} each</p>
              </div>
              <b>{money(item.unit_price_cents * item.quantity)}</b>
            </div>
          ))}
          <div className="summary-total">
            <span>Total · pay on delivery</span>
            <strong>{money(order.total_cents)}</strong>
          </div>
        </div>
        <div className="panel">
          <h2>
            <MapPin size={20} /> Delivering to
          </h2>
          <strong>{order.customer_name}</strong>
          <p className="preserve-lines">{order.address}</p>
          <p>{order.phone}</p>
          {order.notes && (
            <>
              <h3>Delivery notes</h3>
              <p className="preserve-lines">{order.notes}</p>
            </>
          )}
          {user.role === 'admin' && (
            <form className="status-form" onSubmit={update}>
              <label>
                Update order status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button full" disabled={busy || status === order.status}>
                {busy ? 'Saving…' : 'Save status'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
