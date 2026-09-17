import { useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useShop } from '../context'
import { api, money } from '../lib/api'
import { ErrorBox, FoodImage, Loading, PageHeading, Modal } from '../components'
import { AdminTabs } from './Orders'

export default function AdminProducts() {
  const { products, categories, loading, error: catalogError, reloadCatalog, setNotice } = useShop()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const data = Object.fromEntries(new FormData(event.currentTarget))
    // Parse the decimal string without floating-point currency arithmetic.
    const [whole, fraction = ''] = data.price.split('.')
    data.price_cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    data.category_id = Number(data.category_id)
    data.is_available = data.is_available === 'on'
    delete data.price
    try {
      await api(editing.id ? `/admin/products/${editing.id}` : '/admin/products', {
        method: editing.id ? 'PUT' : 'POST',
        body: data,
      })
      setEditing(null)
      await reloadCatalog()
      setNotice('Menu updated.')
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await api(`/admin/products/${deleting.id}`, { method: 'DELETE' })
      setDeleting(null)
      await reloadCatalog()
      setNotice('Product removed from the menu.')
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="THE KITCHEN DASHBOARD"
        title="Make the menu yours."
        text="Manage the dishes that keep people coming back."
      >
        <button
          className="button"
          onClick={() => {
            setEditing({})
            setError(null)
          }}
        >
          <Plus size={17} />
          New product
        </button>
      </PageHeading>
      <AdminTabs />
      <ErrorBox error={catalogError} retry={reloadCatalog} />
      {!editing && !deleting && <ErrorBox error={error} />}
      {loading ? (
        <Loading />
      ) : (
        <div className="panel product-table">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="table-product">
                      <FoodImage product={product} />
                      <strong>{product.name}</strong>
                    </div>
                  </td>
                  <td>{product.category?.name}</td>
                  <td>{money(product.price_cents)}</td>
                  <td>
                    <span className={`status ${product.is_available ? 'completed' : 'cancelled'}`}>
                      {product.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label={`Edit ${product.name}`}
                        className="icon-button"
                        onClick={() => {
                          setEditing(product)
                          setError(null)
                        }}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        aria-label={`Delete ${product.name}`}
                        className="icon-button"
                        onClick={() => {
                          setDeleting(product)
                          setError(null)
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && (
            <p className="empty">No products yet. Add the first dish to your menu.</p>
          )}
        </div>
      )}
      {editing && (
        <Modal titleId="product-title" busy={busy} onClose={() => setEditing(null)}>
          <div className="modal-heading">
            <h2 id="product-title">{editing.id ? 'Edit product' : 'A new menu favorite'}</h2>
            <button
              disabled={busy}
              className="icon-button"
              aria-label="Close product form"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
          </div>
          <form onSubmit={save}>
            <ErrorBox error={error} />
            <label>
              Product name
              <input autoFocus name="name" defaultValue={editing.name} required maxLength={150} />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={editing.description}
                rows={3}
                required
                maxLength={2000}
              />
            </label>
            <div className="form-row">
              <label>
                Price (USD)
                <input
                  name="price"
                  defaultValue={editing.price_cents ? (editing.price_cents / 100).toFixed(2) : ''}
                  required
                  inputMode="decimal"
                  pattern="[0-9]+(\.[0-9]{1,2})?"
                  placeholder="14.90"
                />
              </label>
              <label>
                Category
                <select
                  name="category_id"
                  defaultValue={editing.category_id || categories[0]?.id}
                  required
                >
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Image URL
              <input
                name="image_url"
                type="url"
                required
                defaultValue={editing.image_url}
                maxLength={2048}
                placeholder="https://…"
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                name="is_available"
                defaultChecked={editing.is_available ?? true}
              />
              Available to order
            </label>
            <button disabled={busy} className="button full">
              {busy ? 'Saving…' : 'Save product'}
            </button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal titleId="delete-title" small busy={busy} onClose={() => setDeleting(null)}>
          <h2 id="delete-title">Remove {deleting.name}?</h2>
          <p>It will disappear from the menu. Existing order history will be preserved.</p>
          <ErrorBox error={error} />
          <div className="modal-actions">
            <button disabled={busy} className="secondary-button" onClick={() => setDeleting(null)}>
              Keep product
            </button>
            <button disabled={busy} className="button danger" onClick={remove}>
              {busy ? 'Removing…' : 'Remove product'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
