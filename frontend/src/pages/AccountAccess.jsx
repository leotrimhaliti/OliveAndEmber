import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, KeyRound, Mail } from 'lucide-react'
import { ErrorBox } from '../components'
import { api } from '../lib/api'
import { useShop } from '../context'

function AccessLayout({ icon: Icon, eyebrow, title, text, children }) {
  return (
    <div className="auth-wrap access-page">
      <div className="auth-intro">
        <Icon size={36} />
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <div className="panel auth-form">{children}</div>
    </div>
  )
}

export function ForgotPassword() {
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/forgot-password', {
        method: 'POST',
        body: Object.fromEntries(new FormData(event.currentTarget)),
      })
      setSent(true)
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AccessLayout
      icon={Mail}
      eyebrow="ACCOUNT RECOVERY"
      title="Let’s get you back in."
      text="We’ll send a secure reset link if an account matches that address."
    >
      {sent ? (
        <div className="success-box" role="status">
          Check your inbox for the password reset link.
        </div>
      ) : (
        <form onSubmit={submit}>
          <ErrorBox error={error} />
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button className="button full" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'} <ArrowRight size={17} />
          </button>
        </form>
      )}
      <div className="form-footer">
        <Link to="/login">Back to sign in</Link>
      </div>
    </AccessLayout>
  )
}

export function ResetPassword() {
  const { token } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/reset-password', {
        method: 'POST',
        body: { ...Object.fromEntries(new FormData(event.currentTarget)), token },
      })
      navigate('/login', { replace: true, state: { reset: true } })
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AccessLayout
      icon={KeyRound}
      eyebrow="NEW PASSWORD"
      title="Choose something secure."
      text="Use a unique password with at least 10 characters."
    >
      <form onSubmit={submit}>
        <ErrorBox error={error} />
        <input name="email" type="hidden" value={search.get('email') || ''} />
        <label>
          New password
          <input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required />
        </label>
        <label>
          Confirm password
          <input name="password_confirmation" type="password" autoComplete="new-password" minLength={10} maxLength={72} required />
        </label>
        <button className="button full" disabled={busy}>
          {busy ? 'Saving…' : 'Reset password'} <ArrowRight size={17} />
        </button>
      </form>
    </AccessLayout>
  )
}

export function TwoFactorChallenge() {
  const { setUser } = useShop()
  const [recovery, setRecovery] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/two-factor-challenge', {
        method: 'POST',
        body: Object.fromEntries(new FormData(event.currentTarget)),
      })
      const session = await api('/user')
      setUser(session.data)
      navigate(location.state?.from || '/', { replace: true })
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AccessLayout
      icon={KeyRound}
      eyebrow="TWO-FACTOR CHECK"
      title="One more secure step."
      text={recovery ? 'Enter one of your saved recovery codes.' : 'Enter the six-digit code from your authenticator app.'}
    >
      <form onSubmit={submit}>
        <ErrorBox error={error} />
        <label>
          {recovery ? 'Recovery code' : 'Authentication code'}
          <input
            name={recovery ? 'recovery_code' : 'code'}
            inputMode={recovery ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            required
            autoFocus
          />
        </label>
        <button className="button full" disabled={busy}>
          {busy ? 'Checking…' : 'Continue'} <ArrowRight size={17} />
        </button>
      </form>
      <button className="text-button access-switch" onClick={() => setRecovery((value) => !value)}>
        {recovery ? 'Use an authenticator code' : 'Use a recovery code'}
      </button>
    </AccessLayout>
  )
}
