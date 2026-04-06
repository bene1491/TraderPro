import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Search, X, ChevronRight, Sparkles,
  TrendingUp, TrendingDown, Wrench, AlertTriangle, Loader2,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
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

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  useEffect(() => {
    if (!debounced.trim()) { setResults([]); return }
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
                    placeholder="z.B. 10 oder 0.5"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-2xl border outline-none transition-colors text-sm ${input}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${sub}`}>
                    Ø Kaufpreis <span className={`font-normal normal-case ${sub}`}>(optional)</span>
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
                    Zum Berechnen deiner Gewinne / Verluste
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
    <div className={`rounded-2xl border p-4 ${card}`}>
      <div className="flex items-center gap-3">
        <AssetLogo symbol={position.symbol} type={position.asset_type} size={42} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm ${text}`}>{position.symbol.replace(/-USD$/, '')}</span>
            {gain != null && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-tp-green' : 'text-tp-red'}`}>
                {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {fmtPct(gainPct)}
              </span>
            )}
          </div>
          <div className={`text-xs truncate ${sub}`}>{position.name}</div>
          <div className={`text-xs mt-0.5 ${sub}`}>
            {position.quantity % 1 === 0 ? position.quantity : position.quantity.toFixed(4)} Stück
            {position.avg_price != null && ` · Ø ${fmtCurrency(position.avg_price, currency)}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          {currentValue != null
            ? <div className={`text-sm font-bold ${text}`}>{fmtCurrency(currentValue, currency)}</div>
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
          className={`p-2 rounded-xl ml-1 transition-colors text-tp-red ${dark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
        >
          <Trash2 size={15} />
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

  const [quotes,       setQuotes]       = useState({})
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)

  const text  = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub   = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card  = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'

  // Fetch quotes for all positions
  const fetchQuotes = useCallback(async () => {
    if (!positions.length) return
    const symbols = [...new Set(positions.map(p => p.symbol))]
    setQuotesLoading(true)
    try {
      const data = await api.batchQuotes(symbols)
      setQuotes(data)
    } catch {}
    finally { setQuotesLoading(false) }
  }, [positions])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  // Recompute totals
  const positionsWithData = positions.map(p => ({
    ...p,
    quote:        quotes[p.symbol],
    currentValue: quotes[p.symbol]?.price != null ? p.quantity * quotes[p.symbol].price : null,
    costBasis:    p.avg_price ? p.quantity * p.avg_price : null,
  }))

  const totalValue    = positionsWithData.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const totalCost     = positionsWithData.reduce((s, p) => s + (p.costBasis ?? 0), 0)
  const totalGain     = totalCost > 0 ? totalValue - totalCost : null
  const totalGainPct  = totalGain != null && totalCost > 0 ? (totalGain / totalCost) * 100 : null
  const isUp          = totalGain != null ? totalGain >= 0 : null

  const chartData = positionsWithData
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

        {/* Total value card */}
        {positions.length > 0 && (
          <div className={`rounded-3xl border p-5 ${card}`}>
            <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${sub}`}>Gesamtwert</div>
            {quotesLoading && totalValue === 0
              ? <div className={`h-8 w-36 rounded-xl animate-pulse ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />
              : <div className={`text-3xl font-bold tracking-tight ${text}`}>
                  {totalValue > 0 ? `$${totalValue.toLocaleString('de', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </div>
            }
            {totalGain != null && (
              <div className={`flex items-center gap-1.5 mt-1 text-sm font-semibold ${isUp ? 'text-tp-green' : 'text-tp-red'}`}>
                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isUp ? '+' : ''}{totalGain.toLocaleString('de', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="opacity-80">({fmtPct(totalGainPct)})</span>
              </div>
            )}
            <p className={`text-[10px] mt-2 ${sub} opacity-60`}>
              Werte in Originalwährung · kein Währungsumrechnung
            </p>
          </div>
        )}

        {/* Allocation chart */}
        {chartData.length >= 2 && (
          <div className={`rounded-3xl border p-5 ${card}`}>
            <div className={`text-sm font-semibold mb-4 ${text}`}>Aufteilung</div>
            <div className="flex gap-4 items-center">
              <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={50} strokeWidth={0}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`$${v.toLocaleString('de', { maximumFractionDigits: 0 })}`, '']}
                      contentStyle={{ background: dark ? '#1c1c1e' : '#fff', border: 'none', borderRadius: 10, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {chartData.map((entry, i) => {
                  const pct = totalValue > 0 ? (entry.value / totalValue * 100).toFixed(1) : '0'
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                      <div className={`text-xs truncate flex-1 ${sub}`}>{entry.name}</div>
                      <div className={`text-xs font-semibold shrink-0 ${text}`}>{pct}%</div>
                    </div>
                  )
                })}
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
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`}>
              📊
            </div>
            <div>
              <div className={`text-base font-bold ${text}`}>Noch keine Positionen</div>
              <div className={`text-sm mt-1 max-w-xs ${sub}`}>
                Füge deine erste Aktie, ETF, Krypto oder Rohstoff hinzu — mit Anzahl und optionalem Kaufpreis.
              </div>
            </div>
            <button
              onClick={() => setShowAdd(true)}
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
            onClick={() => setShowAdd(true)}
            className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors font-medium text-sm
              ${dark ? 'border-tp-border text-tp-sub hover:border-tp-blue hover:text-tp-blue' : 'border-tp-border-l text-tp-sub-l hover:border-tp-blue hover:text-tp-blue'}`}
          >
            <Plus size={16} /> Position hinzufügen
          </button>
        )}

        {/* Divider */}
        <div className={`h-px ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />

        {/* KI-Analyse link */}
        <button
          onClick={() => navigate('/portfolio/analyse')}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${dark ? 'bg-tp-card border-tp-border hov-dark' : 'bg-tp-card-l border-tp-border-l hov-light'}`}
        >
          <div className="w-10 h-10 rounded-xl bg-tp-blue/15 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-tp-blue" />
          </div>
          <div className="flex-1">
            <div className={`text-sm font-semibold ${text}`}>KI Portfolio-Analyse</div>
            <div className={`text-xs ${sub}`}>Screenshot hochladen & von KI analysieren lassen</div>
          </div>
          <ChevronRight size={16} className={sub} />
        </button>

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
