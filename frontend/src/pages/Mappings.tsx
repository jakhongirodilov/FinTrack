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

  function load() { getMappings().then(setMappings) }

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
    } finally { setAdding(false) }
  }

  async function handleDelete(id: number, kw: string) {
    if (!confirm(`Remove mapping for "${kw}"?`)) return
    await deleteMapping(id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Service Mappings</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.825rem', color: 'var(--muted)' }}>
            Keywords matched against Click import service names (case-insensitive)
          </p>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{mappings.length} mappings</span>
      </div>

      <div className="card">
        {/* Add form */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
          <div className="field" style={{ minWidth: 200, flex: 1 }}>
            <label className="field-label">Keyword</label>
            <input className="input" type="text" placeholder="e.g. baraka market" value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label className="field-label">Maps to category</label>
            <select className="input" value={catId} onChange={e => setCatId(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={adding || !keyword.trim()} style={{ alignSelf: 'flex-end' }}>
            {adding ? 'Adding…' : 'Add mapping'}
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.825rem', marginBottom: '1rem', padding: '0.5rem 0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        {/* Table */}
        {mappings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.9rem', borderTop: '1px solid var(--border)' }}>
            No mappings yet. Add one above.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th className="table-th">Keyword</th>
                <th className="table-th">Category</th>
                <th className="table-th" style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map(m => (
                <tr key={m.id} className="table-row">
                  <td className="table-td">
                    <code style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.82rem', color: 'var(--primary)', fontFamily: 'monospace' }}>
                      {m.keyword}
                    </code>
                  </td>
                  <td className="table-td" style={{ color: 'var(--text-2)' }}>{m.category_name}</td>
                  <td className="table-td">
                    <button className="btn btn-danger" onClick={() => handleDelete(m.id, m.keyword)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
