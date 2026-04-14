import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { getSummary, getMonthlyTotals, getExpenses } from '../api/expenses'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import type { SummaryItem, MonthlyTotalItem } from '../types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']

function fmt(n: number) { return n.toLocaleString() }

function pad(n: number) { return String(n).padStart(2, '0') }
function startStr(y: number, m: number) { return `${y}-${pad(m)}-01` }
function endStr(y: number, m: number) {
  const d = new Date(y, m, 0)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [monthly, setMonthly] = useState<MonthlyTotalItem[]>([])
  const [expenseCount, setExpenseCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const start = startStr(year, month)
  const end = endStr(year, month)
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const isFuture = new Date(year, month - 1, 1) > new Date(now.getFullYear(), now.getMonth(), 1)

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
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
  const avgPerDay = total > 0 && daysPassed > 0 ? Math.round(total / daysPassed) : 0

  const budgetColor = budgetPct == null ? 'var(--primary)'
    : budgetPct >= 100 ? 'var(--danger)'
    : budgetPct >= 80 ? 'var(--warning)'
    : 'var(--success)'

  // Chart colors adapt to theme
  const isDark = theme === 'dark'
  const gridColor = isDark ? '#21262d' : '#f1f5f9'
  const tickColor = isDark ? '#8b949e' : '#94a3b8'
  const tooltipStyle = {
    background: isDark ? '#1c2330' : '#fff',
    border: `1px solid ${isDark ? '#30363d' : '#e2e8f0'}`,
    borderRadius: 8,
    fontSize: '0.85rem',
    color: isDark ? '#e6edf3' : '#0f172a',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <div style={monthNav}>
          <button style={navBtn} onClick={prevMonth} aria-label="Previous month">‹</button>
          <span style={navLabel}>{monthLabel}</span>
          <button style={navBtn} onClick={nextMonth} disabled={isFuture} aria-label="Next month">›</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <StatCard
          label="Total Spent"
          value={loading ? null : fmt(total)}
          sub={isCurrentMonth ? 'this month' : monthLabel}
          accent="var(--primary)"
        />
        <StatCard
          label="Transactions"
          value={loading ? null : String(expenseCount)}
          sub={avgPerDay > 0 ? `~${fmt(avgPerDay)} avg/day` : undefined}
          accent="var(--success)"
        />
        <div className="card" style={{ borderTop: `3px solid ${budgetColor}`, padding: '1.1rem 1.25rem' }}>
          <div style={statLabel}>Budget</div>
          {loading ? (
            <div style={skeleton} />
          ) : budget ? (
            <>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: budgetColor, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(total)}
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 400 }}> / {fmt(budget)}</span>
              </div>
              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
                  <div style={{ height: '100%', width: `${Math.min(budgetPct!, 100)}%`, background: budgetColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ ...statSub, marginTop: '0.3rem' }}>{Math.round(budgetPct!)}% used</div>
              </div>
            </>
          ) : (
            <div style={{ ...statValueStyle, color: 'var(--muted)', fontSize: '1rem', fontWeight: 500 }}>Not set</div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* Pie chart */}
        <div className="card">
          <div style={chartTitle}>{monthLabel}</div>
          <div style={chartSubtitle}>Spending by category</div>
          {loading ? <ChartPlaceholder /> : summary.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={summary}
                  dataKey="total"
                  nameKey="category_name"
                  outerRadius={90}
                  innerRadius={38}
                  paddingAngle={2}
                >
                  {summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly trend */}
        <div className="card">
          <div style={chartTitle}>Monthly Trend</div>
          <div style={chartSubtitle}>Last 6 months</div>
          {loading ? <ChartPlaceholder /> : monthly.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthly} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={56} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category bar chart */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={chartTitle}>By Category</div>
          <div style={chartSubtitle}>Sorted by amount</div>
          {loading ? <ChartPlaceholder /> : summary.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={Math.max(180, summary.length * 42)}>
              <BarChart data={summary} layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category_name" tick={{ fontSize: 12, fill: tickColor }} width={108} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Breakdown table */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={chartTitle}>Breakdown</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem' }}>
            <thead>
              <tr>
                <th className="table-th" style={{ borderRadius: '6px 0 0 6px' }}>Category</th>
                <th className="table-th" style={{ textAlign: 'right' }}>Amount</th>
                <th className="table-th" style={{ textAlign: 'right', borderRadius: '0 6px 6px 0' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, i) => (
                <tr key={i} className="table-row">
                  <td className="table-td">
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: COLORS[i % COLORS.length], marginRight: 8 }} />
                    {row.category_name}
                  </td>
                  <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(row.total)}</td>
                  <td className="table-td" style={{ textAlign: 'right', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {total > 0 ? ((row.total / total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              {!loading && summary.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                  No expenses this period
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | null; sub?: string; accent: string }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${accent}`, padding: '1.1rem 1.25rem' }}>
      <div style={statLabel}>{label}</div>
      {value === null
        ? <div style={skeleton} />
        : <div style={{ ...statValueStyle, color: 'var(--text)' }}>{value}</div>
      }
      <div style={statSub}>{sub ?? '\u00a0'}</div>
    </div>
  )
}

function ChartPlaceholder() {
  return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Loading…</div>
}

function EmptyChart() {
  return <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>No data</div>
}

const monthNav: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.2rem', boxShadow: 'var(--shadow-sm)' }
const navBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-2)', padding: '0.15rem 0.5rem', borderRadius: 5, lineHeight: 1, transition: 'background 0.1s' }
const navLabel: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 600, minWidth: 136, textAlign: 'center', color: 'var(--text)', padding: '0 0.25rem' }
const statLabel: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }
const statValueStyle: React.CSSProperties = { fontSize: '1.55rem', fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }
const statSub: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }
const skeleton: React.CSSProperties = { height: 28, width: '60%', background: 'var(--border)', borderRadius: 6, marginBottom: '0.2rem', animation: 'pulse 1.4s ease-in-out infinite' }
const chartTitle: React.CSSProperties = { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.125rem' }
const chartSubtitle: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }
