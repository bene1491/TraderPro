import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, ExternalLink, ChevronDown, ChevronUp, Newspaper } from 'lucide-react'
import AssetLogo from '../components/AssetLogo'
import PriceChart from '../components/PriceChart'
import StatsGrid from '../components/StatsGrid'
import { api } from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTickerWS } from '../hooks/useTickerWS'

function formatPrice(val, currency = 'EUR') {
  if (val == null) return '—'
  return new Intl.NumberFormat('de', {
    style: 'currency',
    currency,
    minimumFractionDigits: val < 10 ? 4 : 2,
    maximumFractionDigits: val < 10 ? 4 : 2,
  }).format(val)
}

const MARKET_STATE = {
  REGULAR: { label: 'Live',          color: 'bg-tp-green-bg text-tp-green' },
  PRE:     { label: 'Vorbörslich',   color: 'bg-yellow-500/15 text-yellow-400' },
  POST:    { label: 'Nachbörslich',  color: 'bg-yellow-500/15 text-yellow-400' },
  CLOSED:  { label: 'Geschlossen',   color: 'bg-tp-border text-tp-sub' },
}

const CRYPTO_TYPES = ['CRYPTOCURRENCY']

function isLive(quote, connected) {
  if (!quote) return false
  if (CRYPTO_TYPES.includes(quote.type)) return connected
  return quote.marketState === 'REGULAR' || quote.marketState === 'PRE' || quote.marketState === 'POST'
}

function LastTradeInfo({ isoTime, marketState, assetType, dark }) {
  const sub = dark ? 'text-tp-sub' : 'text-tp-sub-l'
  if (CRYPTO_TYPES.includes(assetType)) return null
  if (!isoTime || marketState === 'REGULAR') return null
  const d = new Date(isoTime)
  const isToday = d.toDateString() === new Date().toDateString()
  const label = isToday
    ? `Stand: heute, ${d.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })} Uhr`
    : `Letzter Handelstag: ${d.toLocaleDateString('de', { weekday: 'long', day: 'numeric', month: 'long' })}`
  return <div className={`text-xs ${sub}`}>{label}</div>
}

// ── Horizontal news cards ─────────────────────────────────────────────────────
function NewsSection({ symbol, dark }) {
  const [news,    setNews]    = useState([])
  const [loading, setLoading] = useState(true)

  const text  = dark ? 'text-tp-text'   : 'text-tp-text-l'
  const sub   = dark ? 'text-tp-sub'    : 'text-tp-sub-l'
  const card  = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const imgBg = dark ? 'bg-tp-border'   : 'bg-tp-border-l'

  useEffect(() => {
    setLoading(true)
    api.news(symbol)
      .then(d => setNews(Array.isArray(d) ? d : []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [symbol])

  if (!loading && news.length === 0) return null

  const fmtDate = (iso) => {
    if (!iso) return ''
    try {
      const d   = new Date(iso)
      const now = new Date()
      const diffH = (now - d) / 3600000
      if (diffH < 1)  return `vor ${Math.round(diffH * 60)} Min.`
      if (diffH < 24) return `vor ${Math.round(diffH)} Std.`
      return d.toLocaleDateString('de', { day: 'numeric', month: 'short' })
    } catch { return '' }
  }

  const skeletons = [...Array(4)]

  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>
        <span className="flex items-center gap-1.5"><Newspaper size={12} /> News</span>
      </h3>

      {/* Horizontal scroll — hide scrollbar */}
      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {loading
          ? skeletons.map((_, i) => (
              <div key={i}
                className={`shrink-0 w-52 rounded-2xl border overflow-hidden animate-pulse ${card}`}>
                <div className={`h-28 ${imgBg}`} />
                <div className="p-3 space-y-2">
                  <div className={`h-3 rounded ${imgBg}`} />
                  <div className={`h-3 w-3/4 rounded ${imgBg}`} />
                </div>
              </div>
            ))
          : news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`shrink-0 w-52 rounded-2xl border overflow-hidden flex flex-col
                  transition-opacity active:opacity-70 ${card}`}
              >
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className={`w-full h-28 object-cover ${imgBg}`}
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className={`h-28 flex items-center justify-center ${imgBg}`}>
                    <Newspaper size={24} className={sub} />
                  </div>
                )}
                <div className="p-3 flex flex-col flex-1">
                  <p className={`text-xs font-semibold leading-snug line-clamp-3 flex-1 ${text}`}>
                    {item.title}
                  </p>
                  <div className={`flex items-center justify-between mt-2 text-[10px] ${sub}`}>
                    <span className="truncate max-w-[80%]">{item.publisher}</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      {fmtDate(item.pubDate)} <ExternalLink size={9} />
                    </span>
                  </div>
                </div>
              </a>
            ))
        }
      </div>
    </div>
  )
}

// ── Analyst consensus ─────────────────────────────────────────────────────────
// recommendationMean: 1 = Strong Buy → 5 = Strong Sell
const REC_LABELS = {
  strong_buy:   { label: 'Starker Kauf',  color: '#00b15d' },
  buy:          { label: 'Kaufen',        color: '#00b15d' },
  hold:         { label: 'Halten',        color: '#f59e0b' },
  underperform: { label: 'Untergewichten',color: '#ff3b30' },
  sell:         { label: 'Verkaufen',     color: '#ff3b30' },
}

function AnalystSection({ quote, dark }) {
  const { recommendationKey, recommendationMean, numberOfAnalystOpinions,
          targetMeanPrice, targetHighPrice, targetLowPrice, price, currency } = quote

  if (!recommendationKey || !numberOfAnalystOpinions) return null

  const text    = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub     = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card    = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const trackBg = dark ? 'bg-tp-border'  : 'bg-tp-border-l'
  const divider = dark ? 'border-tp-border' : 'border-tp-border-l'

  const rec   = REC_LABELS[recommendationKey] ?? { label: recommendationKey, color: '#8e8e93' }
  // mean 1-5: 1=StrongBuy, 3=Hold, 5=StrongSell. Map to 0-100% (left=sell, right=buy, center=hold)
  const pct   = Math.round(((5 - (recommendationMean ?? 3)) / 4) * 100)  // higher = more bullish

  const hasTargets = targetMeanPrice && targetHighPrice && targetLowPrice && price
  let targetPct = null
  if (hasTargets) {
    const range = targetHighPrice - targetLowPrice
    targetPct = range > 0 ? Math.round(((targetMeanPrice - targetLowPrice) / range) * 100) : 50
  }

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
      <div className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>Analysten-Konsens</div>

      {/* Recommendation */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: rec.color }}>{rec.label}</span>
          <span className={`text-xs ${sub}`}>{numberOfAnalystOpinions} Analysten</span>
        </div>
        {/* Gradient bar: red left → yellow center → green right */}
        <div className={`relative h-2 rounded-full overflow-hidden`}
          style={{ background: 'linear-gradient(to right, #ff3b30 0%, #f59e0b 50%, #00b15d 100%)' }}>
          {/* Pointer */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md border-2"
            style={{ left: `${pct}%`, borderColor: rec.color }}
          />
        </div>
        <div className={`flex justify-between text-[10px] ${sub}`}>
          <span>Verkaufen</span><span>Halten</span><span>Kaufen</span>
        </div>
      </div>

      {/* Price target */}
      {hasTargets && (
        <div className={`border-t pt-4 space-y-2 ${divider}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${sub}`}>Kursziel Ø</span>
            <span className={`text-sm font-bold ${text}`}>{formatPrice(targetMeanPrice, currency)}</span>
          </div>
          <div className={`relative h-1.5 rounded-full ${trackBg}`}>
            <div
              className="absolute h-full rounded-full bg-tp-blue/40"
              style={{ left: 0, right: 0 }}
            />
            {/* Current price marker */}
            {(() => {
              const range = targetHighPrice - targetLowPrice
              const curPct = range > 0 ? Math.max(0, Math.min(100, ((price - targetLowPrice) / range) * 100)) : 50
              return (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-tp-sub border-2 border-white"
                  style={{ left: `${curPct}%` }}
                  title={`Aktuell: ${formatPrice(price, currency)}`}
                />
              )
            })()}
            {/* Mean target marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-tp-blue border-2 border-white"
              style={{ left: `${targetPct}%` }}
            />
          </div>
          <div className={`flex justify-between text-[10px] ${sub}`}>
            <span>{formatPrice(targetLowPrice, currency)}</span>
            <span>{formatPrice(targetHighPrice, currency)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Asset() {
  const { symbol }  = useParams()
  const navigate    = useNavigate()
  const { dark }    = useTheme()
  const { user }    = useAuth()
  const toast       = useToast()
  const watchlist   = useWatchlist()

  const [quote,      setQuote]      = useState(null)
  const [livePrice,  setLivePrice]  = useState(null)
  const [histData,   setHistData]   = useState([])
  const [period,     setPeriod]     = useState('1Y')
  const [loadQuote,  setLoadQuote]  = useState(true)
  const [loadChart,  setLoadChart]  = useState(true)
  const [error,      setError]      = useState(null)
  const [showDesc,   setShowDesc]   = useState(true)
  const [tickTime,   setTickTime]   = useState(null)
  const [flash,      setFlash]      = useState(null)

  const { tick, connected } = useTickerWS(symbol)

  useEffect(() => {
    if (!tick?.price) return
    setLivePrice(prev => {
      const dir = prev == null ? null : tick.price > prev ? 'up' : tick.price < prev ? 'down' : null
      if (dir) { setFlash(dir); setTimeout(() => setFlash(null), 600) }
      return tick.price
    })
    setTickTime(new Date())
  }, [tick])

  useEffect(() => {
    if (!symbol) return
    setLoadQuote(true); setError(null); setLivePrice(null)
    api.quote(symbol)
      .then(q => { setQuote(q); setLivePrice(q.price) })
      .catch(e => setError(e.message))
      .finally(() => setLoadQuote(false))
  }, [symbol])

  useEffect(() => {
    if (!symbol) return
    setLoadChart(true)
    api.history(symbol, period)
      .then(d => setHistData(d.data ?? []))
      .catch(() => setHistData([]))
      .finally(() => setLoadChart(false))
  }, [symbol, period])

  const displayQuote  = quote ? { ...quote, price: livePrice ?? quote.price } : null
  const liveChange    = (displayQuote && quote?.previousClose)
    ? displayQuote.price - quote.previousClose : quote?.change ?? 0
  const liveChangePct = (quote?.previousClose)
    ? (liveChange / quote.previousClose * 100) : quote?.changePercent ?? 0

  const up          = liveChangePct >= 0
  const changeColor = up ? 'text-tp-green' : 'text-tp-red'
  const changeBg    = up ? 'bg-tp-green-bg' : 'bg-tp-red-bg'
  const text        = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub         = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card        = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'

  const watched  = watchlist.isWatched(symbol ?? '')
  const live     = isLive(quote, connected)
  const isCrypto = CRYPTO_TYPES.includes(quote?.type)
  const mstate   = isCrypto
    ? (connected
        ? { label: 'Live', color: 'bg-tp-green-bg text-tp-green' }
        : { label: 'Verbinde…', color: 'bg-tp-border text-tp-sub' })
    : (MARKET_STATE[quote?.marketState] ?? MARKET_STATE.CLOSED)

  const flashClass = flash === 'up' ? 'bg-tp-green/10' : flash === 'down' ? 'bg-tp-red/10' : ''

  const handleWatchlistToggle = () => {
    if (!user) { toast('Bitte melde dich an, um die Watchlist zu nutzen.', 'error'); return }
    const willWatch = !watchlist.isWatched(quote.symbol)
    watchlist.toggle(quote.symbol, quote.name, quote.type)
    toast(
      willWatch ? `${quote.name} zur Watchlist hinzugefügt.` : `${quote.name} von der Watchlist entfernt.`,
      willWatch ? 'success' : 'error'
    )
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className={`flex items-center gap-1.5 text-sm font-medium ${sub} transition-colors`}>
        <ArrowLeft size={16} /> Zurück
      </button>

      {error && (
        <div className="rounded-2xl bg-tp-red-bg border border-tp-red/30 p-4 text-sm text-tp-red">
          Fehler: {error}
        </div>
      )}

      {/* Header card */}
      <div className={`rounded-2xl border p-5 transition-colors duration-300 ${card} ${flashClass}`}>
        {loadQuote ? (
          <div className="space-y-3 animate-pulse">
            <div className={`h-4 w-24 rounded ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />
            <div className={`h-8 w-36 rounded ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />
            <div className={`h-4 w-20 rounded ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />
          </div>
        ) : quote && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <AssetLogo symbol={quote.symbol} type={quote.type} size={48} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium uppercase tracking-wider ${sub}`}>
                      {quote.type} · {quote.exchange}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${mstate.color}`}>
                      {live && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                      {mstate.label}
                    </span>
                  </div>
                  <h1 className={`text-xl font-bold mt-1 ${text}`}>{quote.name}</h1>
                  <div className={`text-xs ${sub} mt-0.5`}>{quote.symbol}</div>
                </div>
              </div>
              <button
                onClick={handleWatchlistToggle}
                className={`p-2 rounded-xl border transition-colors shrink-0 ${
                  watched
                    ? 'bg-tp-green-bg border-tp-green/30 text-tp-green'
                    : dark ? 'border-tp-border text-tp-sub hover:border-tp-green hover:text-tp-green'
                           : 'border-tp-border-l text-tp-sub-l hover:border-tp-green hover:text-tp-green'
                }`}
              >
                <Star size={18} fill={watched ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div>
              <div className="flex items-end gap-3">
                <span className={`text-4xl font-bold tracking-tight tabular-nums transition-colors duration-150 ${text}`}>
                  {formatPrice(livePrice ?? quote.price, quote.currency)}
                </span>
                <span className={`text-sm font-semibold px-2 py-1 rounded-lg mb-1 ${changeBg} ${changeColor}`}>
                  {up ? '+' : ''}{liveChangePct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className={`text-xs ${sub}`}>
                  {up ? '+' : ''}{formatPrice(liveChange, quote.currency)} zum letzten Handelsschluss
                </div>
                {live && tickTime && (
                  <span className={`text-xs tabular-nums ${sub}`}>
                    {tickTime.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <LastTradeInfo isoTime={quote.lastTradeTime} marketState={quote.marketState}
                  assetType={quote.type} dark={dark} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <PriceChart
          data={histData} period={period} onPeriodChange={setPeriod}
          currency={quote?.currency} loading={loadChart}
          lastTradeTime={quote?.lastTradeTime} marketState={quote?.marketState}
        />
      </div>

      {/* Stats */}
      {displayQuote && !loadQuote && <StatsGrid quote={displayQuote} />}

      {/* News — horizontal scroll */}
      {quote && <NewsSection symbol={symbol} dark={dark} />}

      {/* Analyst consensus */}
      {displayQuote && !loadQuote && <AnalystSection quote={displayQuote} dark={dark} />}

      {/* Description */}
      {quote?.description && (
        <div className={`rounded-2xl border p-5 ${card}`}>
          <button
            className={`flex items-center justify-between w-full text-sm font-semibold ${text}`}
            onClick={() => setShowDesc(v => !v)}
          >
            {isCrypto ? 'Über die Kryptowährung' : 'Über das Unternehmen'}
            {showDesc ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showDesc && (
            <p className={`mt-3 text-sm leading-relaxed ${sub} animate-fade-in`}>
              {quote.description}
            </p>
          )}
          {quote.website && (
            <a href={quote.website} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs text-tp-blue hover:underline">
              Website <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
