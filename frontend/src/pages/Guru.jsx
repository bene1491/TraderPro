import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, ArrowUpRight, Wrench, AlertTriangle, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import { api } from '../lib/api'

function fmtValue(v) {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return `$${(v / 1e3).toFixed(0)}K`
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('de', { month: 'short', year: 'numeric' })
}

function ChangeChip({ change, diff }) {
  if (!change || change === 'unchanged') return null
  if (change === 'new') return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-tp-blue/15 text-tp-blue">NEU</span>
  )
  if (change === 'increased') return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-tp-green">
      <TrendingUp size={10} />+{diff}%
    </span>
  )
  if (change === 'decreased') return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-tp-red">
      <TrendingDown size={10} />{diff}%
    </span>
  )
  return null
}

function HoldingRow({ holding, rank, dark, onAdd }) {
  const text = dark ? 'text-tp-text' : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'  : 'text-tp-sub-l'

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`w-5 text-right text-xs shrink-0 ${sub}`}>{rank}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-bold ${text}`}>
            {holding.ticker || holding.cusip}
          </span>
          <ChangeChip change={holding.change} diff={holding.shares_diff} />
        </div>
        <div className={`text-xs truncate ${sub}`}>{holding.name}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-semibold tabular-nums ${text}`}>{holding.pct?.toFixed(1)}%</div>
        <div className={`text-xs ${sub}`}>{fmtValue(holding.value)}</div>
      </div>
      {holding.ticker && (
        <button
          onClick={() => onAdd(holding.ticker, holding.name)}
          className={`shrink-0 p-1.5 rounded-xl transition-colors ${dark ? 'hover:bg-tp-border text-tp-sub' : 'hover:bg-tp-border-l text-tp-sub-l'}`}
          title="Zur Watchlist"
        >
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  )
}

function GuruCard({ guru, dark }) {
  const [open, setOpen]       = useState(false)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const toast                 = useToast()
  const { user }              = useAuth()
  const navigate              = useNavigate()
  const { add }               = useWatchlist()

  const text = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const div  = dark ? 'border-tp-border' : 'border-tp-border-l'

  const toggle = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (data || loading) return
    setLoading(true); setError(null)
    try {
      const res = await api.guruHoldings(guru.cik)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (ticker, name) => {
    if (!user) { navigate('/auth'); return }
    try {
      await add(ticker, name, 'EQUITY')
      toast(`${ticker} zur Watchlist hinzugefügt`, 'success')
    } catch {
      toast('Fehler beim Hinzufügen', 'error')
    }
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${card}`}>
      {/* Header row */}
      <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
          style={{ background: guru.color }}>
          {guru.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${text}`}>{guru.name}</div>
          <div className={`text-xs ${sub} truncate`}>{guru.fund}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data && <span className={`text-xs ${sub}`}>{fmtDate(data.filing_date)}</span>}
          {open ? <ChevronUp size={16} className={sub} /> : <ChevronDown size={16} className={sub} />}
        </div>
      </button>

      {/* Expanded holdings */}
      {open && (
        <div className={`border-t ${div}`}>
          {loading && (
            <div className={`flex items-center gap-2 px-4 py-5 text-xs ${sub}`}>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              13F-Filing wird geladen…
            </div>
          )}
          {error && (
            <div className="px-4 py-4 text-xs text-tp-red">{error}</div>
          )}
          {data && (
            <div className="px-4 pb-2">
              {/* Summary */}
              <div className={`flex items-center justify-between py-2.5 border-b ${div}`}>
                <span className={`text-xs ${sub}`}>Portfolio-Wert</span>
                <span className={`text-xs font-semibold ${text}`}>{fmtValue(data.total_value)}</span>
              </div>
              {/* Holdings */}
              <div className={`divide-y ${dark ? 'divide-tp-border' : 'divide-tp-border-l'}`}>
                {data.holdings.map((h, i) => (
                  <HoldingRow key={h.cusip} holding={h} rank={i + 1} dark={dark} onAdd={handleAdd} />
                ))}
              </div>
              <div className={`text-[10px] pt-2 pb-1 ${sub} opacity-60`}>
                Quelle: SEC EDGAR 13F-HR · {fmtDate(data.filing_date)} · Keine Anlageberatung
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Guru() {
  const { dark } = useTheme()
  const text = dark ? 'text-tp-text' : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'  : 'text-tp-sub-l'

  const GURUS = [
    { slug: 'buffett',       name: 'Warren Buffett',        fund: 'Berkshire Hathaway',     cik: '0001067983', initials: 'WB', color: '#3b82f6', description: 'Value-Investor, Orakel von Omaha' },
    { slug: 'burry',         name: 'Michael Burry',         fund: 'Scion Asset Management', cik: '0001649339', initials: 'MB', color: '#ef4444', description: 'Bekannt aus The Big Short' },
    { slug: 'ackman',        name: 'Bill Ackman',           fund: 'Pershing Square',        cik: '0001336528', initials: 'BA', color: '#8b5cf6', description: 'Aktivistischer Investor' },
    { slug: 'druckenmiller', name: 'Stanley Druckenmiller', fund: 'Duquesne Family Office', cik: '0001536411', initials: 'SD', color: '#f59e0b', description: 'Macro-Legende' },
    { slug: 'tepper',        name: 'David Tepper',          fund: 'Appaloosa Management',   cik: '0001656456', initials: 'DT', color: '#00b15d', description: 'Hedge-Fund-Manager' },
    { slug: 'soros',         name: 'George Soros',          fund: 'Soros Fund Management',  cik: '0001029160', initials: 'GS', color: '#06b6d4', description: 'Macro-Investor' },
  ]

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <div className="flex items-center gap-2">
          <h1 className={`text-2xl font-bold tracking-tight ${text}`}>Guru Tracker</h1>
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">
            <Wrench size={9} /> BETA
          </span>
        </div>
        <p className={`text-sm mt-0.5 ${sub}`}>Was kaufen Top-Investoren laut SEC 13F-Filings?</p>
      </div>

      <div className={`rounded-2xl px-4 py-3 flex gap-2 text-xs ${dark ? 'bg-yellow-500/10 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <span>Dieses Feature befindet sich noch in Entwicklung. Fehler beim Laden sind möglich.</span>
      </div>

      <div className={`rounded-2xl px-4 py-3 text-xs flex gap-2 ${dark ? 'bg-tp-border/60 text-tp-sub' : 'bg-tp-border-l text-tp-sub-l'}`}>
        <Sparkles size={13} className="shrink-0 mt-0.5" />
        <span>13F-Filings werden quartalsweise bei der SEC eingereicht und spiegeln den Stand von vor ca. 45 Tagen wider. <strong>Keine Anlageberatung.</strong></span>
      </div>

      <div className="space-y-2.5">
        {GURUS.map(g => <GuruCard key={g.cik} guru={g} dark={dark} />)}
      </div>
    </div>
  )
}
