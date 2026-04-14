import { useEffect, useState } from 'react'
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses'
import { getCategories } from '../api/categories'
import type { Expense, Category } from '../types'

const PAGE_SIZE = 50

function fmtDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface EditState {
  id: number
  amount: string
  category_id: string
  expense_date: string
  note: string
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterCat, setFilterCat] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [loading, setLoading] = useState(false)

  const [amount, setAmount] = useState('')
  const [catId, setCatId] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  function load(p = page) {
    setLoading(true)
    const params: Record<string, unknown> = { page: p, page_size: PAGE_SIZE }
    if (filterCat) params.category_id = Number(filterCat)
    if (filterStart) params.start_date = filterStart
    if (filterEnd) params.end_date = filterEnd
    getExpenses(params as Parameters<typeof getExpenses>[0])
      .then(({ items, total }) => { setExpenses(items); setTotal(total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { getCategories().then(setCategories) }, [])
  useEffect(() => { load(1); setPage(1) }, [filterCat, filterStart, filterEnd])
  useEffect(() => { load(page) }, [page])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !catId) return
    setAdding(true)
    try {
      await createExpense({ amount: Number(amount), category_id: Number(catId), expense_date: expDate, note: note || undefined })
      setAmount(''); setNote('')
      load(1); setPage(1)
    } finally { setAdding(false) }
  }

  function startEdit(e: Expense) {
    setEditing({ id: e.id, amount: String(e.amount), category_id: e.category_id ? String(e.category_id) : '', expense_date: e.expense_date, note: e.note ?? '' })
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      await updateExpense(editing.id, {
        amount: Number(editing.amount),
        category_id: editing.category_id ? Number(editing.category_id) : undefined,
        expense_date: editing.expense_date,
        note: editing.note || undefined,
      })
      setEditing(null)
      load(page)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Error saving')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(id)
    load(page)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Expenses</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{total} total</span>
      </div>

      {/* Add form */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add Expense</div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ minWidth: 120 }}>
            <label className="field-label">Amount</label>
            <input className="input" type="number" placeholder="5000" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label className="field-label">Category</label>
            <select className="input" value={catId} onChange={e => setCatId(e.target.value)} required>
              <option value="">Select…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 140 }}>
            <label className="field-label">Date</label>
            <input className="input" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required />
          </div>
          <div className="field" style={{ minWidth: 160, flex: 1 }}>
            <label className="field-label">Note</label>
            <input className="input" type="text" placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={adding} style={{ alignSelf: 'flex-end' }}>
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ minWidth: 150 }}>
          <label className="field-label">Category</label>
          <select className="input" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 140 }}>
          <label className="field-label">From</label>
          <input className="input" type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
        </div>
        <div className="field" style={{ minWidth: 140 }}>
          <label className="field-label">To</label>
          <input className="input" type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
        </div>
        {(filterCat || filterStart || filterEnd) && (
          <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={() => { setFilterCat(''); setFilterStart(''); setFilterEnd('') }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={overlay} onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Edit Expense</h3>
              <button className="btn-icon" onClick={() => setEditing(null)} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="field">
                <label className="field-label">Amount</label>
                <input className="input" type="number" value={editing.amount} onChange={e => setEditing({ ...editing, amount: e.target.value })} required />
              </div>
              <div className="field">
                <label className="field-label">Category</label>
                <select className="input" value={editing.category_id} onChange={e => setEditing({ ...editing, category_id: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Date</label>
                <input className="input" type="date" value={editing.expense_date} onChange={e => setEditing({ ...editing, expense_date: e.target.value })} required />
              </div>
              <div className="field">
                <label className="field-label">Note</label>
                <input className="input" type="text" value={editing.note} onChange={e => setEditing({ ...editing, note: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            {total === 0 ? 'No expenses' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', minWidth: 60, textAlign: 'center' }}>{page} / {totalPages || 1}</span>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Category</th>
                <th className="table-th" style={{ textAlign: 'right' }}>Amount</th>
                <th className="table-th">Note</th>
                <th className="table-th" style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="table-row">
                  <td className="table-td" style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{fmtDate(e.expense_date)}</td>
                  <td className="table-td">
                    {e.category_name ?? <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Uncategorized</span>}
                  </td>
                  <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {e.amount.toLocaleString()}
                  </td>
                  <td className="table-td" style={{ color: 'var(--text-2)', fontSize: '0.825rem', maxWidth: 200 }}>
                    {e.note}
                    {e.import_ref && <span title="Imported" style={{ marginLeft: 4, color: 'var(--muted)', fontSize: '0.75rem' }}>↩</span>}
                  </td>
                  <td className="table-td" style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost" onClick={() => startEdit(e)}>Edit</button>
                      <button className="btn-icon" onClick={() => handleDelete(e.id)} title="Delete" style={{ color: 'var(--muted)', fontSize: '1rem' }}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  backdropFilter: 'blur(2px)',
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem',
  width: 380, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
}
