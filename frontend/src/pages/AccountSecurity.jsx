import { useEffect, useState } from 'react'
import { Check, Clipboard, KeyRound, Mail, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { ErrorBox, Loading, PageHeading } from '../components'
import { api } from '../lib/api'
import { useShop } from '../context'

export default function AccountSecurity() {
  const { user, setUser, setNotice } = useShop()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [passwordConfirmed, setPasswordConfirmed] = useState(false)
  const [setup, setSetup] = useState(null)

  async function refreshUser() {
    const result = await api('/user')
    setUser(result.data)
    return result.data
  }

  async function loadSetup() {
    const [qr, recoveryCodes] = await Promise.all([
      api('/user/two-factor-qr-code'),
      api('/user/two-factor-recovery-codes'),
    ])
    setSetup({ qr: qr.svg, recoveryCodes })
  }

  useEffect(() => {
    if (user.role !== 'admin') return
    api('/user/confirmed-password-status')
      .then(async ({ confirmed }) => {
        setPasswordConfirmed(confirmed)
        if (confirmed && (user.two_factor_setup_pending || user.two_factor_enabled)) await loadSetup()
      })
      .catch(setError)
  }, [user.role, user.two_factor_enabled, user.two_factor_setup_pending])

  async function action(callback) {
    setBusy(true)
    setError(null)
    try {
      await callback()
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }

  function confirmPassword(event) {
    event.preventDefault()
    action(async () => {
      await api('/user/confirm-password', {
        method: 'POST',
        body: Object.fromEntries(new FormData(event.currentTarget)),
      })
      setPasswordConfirmed(true)
      if (user.two_factor_setup_pending) await loadSetup()
    })
  }

  function enableTwoFactor() {
    action(async () => {
      await api('/user/two-factor-authentication', { method: 'POST' })
      await refreshUser()
      await loadSetup()
    })
  }

  function confirmTwoFactor(event) {
    event.preventDefault()
    action(async () => {
      await api('/user/confirmed-two-factor-authentication', {
        method: 'POST',
        body: Object.fromEntries(new FormData(event.currentTarget)),
      })
      await refreshUser()
      setNotice('Two-factor authentication is active.')
    })
  }

  function disableTwoFactor() {
    action(async () => {
      await api('/user/two-factor-authentication', { method: 'DELETE' })
      setSetup(null)
      await refreshUser()
      setNotice('Two-factor authentication disabled.')
    })
  }

  function resendVerification() {
    action(async () => {
      await api('/email/verification-notification', { method: 'POST' })
      setNotice('A fresh verification link was sent.')
    })
  }

  return (
    <div className="page security-page">
      <PageHeading
        eyebrow="ACCOUNT SECURITY"
        title="Protect your seat at the table."
        text="Manage email verification, account recovery, and administrator sign-in protection."
      />
      <ErrorBox error={error} />
      <div className="security-grid">
        <section className="panel security-card">
          <span className="security-icon"><Mail /></span>
          <div>
            <h2>Email verification</h2>
            <p>{user.email}</p>
          </div>
          {user.email_verified_at ? (
            <span className="verified-badge"><Check size={15} /> Verified</span>
          ) : (
            <>
              <p>Verify your address before checking out or using administrator tools.</p>
              <button className="secondary-button" onClick={resendVerification} disabled={busy}>
                Send verification email
              </button>
            </>
          )}
        </section>

        {user.role === 'admin' && (
          <section className="panel security-card two-factor-card">
            <span className="security-icon"><ShieldCheck /></span>
            <div>
              <h2>Administrator two-factor authentication</h2>
              <p>Required before kitchen, order, and invitation tools can be used.</p>
            </div>
            {!user.email_verified_at ? (
              <p className="muted">Verify your email first.</p>
            ) : !passwordConfirmed ? (
              <form onSubmit={confirmPassword}>
                <label>
                  Confirm your password
                  <input name="password" type="password" autoComplete="current-password" required />
                </label>
                <button className="button" disabled={busy}>Confirm password</button>
              </form>
            ) : user.two_factor_enabled ? (
              <>
                <span className="verified-badge"><Check size={15} /> Active</span>
                {setup?.recoveryCodes && <RecoveryCodes codes={setup.recoveryCodes} />}
                <button className="danger-button" onClick={disableTwoFactor} disabled={busy}>
                  Disable two-factor authentication
                </button>
              </>
            ) : setup ? (
              <TwoFactorSetup setup={setup} busy={busy} onConfirm={confirmTwoFactor} />
            ) : (
              <button className="button" onClick={enableTwoFactor} disabled={busy}>
                <KeyRound size={17} /> Set up authenticator
              </button>
            )}
          </section>
        )}
      </div>
      {user.role === 'admin' && user.two_factor_enabled && <InvitationManager setNotice={setNotice} />}
    </div>
  )
}

function TwoFactorSetup({ setup, busy, onConfirm }) {
  const qrSource = `data:image/svg+xml;base64,${btoa(setup.qr)}`
  return (
    <div className="two-factor-setup">
      <ol>
        <li>Scan this QR code with your authenticator app.</li>
        <li>Enter the current six-digit code to finish setup.</li>
        <li>Save the recovery codes somewhere private.</li>
      </ol>
      <img className="two-factor-qr" src={qrSource} alt="Authenticator setup QR code" />
      <form onSubmit={onConfirm}>
        <label>
          Six-digit code
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required />
        </label>
        <button className="button" disabled={busy}>Activate two-factor authentication</button>
      </form>
      <RecoveryCodes codes={setup.recoveryCodes} />
    </div>
  )
}

function RecoveryCodes({ codes }) {
  return (
    <div className="recovery-codes">
      <strong>Recovery codes</strong>
      <p>Each code works once. Store these outside this device.</p>
      <code>{codes.join('\n')}</code>
    </div>
  )
}

function InvitationManager({ setNotice }) {
  const [result, setResult] = useState(null)
  const [issuedCode, setIssuedCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setError(null)
    try {
      setResult(await api('/admin/invitations'))
    } catch (error) {
      setError(error)
    }
  }
  useEffect(() => { load() }, [])

  async function create(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await api('/admin/invitations', {
        method: 'POST',
        body: Object.fromEntries(new FormData(event.currentTarget)),
      })
      setIssuedCode(response.code)
      event.currentTarget.reset()
      await load()
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id) {
    setError(null)
    try {
      await api(`/admin/invitations/${id}`, { method: 'DELETE' })
      await load()
      setNotice('Invitation revoked.')
    } catch (error) {
      setError(error)
    }
  }

  if (!result) return <Loading text="Loading administrator invitations…" />
  return (
    <section className="panel invitations" aria-labelledby="invitations-title">
      <div>
        <span className="security-icon"><UserPlus /></span>
        <h2 id="invitations-title">Administrator invitations</h2>
        <p>Create a one-time code that expires automatically and can optionally be locked to one email.</p>
      </div>
      <ErrorBox error={error} />
      <form className="invitation-form" onSubmit={create}>
        <label>
          Invitee email <small>(optional)</small>
          <input name="email" type="email" autoComplete="off" />
        </label>
        <label>
          Expires in
          <select name="expires_in_hours" defaultValue="48">
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="168">7 days</option>
          </select>
        </label>
        <button className="button" disabled={busy}>{busy ? 'Creating…' : 'Create invitation'}</button>
      </form>
      {issuedCode && (
        <div className="issued-code" role="status">
          <div>
            <strong>Copy this code now</strong>
            <p>It is stored only as a hash and cannot be shown again.</p>
          </div>
          <code>{issuedCode}</code>
          <button
            className="secondary-button"
            onClick={() => navigator.clipboard.writeText(issuedCode).then(() => setNotice('Invitation copied.'))}
          >
            <Clipboard size={16} /> Copy
          </button>
        </div>
      )}
      <div className="invitation-list">
        {result.data.map((invite) => {
          const expired = new Date(invite.expires_at) < new Date()
          const state = invite.used_at ? 'Used' : expired ? 'Expired' : 'Active'
          return (
            <div key={invite.id}>
              <div>
                <strong>{invite.email || 'Any verified email'}</strong>
                <p>{state} · expires {new Date(invite.expires_at).toLocaleString()}</p>
              </div>
              {!invite.used_at && !expired && (
                <button className="icon-button" aria-label={`Revoke invitation for ${invite.email || 'any email'}`} onClick={() => revoke(invite.id)}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
