import { useEffect, useState } from 'react'
import { getMe, updateBudget } from '../api/users'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getMe().then(u => {
      if (u.budget != null) setBudget(String(u.budget))
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(false)
    const val = budget.trim() === '' ? null : Number(budget)
    try {
      const updated = await updateBudget(val)
      updateUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
        {/* Account info */}
        <div className="card">
          <div style={sectionLabel}>Account</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <InfoRow label="Username" value={`@${user?.username ?? '—'}`} />
            {user?.first_name && <InfoRow label="Name" value={[user.first_name, user.last_name].filter(Boolean).join(' ')} />}
          </div>
        </div>

        {/* Budget */}
        <div className="card">
          <div style={sectionLabel}>Monthly Budget</div>
          <p style={{ fontSize: '0.825rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Set a monthly spending limit to track budget usage on the dashboard.
            Leave empty to disable.
          </p>
          <form onSubmit={handleSave}>
            <div className="field" style={{ marginBottom: '0.875rem' }}>
              <label className="field-label">Budget amount</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 3 000 000"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                min={0}
                style={{ maxWidth: 240 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save budget'}
              </button>
              {saved && (
                <span style={{ fontSize: '0.825rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Saved
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.875rem',
}
