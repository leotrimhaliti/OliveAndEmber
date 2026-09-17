import { ArrowRight, Leaf, Minus, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useShop } from './context'
import { useEffect, useRef } from 'react'

export function Modal({ titleId, onClose, busy, small = false, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`panel modal ${small ? 'small' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      {children}
    </dialog>
  )
}

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Olive and Ember home">
      <span className="brand-icon">
        <UtensilsCrossed size={21} />
      </span>
      <span>
        olive <i>&</i> ember<span className="brand-tag">FRESH FOOD. WARM MOMENTS.</span>
      </span>
    </Link>
  )
}
export function Loading({ text = 'Getting things ready…' }) {
  return (
    <div className="empty" role="status">
      <span className="spinner" />
      {text}
    </div>
  )
}
export function ErrorBox({ error, retry }) {
  if (!error) return null
  return (
    <div className="error" role="alert">
      <strong>{error.message}</strong>
      {Object.entries(error.errors || {}).map(([field, messages]) => (
        <div key={field}>{Array.isArray(messages) ? messages.join(' ') : messages}</div>
      ))}
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}
export function Empty({ title, text, link = '/', action = 'Explore the menu' }) {
  return (
    <div className="empty">
      <ShoppingBag size={42} strokeWidth={1} />
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="button" to={link}>
        {action}
        <ArrowRight size={17} />
      </Link>
    </div>
  )
}
export function Protected({ children, admin = false }) {
  const { user, authLoading, authError } = useShop()
  const location = useLocation()
  if (authLoading) return <Loading />
  if (authError) return <ErrorBox error={authError} retry={() => window.location.reload()} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (admin && user.role !== 'admin')
    return <Empty title="This is the kitchen’s space" text="Administrator access is required." />
  return children
}
export function Quantity({ name, quantity, onChange }) {
  return (
    <div className="quantity">
      <button aria-label={`Remove one ${name}`} onClick={() => onChange(quantity - 1)}>
        <Minus size={14} />
      </button>
      <span>{quantity}</span>
      <button
        disabled={quantity >= 20}
        aria-label={`Add one ${name}`}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
export function FoodImage({ product, ...props }) {
  return (
    <img
      {...props}
      src={product.image_url}
      alt={product.name}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.onerror = null
        event.currentTarget.src = '/food-placeholder.svg'
      }}
    />
  )
}
export function PageHeading({ eyebrow, title, text, children }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">
          <Leaf size={14} />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  )
}
