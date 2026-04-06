import { useEffect, useState } from 'react'
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses'
import { getCategories } from '../api/categories'
import type { Expense, Category } from '../types'

const PAGE_SIZE = 50

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

  // Add form
  const [amount, setAmount] = useState('')
  const [catId, setCatId] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit state
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  function load(p = page) {
    setLoading(true)
    const params: any = { page: p, page_size: PAGE_SIZE }
    if (filterCat) params.category_id = Number(filterCat)
    if (filterStart) params.start_date = filterStart
    if (filterEnd) params.end_date = filterEnd
    getExpenses(params).then(({ items, total }) => {
      setExpenses(items)
      setTotal(total)
    }).finally(() => setLoading(false))
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
    } finally {
      setAdding(false)
    }
  }

  function startEdit(e: Expense) {
    setEditing({
      id: e.id,
      amount: String(e.amount),
      category_id: e.category_id ? String(e.category_id) : '',
      expense_date: e.expense_date,
      note: e.note ?? '',
    })
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
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(id)
    load(page)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Expenses</h2>

      {/* Add form */}
      <div style={card}>
        <h3 style={cardTitle}>Add Expense</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={field}>
            <label style={label}>Amount</label>
            <input style={input} type="number" placeholder="5000" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div style={field}>
            <label style={label}>Category</label>
            <select style={input} value={catId} onChange={e => setCatId(e.target.value)} required>
              <option value="">Select…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={field}>
            <label style={label}>Date</label>
            <input style={input} type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required />
          </div>
          <div style={field}>
            <label style={label}>Note</label>
            <input style={input} type="text" placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <button type="submit" disabled={adding} style={btnPrimary}>Add</button>
        </form>
      </div>

      {/* Filters */}
      <div style={{ ...card, marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={field}>
          <label style={label}>Category</label>
          <select style={input} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={field}>
          <label style={label}>From</label>
          <input style={input} type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
        </div>
        <div style={field}>
          <label style={label}>To</label>
          <input style={input} type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
        </div>
        <button style={btnSecondary} onClick={() => { setFilterCat(''); setFilterStart(''); setFilterEnd('') }}>Clear</button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ marginBottom: '1rem' }}>Edit Expense</h3>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={field}>
                <label style={label}>Amount</label>
                <input style={input} type="number" value={editing.amount} onChange={e => setEditing({ ...editing, amount: e.target.value })} required />
              </div>
              <div style={field}>
                <label style={label}>Category</label>
                <select style={input} value={editing.category_id} onChange={e => setEditing({ ...editing, category_id: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={field}>
                <label style={label}>Date</label>
                <input style={input} type="date" value={editing.expense_date} onChange={e => setEditing({ ...editing, expense_date: e.target.value })} required />
              </div>
              <div style={field}>
                <label style={label}>Note</label>
                <input style={input} type="text" value={editing.note} onChange={e => setEditing({ ...editing, note: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" style={btnSecondary} onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" style={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ ...card, marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>{total} expenses</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: '0.9rem', padding: '0.3rem 0.5rem' }}>{page} / {totalPages || 1}</span>
            <button style={btnSecondary} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
        {loading ? <p>Loading…</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
                <th style={th}>Date</th>
                <th style={th}>Category</th>
                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                <th style={th}>Note</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>{e.expense_date}</td>
                  <td style={td}>{e.category_name ?? <span style={{ color: '#aaa' }}>Uncategorized</span>}</td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.amount.toLocaleString()}</td>
                  <td style={{ ...td, color: '#888', fontSize: '0.85rem' }}>
                    {e.note}
                    {e.import_ref && <span title="Imported from Click" style={{ marginLeft: 4, color: '#aaa' }}>↩</span>}
                  </td>
                  <td style={{ ...td, display: 'flex', gap: '0.4rem' }}>
                    <button style={btnEdit} onClick={() => startEdit(e)}>Edit</button>
                    <button style={btnDanger} onClick={() => handleDelete(e.id)}>✕</button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={5} style={{ ...td, color: '#aaa', textAlign: 'center' }}>No expenses</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const cardTitle: React.CSSProperties = { marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const label: React.CSSProperties = { fontSize: '0.8rem', color: '#555', fontWeight: 500 }
const input: React.CSSProperties = { padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', minWidth: 120 }
const th: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#555' }
const td: React.CSSProperties = { padding: '0.5rem 0.75rem' }
const btnPrimary: React.CSSProperties = { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.9rem' }
const btnSecondary: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #d1d5db', borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }
const btnEdit: React.CSSProperties = { background: 'none', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }
const btnDanger: React.CSSProperties = { background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.1rem 0.3rem' }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const modal: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '1.5rem', width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }
