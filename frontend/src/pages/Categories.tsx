import { useEffect, useState } from 'react'
import { getCategories, createCategory, deleteCategory } from '../api/categories'
import type { Category } from '../types'

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  function load() {
    getCategories().then(setCategories)
  }

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
      setError(err?.response?.data?.detail || 'Error')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number, catName: string) {
    if (!confirm(`Remove "${catName}"? Past expenses will show as Uncategorized.`)) return
    await deleteCategory(id)
    load()
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Categories</h2>
      <div style={card}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={label}>New category</label>
            <input style={input} type="text" placeholder="e.g. Dining" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <button type="submit" disabled={adding} style={btnPrimary}>Add</button>
        </form>
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {categories.map(c => (
            <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f9f9f9', borderRadius: 6 }}>
              <span>{c.name}</span>
              <button style={btnDanger} onClick={() => handleDelete(c.id, c.name)}>Remove</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const label: React.CSSProperties = { fontSize: '0.8rem', color: '#555', fontWeight: 500 }
const input: React.CSSProperties = { padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', minWidth: 200 }
const btnPrimary: React.CSSProperties = { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.9rem' }
const btnDanger: React.CSSProperties = { background: 'none', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }
