import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Bike,
  Clock3,
  Leaf,
  Plus,
  Search,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShop } from '../context'
import { money } from '../lib/api'
import { ErrorBox, FoodImage, Loading } from '../components'

export default function Menu() {
  const { products, categories, loading, error, reloadCatalog, add, quantity, cart } = useShop()
  const [category, setCategory] = useState(null)
  const [search, setSearch] = useState('')
  const featured = products.find((product) => product.is_available)
  const filtered = products.filter(
    (product) =>
      (!category || product.category_id === category) &&
      `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase()),
  )
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.reduce(
    (sum, item) =>
      sum + (products.find((p) => p.id === item.product_id)?.price_cents || 0) * item.quantity,
    0,
  )
  return (
    <div className="menu-page">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Good food.
            <br />
            Even better <em>mood.</em>
          </h1>
          <p>
            Fresh ingredients, a little kitchen magic, and all your favorites. Made to order.
            Delivered with love.
          </p>
          <a className="button" href="#menu">
            Find your flavor <ArrowDown size={17} />
          </a>
          <div className="hero-note">
            <span className="mini-leaf">
              <Leaf size={18} />
            </span>
            Thoughtfully sourced. Freshly prepared.
          </div>
        </div>
        <div className="hero-photo">
          <img
            src={featured?.image_url || '/food-placeholder.svg'}
            alt={featured?.name || 'Fresh from our kitchen'}
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = '/food-placeholder.svg'
            }}
          />
          <div className="photo-shade" />
          <div className="photo-caption">
            <div>
              <span>Meet your new usual.</span>
              <h2>{featured?.name || 'Fresh from our kitchen'}</h2>
            </div>
            {featured && <span className="hero-price">{money(featured.price_cents)}</span>}
          </div>
          <div className="made-fresh">
            MADE
            <br />
            <strong>fresh</strong>
            <br />
            JUST FOR YOU
          </div>
        </div>
      </section>
      <div className="perks">
        <span>
          <Leaf />
          Real ingredients<span>Nothing but the good stuff</span>
        </span>
        <span>
          <UtensilsCrossed />
          Made to order<span>Fresh from our kitchen</span>
        </span>
        <span>
          <Bike />
          Free delivery<span>A little extra on us</span>
        </span>
        <span>
          <Clock3 />
          Worth the wait<span>Usually 25–40 minutes</span>
        </span>
      </div>
      <section id="menu" className="menu-section">
        <div className="menu-title">
          <div>
            <span className="eyebrow">A LITTLE SOMETHING FOR EVERY CRAVING</span>
            <h2>What sounds good?</h2>
          </div>
          <label className="search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find your favorite…"
              aria-label="Search the menu"
            />
          </label>
        </div>
        <div className="category-tabs" aria-label="Food categories">
          <button className={category === null ? 'selected' : ''} onClick={() => setCategory(null)}>
            <UtensilsCrossed size={16} />
            All the good stuff
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'selected' : ''}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="results-line">
          <span>
            {category ? categories.find((c) => c.id === category)?.name : 'Fresh from the kitchen'}{' '}
            <small>({filtered.length})</small>
          </span>
          <span>
            <Leaf size={13} />
            Made with good ingredients
          </span>
        </div>
        <ErrorBox error={error} retry={reloadCatalog} />
        {loading ? (
          <Loading text="Opening the menu…" />
        ) : (
          !error &&
          (filtered.length ? (
            <div className="product-grid">
              {filtered.map((product, index) => (
                <article className="product-card" key={product.id}>
                  <div className="product-photo">
                    <FoodImage product={product} />
                    {!product.is_available ? (
                      <span className="food-tag sold-out">Back soon</span>
                    ) : index === 2 && !category ? (
                      <span className="food-tag">FRESHLY BAKED</span>
                    ) : null}
                    {quantity(product.id) > 0 && (
                      <span className="in-bag">{quantity(product.id)} in bag</span>
                    )}
                  </div>
                  <div className="product-body">
                    <span className="product-category">{product.category?.name}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-bottom">
                      <strong>{money(product.price_cents)}</strong>
                      <button
                        className="add-button"
                        disabled={!product.is_available || quantity(product.id) >= 20}
                        onClick={() => add(product)}
                        aria-label={`Add ${product.name} to bag`}
                      >
                        <Plus size={17} />
                        <span>{product.is_available ? 'Add to bag' : 'Unavailable'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <Search size={32} />
              <h3>No bites found</h3>
              <p>Try another search or category.</p>
              <button
                className="text-button"
                onClick={() => {
                  setSearch('')
                  setCategory(null)
                }}
              >
                Reset filters
              </button>
            </div>
          ))
        )}
      </section>
      <section className="bottom-banner">
        <Leaf size={29} />
        <div>
          <h3>A good meal makes the day.</h3>
          <p>Thanks for saving a seat for us at your table.</p>
        </div>
        <span>From our kitchen, with love.</span>
      </section>
      {count > 0 && (
        <Link className="floating-bag" to="/cart">
          <ShoppingBag size={20} />
          <span>
            {count} {count === 1 ? 'item' : 'items'} in your bag
          </span>
          <b>{money(total)}</b>
          <ArrowRight size={18} />
        </Link>
      )}
    </div>
  )
}
