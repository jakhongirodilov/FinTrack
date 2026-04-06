import { useEffect, useState } from 'react'
import { getMappings, createMapping, deleteMapping } from '../api/mappings'
import { getCategories } from '../api/categories'
import type { Mapping, Category } from '../types'

export default function Mappings() {
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [keyword, setKeyword] = useState('')
  const [catId, setCatId] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  function load() {
    getMappings().then(setMappings)
  }

  useEffect(() => {
    load()
    getCategories().then(cats => {
      setCategories(cats)
      if (cats.length > 0) setCatId(String(cats[0].id))
    })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || !catId) return
    setAdding(true); setError('')
    try {
      await createMapping(keyword.trim().toLowerCase(), Number(catId))
      setKeyword('')
      load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number, kw: string) {
    if (!confirm(`Remove mapping for "${kw}"?`)) return
    await deleteMapping(id)
    load()
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Service Mappings</h2>
      <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Keywords are matched against service names in Click imports (case-insensitive substring match).
      </p>
      <div style={card}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={fieldCol}>
            <label style={label}>Keyword</label>
            <input style={input} type="text" placeholder="e.g. baraka market" value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <div style={fieldCol}>
            <label style={label}>Category</label>
            <select style={input} value={catId} onChange={e => setCatId(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={adding} style={btnPrimary}>Add</button>
        </form>
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
              <th style={th}>Keyword</th>
              <th style={th}>Category</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td}><code style={{ background: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{m.keyword}</code></td>
                <td style={td}>{m.category_name}</td>
                <td style={td}><button style={btnDanger} onClick={() => handleDelete(m.id, m.keyword)}>Remove</button></td>
              </tr>
            ))}
            {mappings.length === 0 && <tr><td colSpan={3} style={{ ...td, color: '#aaa', textAlign: 'center' }}>No mappings yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const fieldCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const label: React.CSSProperties = { fontSize: '0.8rem', color: '#555', fontWeight: 500 }
const input: React.CSSProperties = { padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', minWidth: 180 }
const th: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#555' }
const td: React.CSSProperties = { padding: '0.5rem 0.75rem' }
const btnPrimary: React.CSSProperties = { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.9rem' }
const btnDanger: React.CSSProperties = { background: 'none', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }
