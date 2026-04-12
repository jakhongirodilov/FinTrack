import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { getSummary, getMonthlyTotals, getExpenses } from '../api/expenses'
import { useAuth } from '../hooks/useAuth'
import type { SummaryItem, MonthlyTotalItem } from '../types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']

function fmt(n: number) {
  return n.toLocaleString()
}

function lastDayStr(year: number, month: number) {
  const d = new Date(year, month, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export default function Dashboard() {
  const { user } = useAuth()
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [monthly, setMonthly] = useState<MonthlyTotalItem[]>([])
  const [expenseCount, setExpenseCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const start = startStr(year, month)
  const end = lastDayStr(year, month)
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const isAfterCurrentMonth = new Date(year, month - 1, 1) > new Date(now.getFullYear(), now.getMonth(), 1)

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSummary(start, end),
      getExpenses({ start_date: start, end_date: end, page: 1, page_size: 1 }),
      getMonthlyTotals(6),
    ]).then(([s, e, m]) => {
      setSummary(s)
      setExpenseCount(e.total)
      setMonthly(m)
    }).finally(() => setLoading(false))
  }, [year, month])

  const total = summary.reduce((s, r) => s + r.total, 0)
  const budget = user?.budget ?? null
  const budgetPct = budget ? (total / budget) * 100 : null
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth
  const avgPerDay = daysPassed > 0 && total > 0 ? Math.round(total / daysPassed) : 0

  const budgetColor = budgetPct == null ? '#6366f1'
    : budgetPct >= 100 ? '#ef4444'
    : budgetPct >= 80 ? '#f59e0b'
    : '#22c55e'

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.25rem' }}>
          <button style={navBtn} onClick={prevMonth}>‹</button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: 130, textAlign: 'center', color: '#374151' }}>{monthLabel}</span>
          <button style={navBtn} onClick={nextMonth} disabled={isAfterCurrentMonth}>›</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div style={statCard}>
          <div style={statLabel}>Total Spent</div>
          <div style={statValue}>{loading ? '—' : fmt(total)}</div>
          {isCurrentMonth && <div style={statSub}>this month</div>}
        </div>
        <div style={statCard}>
          <div style={statLabel}>Transactions</div>
          <div style={statValue}>{loading ? '—' : expenseCount}</div>
          <div style={statSub}>{expenseCount > 0 && avgPerDay > 0 ? `~${fmt(avgPerDay)} / day` : '\u00a0'}</div>
        </div>
        <div style={{ ...statCard, borderTop: `3px solid ${budgetColor}` }}>
          <div style={statLabel}>Budget</div>
          {budget ? (
            <>
              <div style={{ ...statValue, color: budgetColor }}>{fmt(total)} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 400 }}>/ {fmt(budget)}</span></div>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(budgetPct!, 100)}%`, background: budgetColor, borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
                <div style={{ ...statSub, marginTop: '0.25rem' }}>{Math.round(budgetPct!)}% used</div>
              </div>
            </>
          ) : (
            <div style={{ ...statValue, color: '#cbd5e1', fontSize: '1rem' }}>Not set</div>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={card}>
          <h3 style={cardTitle}>{monthLabel} — {fmt(total)}</h3>
          {loading ? <Placeholder /> : summary.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={summary} dataKey="total" nameKey="category_name" outerRadius={95} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <h3 style={cardTitle}>Last 6 Months</h3>
          {loading ? <Placeholder /> : monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category bar chart */}
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <h3 style={cardTitle}>By Category</h3>
          {loading ? <Placeholder /> : summary.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(200, summary.length * 44)}>
              <BarChart data={summary} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category_name" tick={{ fontSize: 12 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Breakdown table */}
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <h3 style={cardTitle}>Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={th}>Category</th>
                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                <th style={{ ...th, textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={td}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], marginRight: 8, flexShrink: 0 }} />
                    {row.category_name}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(row.total)}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#94a3b8' }}>{total > 0 ? ((row.total / total) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
              {!loading && summary.length === 0 && (
                <tr><td colSpan={3} style={{ ...td, color: '#cbd5e1', textAlign: 'center', padding: '1.5rem' }}>No expenses this month</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Placeholder() {
  return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.9rem' }}>Loading…</div>
}

function Empty() {
  return <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.9rem' }}>No data</div>
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }
const cardTitle: React.CSSProperties = { marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#374151' }
const statCard: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderTop: '3px solid #6366f1' }
const statLabel: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }
const statValue: React.CSSProperties = { fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }
const statSub: React.CSSProperties = { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }
const navBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b', padding: '0.2rem 0.5rem', borderRadius: 5, lineHeight: 1 }
const th: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }
const td: React.CSSProperties = { padding: '0.6rem 0.75rem' }
