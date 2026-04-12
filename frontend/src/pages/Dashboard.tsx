import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { getSummary, getMonthlyTotals } from '../api/expenses'
import type { SummaryItem, MonthlyTotalItem } from '../types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function fmt(n: number) {
  return n.toLocaleString()
}

export default function Dashboard() {
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [monthly, setMonthly] = useState<MonthlyTotalItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSummary(firstOfMonth(), today()),
      getMonthlyTotals(6),
    ]).then(([s, m]) => {
      setSummary(s)
      setMonthly(m)
    }).finally(() => setLoading(false))
  }, [])

  const total = summary.reduce((s, r) => s + r.total, 0)

  if (loading) return <p>Loading…</p>

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* This month breakdown */}
        <div style={card}>
          <h3 style={cardTitle}>This Month — {fmt(total)}</h3>
          {summary.length === 0 ? (
            <p style={{ color: '#888' }}>No expenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={summary} dataKey="total" nameKey="category_name" outerRadius={100} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly trend */}
        <div style={card}>
          <h3 style={cardTitle}>Last 6 Months</h3>
          {monthly.length === 0 ? (
            <p style={{ color: '#888' }}>No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category bar chart */}
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <h3 style={cardTitle}>By Category</h3>
          {summary.length === 0 ? (
            <p style={{ color: '#888' }}>No expenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary} layout="vertical" margin={{ left: 16, right: 32 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="category_name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category breakdown table */}
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <h3 style={cardTitle}>Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
                <th style={th}>Category</th>
                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                <th style={{ ...th, textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], marginRight: 8 }} />
                    {row.category_name}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(row.total)}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#888' }}>{total > 0 ? ((row.total / total) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const cardTitle: React.CSSProperties = { marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }
const th: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#555' }
const td: React.CSSProperties = { padding: '0.5rem 0.75rem' }
