import { useEffect, useState } from 'react'
import { getMe, updateBudget } from '../api/users'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { updateUser } = useAuth()
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getMe().then(user => {
      if (user.budget != null) setBudget(String(user.budget))
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
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Settings</h2>
      <div style={card}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Monthly Budget</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={label}>Budget amount (leave empty to unset)</label>
            <input style={input} type="number" placeholder="e.g. 3000000" value={budget} onChange={e => setBudget(e.target.value)} min={0} />
          </div>
          <button type="submit" disabled={saving} style={btnPrimary}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 480 }
const label: React.CSSProperties = { fontSize: '0.8rem', color: '#555', fontWeight: 500 }
const input: React.CSSProperties = { padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', minWidth: 220 }
const btnPrimary: React.CSSProperties = { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.9rem' }
