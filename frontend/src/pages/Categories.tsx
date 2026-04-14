import { useEffect, useState } from 'react'
import { getCategories, createCategory, deleteCategory } from '../api/categories'
import type { Category } from '../types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  function load() { getCategories().then(setCategories) }
  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true); setError('')
    try {
      await createCategory(name.trim())
      setName('')
      load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error adding category')
    } finally { setAdding(false) }
  }

  async function handleDelete(id: number, catName: string) {
    if (!confirm(`Remove "${catName}"? Past expenses will show as Uncategorized.`)) return
    await deleteCategory(id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Categories</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{categories.length} categories</span>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {/* Add form */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.625rem', marginBottom: error ? '0.75rem' : '1.25rem' }}>
          <input
            className="input"
            type="text"
            placeholder="New category name…"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={adding || !name.trim()}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.825rem', marginBottom: '1rem', padding: '0.5rem 0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        {/* List */}
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
            No categories yet. Add one above.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {categories.map((c, i) => (
              <li key={c.id} style={listItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500 }}>{c.name}</span>
                </div>
                <button className="btn btn-danger" onClick={() => handleDelete(c.id, c.name)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const listItem: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.6rem 0.875rem',
  background: 'var(--surface-2)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  transition: 'background 0.1s',
}
