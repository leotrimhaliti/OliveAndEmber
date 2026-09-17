import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf } from 'lucide-react'
import { api } from '../lib/api'
import { useShop } from '../context'
import { ErrorBox } from '../components'

export default function Auth({ register = false }) {
  const { user, setUser } = useShop()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  if (user) return <Navigate to={from} replace />
  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await api(register ? '/register' : '/login', {
        method: 'POST',
        body: Object.fromEntries(new FormData(event.currentTarget)),
      })
      if (result?.two_factor) {
        navigate('/two-factor-challenge', { replace: true, state: { from } })
        return
      }
      const session = register ? result : await api('/user')
      setUser(session.data)
      navigate(session.data.email_verified_at ? from : '/account/security', { replace: true })
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-intro">
        <Leaf size={36} />
        <span className="eyebrow">A SEAT AT OUR TABLE</span>
        <h1>{register ? 'Good things start here.' : 'Welcome back to the good stuff.'}</h1>
        <p>Your favorites, your orders, and a little more joy in your day.</p>
      </div>
      <form className="panel auth-form" onSubmit={submit} key={register ? 'register' : 'login'}>
        <h2>{register ? 'Create your account' : 'Make yourself at home'}</h2>
        <p>
          {register
            ? 'A few details, then something delicious.'
            : 'Sign in to order your next favorite meal.'}
        </p>
        <ErrorBox error={error} />
        {register && (
          <label>
            Your name
            <input name="name" autoComplete="name" required maxLength={150} />
          </label>
        )}
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required maxLength={255} />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            minLength={register ? 10 : undefined}
            maxLength={72}
          />
          {register && <small>Use 10–72 characters (at most 72 bytes).</small>}
        </label>
        {register && (
          <>
            <label>
              Confirm password
              <input
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
              />
            </label>
            <details>
              <summary>Joining the kitchen team?</summary>
              <label>
                Administrator invitation code
                <input name="invitation_code" type="password" autoComplete="off" maxLength={255} />
                <small>Only for invited administrators. Leave blank for a customer account.</small>
              </label>
            </details>
          </>
        )}
        <button className="button full" disabled={busy}>
          {busy ? 'One moment…' : register ? 'Create account' : 'Sign in'}
          <ArrowRight size={17} />
        </button>
        {!register && (
          <Link className="forgot-link" to="/forgot-password">
            Forgot your password?
          </Link>
        )}
        <div className="form-footer">
          {register ? 'Already part of the table?' : 'New around here?'}{' '}
          <Link state={{ from }} to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </div>
      </form>
    </div>
  )
}
