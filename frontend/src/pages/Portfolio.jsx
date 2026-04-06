import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Search, X, Sparkles,
  TrendingUp, TrendingDown, Wrench, AlertTriangle, Loader2, BarChart2,
} from 'lucide-react'
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePortfolioPositions } from '../hooks/usePortfolioPositions'
import { api } from '../lib/api'
import AssetLogo from '../components/AssetLogo'

const COLORS = ['#3b82f6','#00b15d','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6']

function fmtCurrency(n, currency = 'USD') {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('de', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}
function fmtPct(n) {
  if (n == null || isNaN(n)) return ''
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

// ── Add-Position Sheet ────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}

const TYPE_LABEL = { EQUITY: 'Aktie', ETF: 'ETF', CRYPTOCURRENCY: 'Krypto', FUTURE: 'Rohstoff', INDEX: 'Index', CURRENCY: 'Währung' }
const TYPE_COLOR = { EQUITY: 'text-blue-400', ETF: 'text-purple-400', CRYPTOCURRENCY: 'text-yellow-400', FUTURE: 'text-orange-400' }

function AddPositionSheet({ onClose, onAdd, dark }) {
  const [step,     setStep]     = useState('search')  // 'search' | 'form'
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [asset,    setAsset]    = useState(null)
  const [quantity, setQuantity] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [saving,   setSaving]   = useState(false)
  const inputRef  = useRef(null)
  const qtyRef    = useRef(null)
  const debounced = useDebounce(query, 280)

  const text  = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub   = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const bg    = dark ? 'bg-tp-bg'      : 'bg-tp-bg-l'
  const card  = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const input = dark
    ? 'bg-tp-border border-tp-border text-tp-text placeholder-tp-sub focus:border-tp-blue'
    : 'bg-tp-border-l border-tp-border-l text-tp-text-l placeholder-tp-sub-l focus:border-tp-blue'

  // Scroll lock (same as CategorySheet)
  useEffect(() => {
    const y = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top      = `-${y}px`
    document.body.style.width    = '100%'
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.position = ''
      document.body.style.top      = ''
      document.body.style.width    = ''
      document.body.style.overflow = ''
      window.scrollTo(0, y)
    }
  }, [])

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  useEffect(() => {
    // Bug fix: if query cleared while request in-flight, loading must still reset
    if (!debounced.trim()) { setResults([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    api.search(debounced)
      .then(d => { if (!cancelled) setResults(d.results ?? []) })
      .catch(() => { if (!cancelled) setResults([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debounced])

  const selectAsset = (r) => {
    setAsset(r)
    setStep('form')
    setTimeout(() => qtyRef.current?.focus(), 80)
  }

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return
    setSaving(true)
    try {
      await onAdd(asset.symbol, asset.name, asset.type, quantity, avgPrice || null)
      onClose()
    } catch { setSaving(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className={`relative mt-auto rounded-t-3xl ${bg} flex flex-col max-h-[90vh]`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className={`w-10 h-1 rounded-full ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
          <div>
            {step === 'search'
              ? <h2 className={`text-lg font-bold ${text}`}>Position hinzufügen</h2>
              : <button onClick={() => { setStep('search'); setAsset(null) }}
                  className={`text-sm text-tp-blue font-medium`}>← Zurück</button>
            }
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`}>
            <X size={15} className={sub} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 space-y-4" style={{ paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 16px))' }}>
          {step === 'search' ? (
            <>
              {/* Search input */}
              <div className={`flex items-center gap-2 rounded-2xl px-4 py-3.5 border ${input}`}>
                {loading
                  ? <Loader2 size={15} className={`${sub} animate-spin shrink-0`} />
                  : <Search size={15} className={`${sub} shrink-0`} />
                }
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="Aktie, ETF, Krypto, Rohstoff…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                />
                {query && <button onClick={() => setQuery('')}><X size={14} className={sub} /></button>}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className={`rounded-2xl border overflow-hidden ${card}`}>
                  {results.map((r, i) => (
                    <div key={r.symbol}>
                      {i > 0 && <div className={`h-px mx-4 ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />}
                      <button
                        onClick={() => selectAsset(r)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${dark ? 'hov-dark' : 'hov-light'}`}
                      >
                        <AssetLogo symbol={r.symbol} type={r.type} size={38} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${text}`}>{r.symbol.replace(/-USD$/, '')}</div>
                          <div className={`text-xs truncate ${sub}`}>{r.name}</div>
                        </div>
                        <span className={`text-xs font-medium shrink-0 ${TYPE_COLOR[r.type] ?? sub}`}>
                          {TYPE_LABEL[r.type] ?? r.type}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!query && (
                <p className={`text-sm text-center pt-4 ${sub}`}>
                  Suche nach einer Aktie, ETF, Krypto oder einem Rohstoff
                </p>
              )}
            </>
          ) : (
            <>
              {/* Selected asset */}
              <div className={`flex items-center gap-3 rounded-2xl border p-4 ${card}`}>
                <AssetLogo symbol={asset.symbol} type={asset.type} size={44} />
                <div>
                  <div className={`font-bold ${text}`}>{asset.symbol.replace(/-USD$/, '')}</div>
                  <div className={`text-sm ${sub}`}>{asset.name}</div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${sub}`}>
                    Anzahl <span className="text-tp-red">*</span>
                  </label>
                  <input
                    ref={qtyRef}
                    type="number"
                    inputMode="decimal"
                    placeholder="z.B. 5 oder 0.00312"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-2xl border outline-none transition-colors text-sm ${input}`}
                  />
                  <p className={`text-xs mt-1.5 ${sub}`}>
                    In deiner Broker-App unter „Anteile" oder „Stück"
                  </p>
                </div>
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${sub}`}>
                    Einstiegskurs <span className={`font-normal normal-case ${sub}`}>(optional)</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="z.B. 145.00"
                    value={avgPrice}
                    onChange={e => setAvgPrice(e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-2xl border outline-none transition-colors text-sm ${input}`}
                  />
                  <p className={`text-xs mt-1.5 ${sub}`}>
                    Ø Kaufpreis pro Stück — in Trade Republic als „Einstieg" bezeichnet. Wird für Gewinn/Verlust benötigt.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!quantity || parseFloat(quantity) <= 0 || saving}
                className="w-full py-4 rounded-2xl bg-tp-blue text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving
                  ? <><Loader2 size={16} className="animate-spin" />Wird hinzugefügt…</>
                  : <><Plus size={16} />Zum Portfolio hinzufügen</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Performance Chart ─────────────────────────────────────────────────────────
const PERIODS = ['1D', '1W', '1M', '1Y', '5Y']

function PortfolioPerformanceChart({ positions, dark }) {
  const [period,       setPeriod]       = useState('1M')
  const [chartData,    setChartData]    = useState([])
  const [chartLoading, setChartLoading] = useState(false)

  const text = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'

  const posKey = positions.map(p => `${p.symbol}:${p.quantity}`).join(',')

  useEffect(() => {
    if (!posKey) { setChartData([]); return }
    setChartLoading(true)
    api.portfolioChart(positions, period)
      .then(res => setChartData(res.data || []))
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey, period])

  // Derive all values from chart data — no race condition with batch quotes
  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].value : null
  const firstValue   = chartData.length > 0 ? chartData[0].value : null
  const periodChange = currentValue != null && firstValue != null && firstValue > 0
    ? { value: currentValue - firstValue, pct: (currentValue - firstValue) / firstValue * 100 }
    : null

  // All-time gain vs cost basis (requires avg_price on positions)
  const costBasis   = positions.reduce((s, p) => p.avg_price ? s + p.quantity * p.avg_price : s, 0)
  const allTimeGain = currentValue != null && costBasis > 0 ? currentValue - costBasis : null
  const allTimeGainPct = allTimeGain != null && costBasis > 0 ? allTimeGain / costBasis * 100 : null

  const isUp      = periodChange ? periodChange.value >= 0 : (allTimeGain != null ? allTimeGain >= 0 : true)
  const lineColor = isUp ? '#00b15d' : '#ef4444'
  const gradId    = isUp ? 'pgUp' : 'pgDown'

  return (
    <div className={`rounded-3xl border overflow-hidden ${card}`}>
      {/* Value header */}
      <div className="px-5 pt-5 pb-2">
        <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${sub}`}>Gesamtwert</div>
        {chartLoading && currentValue == null
          ? <div className={`h-10 w-44 rounded-xl animate-pulse mt-1 ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />
          : <div className={`text-4xl font-bold tracking-tight ${text}`}>
              {currentValue != null
                ? `$${currentValue.toLocaleString('de', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : <span className={sub}>—</span>
              }
            </div>
        }
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 min-h-[20px]">
          {allTimeGain != null && (
            <span className={`text-sm font-semibold ${allTimeGain >= 0 ? 'text-tp-green' : 'text-tp-red'}`}>
              {allTimeGain >= 0 ? '+' : ''}
              {allTimeGain.toLocaleString('de', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              &nbsp;({fmtPct(allTimeGainPct)}) gesamt
            </span>
          )}
          {periodChange && (
            <span className={`text-xs font-medium ${isUp ? 'text-tp-green' : 'text-tp-red'}`}>
              {period}: {isUp ? '+' : ''}{periodChange.value.toLocaleString('de', { maximumFractionDigits: 0 })} ({fmtPct(periodChange.pct)})
            </span>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div style={{ height: 190 }} className="mt-2">
        {chartLoading ? (
          <div className="h-full flex items-end px-0 pb-0 gap-0.5">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className={`flex-1 rounded-t-sm animate-pulse ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`}
                style={{ height: `${30 + Math.sin(i * 0.6) * 20 + Math.random() * 25}%`, animationDelay: `${i * 30}ms` }} />
            ))}
          </div>
        ) : chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={lineColor} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
              />
              <Tooltip
                formatter={(v) => [`$${v.toLocaleString('de', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                contentStyle={{ background: dark ? '#1c1c1e' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 }}
                cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '4 2' }}
                labelFormatter={() => ''}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className={`text-xs ${sub}`}>Keine Chartdaten verfügbar</p>
          </div>
        )}
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1 px-4 pt-1 pb-3">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors
              ${period === p
                ? 'bg-tp-blue text-white'
                : dark ? 'text-tp-sub hover:text-tp-text' : 'text-tp-sub-l hover:text-tp-text-l'
              }`}
          >
            {p}
          </button>
        ))}
      </div>

      <p className={`text-[10px] px-5 pb-3 ${sub} opacity-50`}>
        Werte in Originalwährung · Verlauf simuliert (heutige Bestände × Historischer Kurs)
      </p>
    </div>
  )
}

// ── Position Card ─────────────────────────────────────────────────────────────
function PositionCard({ position, quote, onDelete, dark }) {
  const text = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'

  const price        = quote?.price
  const currency     = quote?.currency ?? 'USD'
  const currentValue = price != null ? position.quantity * price : null
  const costBasis    = position.avg_price ? position.quantity * position.avg_price : null
  const gain         = currentValue != null && costBasis != null ? currentValue - costBasis : null
  const gainPct      = gain != null && costBasis ? (gain / costBasis) * 100 : null
  const isUp         = gain != null ? gain >= 0 : null

  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${card}`}>
      <div className="flex items-center gap-2.5">
        <AssetLogo symbol={position.symbol} type={position.asset_type} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm ${text}`}>{position.symbol.replace(/-USD$/, '')}</span>
            {gain != null && (
              <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${isUp ? 'text-tp-green' : 'text-tp-red'}`}>
                {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {fmtPct(gainPct)}
              </span>
            )}
          </div>
          <div className={`text-xs ${sub}`}>
            {position.quantity % 1 === 0 ? position.quantity : position.quantity.toFixed(4)} Stück
            {position.avg_price != null && <span className="opacity-70"> · Ø {fmtCurrency(position.avg_price, currency)}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          {currentValue != null
            ? <div className={`text-sm font-semibold ${text}`}>{fmtCurrency(currentValue, currency)}</div>
            : <div className={`text-sm ${sub}`}>—</div>
          }
          {gain != null && (
            <div className={`text-xs font-medium ${isUp ? 'text-tp-green' : 'text-tp-red'}`}>
              {isUp ? '+' : ''}{fmtCurrency(gain, currency)}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(position.id)}
          className={`p-1.5 rounded-xl transition-colors text-tp-red ${dark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const { dark }              = useTheme()
  const { user }              = useAuth()
  const navigate              = useNavigate()
  const toast                 = useToast()
  const { positions, loading, add, remove } = usePortfolioPositions()

  const [quotes,   setQuotes]   = useState({})
  const [showAdd,  setShowAdd]  = useState(false)

  const openAdd = () => { if (!user) { navigate('/auth'); return } setShowAdd(true) }

  const text  = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub   = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card  = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'

  // Fetch quotes for all positions — stable string key avoids unnecessary refetches
  const posKey = positions.map(p => p.symbol).join(',')
  const fetchQuotes = useCallback(async () => {
    if (!posKey) return
    const symbols = [...new Set(posKey.split(','))]
    try {
      const data = await api.batchQuotes(symbols)
      setQuotes(data)
    } catch {}
  }, [posKey])

  useEffect(() => {
    fetchQuotes()
    if (!posKey) return
    const interval = setInterval(fetchQuotes, 8000)
    return () => clearInterval(interval)
  }, [fetchQuotes, posKey])

  // Recompute totals
  const positionsWithData = positions.map(p => ({
    ...p,
    quote:        quotes[p.symbol],
    currentValue: quotes[p.symbol]?.price != null ? p.quantity * quotes[p.symbol].price : null,
    costBasis:    p.avg_price ? p.quantity * p.avg_price : null,
  }))

  const totalValue   = positionsWithData.reduce((s, p) => s + (p.currentValue ?? 0), 0)

  const allocData = positionsWithData
    .filter(p => p.currentValue != null && p.currentValue > 0)
    .map((p, i) => ({ name: p.symbol.replace(/-USD$/, ''), value: p.currentValue, color: COLORS[i % COLORS.length] }))

  const handleAdd = async (symbol, name, type, quantity, avgPrice) => {
    await add(symbol, name, type, quantity, avgPrice)
    toast(`${symbol.replace(/-USD$/, '')} hinzugefügt`, 'success')
  }

  const handleDelete = async (id) => {
    await remove(id)
    toast('Position entfernt', 'info')
  }

  return (
    <>
      {showAdd && <AddPositionSheet onClose={() => setShowAdd(false)} onAdd={handleAdd} dark={dark} />}

      <div className="space-y-5">
        {/* Header */}
        <div className="pt-2 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl font-bold tracking-tight ${text}`}>Portfolio</h1>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">
                <Wrench size={9} /> BETA
              </span>
            </div>
            <p className={`text-sm mt-0.5 ${sub}`}>Deine Positionen im Überblick</p>
          </div>
        </div>

        {/* Beta warning */}
        <div className={`rounded-2xl px-4 py-3 flex gap-2 text-xs ${dark ? 'bg-yellow-500/10 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>Dieses Feature befindet sich noch in aktiver Entwicklung. Es können Fehler auftreten oder Daten verloren gehen.</span>
        </div>

        {/* Performance chart — shown when there are positions */}
        {positions.length > 0 && (
          <PortfolioPerformanceChart positions={positions} dark={dark} />
        )}

        {/* Allocation donut — only when ≥ 2 positions with prices */}
        {allocData.length >= 2 && (
          <div className={`rounded-3xl border p-4 ${card}`}>
            <div className={`text-xs font-semibold uppercase tracking-wide mb-3 ${sub}`}>Aufteilung</div>
            <div className="flex gap-3 items-center">
              <div style={{ width: 90, height: 90, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocData} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={42} strokeWidth={0}>
                      {allocData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`$${v.toLocaleString('de', { maximumFractionDigits: 0 })}`, '']}
                      contentStyle={{ background: dark ? '#1c1c1e' : '#fff', border: 'none', borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                {allocData.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                    <div className={`text-xs truncate flex-1 ${sub}`}>{e.name}</div>
                    <div className={`text-xs font-semibold shrink-0 ${text}`}>
                      {totalValue > 0 ? (e.value / totalValue * 100).toFixed(1) : '0'}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Positions */}
        {loading ? (
          <div className="space-y-2.5">
            {[1,2,3].map(i => (
              <div key={i} className={`h-20 rounded-2xl animate-pulse ${dark ? 'bg-tp-card' : 'bg-tp-card-l'}`} />
            ))}
          </div>
        ) : positions.length === 0 ? (
          /* Empty state */
          <div className={`rounded-3xl border p-10 flex flex-col items-center text-center gap-4 ${card}`}>
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`}>
              <BarChart2 size={32} className={sub} />
            </div>
            <div>
              <div className={`text-base font-bold ${text}`}>Noch keine Positionen</div>
              <div className={`text-sm mt-1 max-w-xs ${sub}`}>
                Füge deine erste Aktie, ETF, Krypto oder Rohstoff hinzu — mit Anzahl und optionalem Kaufpreis.
              </div>
            </div>
            <button
              onClick={openAdd}
              className="px-6 py-3 rounded-2xl bg-tp-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Erste Position hinzufügen
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>
                Positionen ({positions.length})
              </h2>
              {!user && (
                <button onClick={() => navigate('/auth')} className="text-xs text-tp-blue">
                  Anmelden zum Synchronisieren →
                </button>
              )}
            </div>
            {positionsWithData.map(p => (
              <PositionCard key={p.id} position={p} quote={p.quote} onDelete={handleDelete} dark={dark} />
            ))}
          </div>
        )}

        {/* Add button */}
        {positions.length > 0 && (
          <button
            onClick={openAdd}
            className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors font-medium text-sm
              ${dark ? 'border-tp-border text-tp-sub hover:border-tp-blue hover:text-tp-blue' : 'border-tp-border-l text-tp-sub-l hover:border-tp-blue hover:text-tp-blue'}`}
          >
            <Plus size={16} /> Position hinzufügen
          </button>
        )}

        {/* Divider */}
        <div className={`h-px ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />

        {/* KI-Analyse card */}
        <div
          onClick={() => navigate('/portfolio/analyse')}
          className={`w-full rounded-3xl border p-5 text-left cursor-pointer transition-colors ${dark ? 'bg-tp-card border-tp-border hov-dark' : 'bg-tp-card-l border-tp-border-l hov-light'}`}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-tp-blue/15 flex items-center justify-center shrink-0">
              <Sparkles size={26} className="text-tp-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-base font-bold ${text}`}>KI Portfolio-Analyse</div>
              <div className={`text-sm mt-1 leading-relaxed ${sub}`}>
                Lade Screenshots deines Depots hoch und erhalte eine detaillierte KI-Analyse mit Stärken, Schwächen und konkreten Optimierungsvorschlägen.
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tp-blue text-white text-sm font-semibold">
                  <Sparkles size={14} /> Jetzt analysieren
                </span>
              </div>
            </div>
          </div>
        </div>

        {!user && (
          <button
            onClick={() => navigate('/auth')}
            className={`w-full py-3 rounded-2xl border text-sm flex items-center justify-center gap-2 ${sub} ${dark ? 'border-tp-border' : 'border-tp-border-l'}`}
          >
            Anmelden um Daten zu synchronisieren
          </button>
        )}
      </div>
    </>
  )
}
