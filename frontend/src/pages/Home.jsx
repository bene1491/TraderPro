import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, BarChart2, Globe, Bitcoin, Layers, TrendingUp, ArrowLeftRight, ChevronRight, X } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import AssetLogo from '../components/AssetLogo'
import { useTheme } from '../context/ThemeContext'

const TRENDING = [
  { symbol: 'AAPL',    name: 'Apple',       type: 'EQUITY' },
  { symbol: 'MSFT',    name: 'Microsoft',   type: 'EQUITY' },
  { symbol: 'BTC-USD', name: 'Bitcoin',     type: 'CRYPTOCURRENCY' },
  { symbol: 'ETH-USD', name: 'Ethereum',    type: 'CRYPTOCURRENCY' },
  { symbol: 'IWDA.L',  name: 'MSCI World',  type: 'ETF' },
  { symbol: 'NVDA',    name: 'NVIDIA',      type: 'EQUITY' },
  { symbol: 'TSLA',    name: 'Tesla',       type: 'EQUITY' },
  { symbol: 'GC=F',    name: 'Gold',        type: 'FUTURE' },
]

const CATEGORIES = [
  {
    id: 'aktien', icon: BarChart2, label: 'Aktien', example: 'AAPL, NVDA, SAP …',
    assets: [
      { symbol: 'AAPL',   name: 'Apple',               type: 'EQUITY' },
      { symbol: 'MSFT',   name: 'Microsoft',            type: 'EQUITY' },
      { symbol: 'NVDA',   name: 'NVIDIA',               type: 'EQUITY' },
      { symbol: 'TSLA',   name: 'Tesla',                type: 'EQUITY' },
      { symbol: 'AMZN',   name: 'Amazon',               type: 'EQUITY' },
      { symbol: 'GOOGL',  name: 'Alphabet (Google)',    type: 'EQUITY' },
      { symbol: 'META',   name: 'Meta Platforms',       type: 'EQUITY' },
      { symbol: 'AVGO',   name: 'Broadcom',             type: 'EQUITY' },
      { symbol: 'JPM',    name: 'JPMorgan Chase',       type: 'EQUITY' },
      { symbol: 'V',      name: 'Visa',                 type: 'EQUITY' },
      { symbol: 'MA',     name: 'Mastercard',           type: 'EQUITY' },
      { symbol: 'UNH',    name: 'UnitedHealth Group',   type: 'EQUITY' },
      { symbol: 'LLY',    name: 'Eli Lilly',            type: 'EQUITY' },
      { symbol: 'JNJ',    name: 'Johnson & Johnson',    type: 'EQUITY' },
      { symbol: 'WMT',    name: 'Walmart',              type: 'EQUITY' },
      { symbol: 'NFLX',   name: 'Netflix',              type: 'EQUITY' },
      { symbol: 'AMD',    name: 'AMD',                  type: 'EQUITY' },
      { symbol: 'INTC',   name: 'Intel',                type: 'EQUITY' },
      { symbol: 'PYPL',   name: 'PayPal',               type: 'EQUITY' },
      { symbol: 'SAP',    name: 'SAP SE',               type: 'EQUITY' },
      { symbol: 'SIE.DE', name: 'Siemens',              type: 'EQUITY' },
      { symbol: 'ALV.DE', name: 'Allianz',              type: 'EQUITY' },
      { symbol: 'MBG.DE', name: 'Mercedes-Benz',        type: 'EQUITY' },
      { symbol: 'BMW.DE', name: 'BMW',                  type: 'EQUITY' },
      { symbol: 'VOW3.DE',name: 'Volkswagen',           type: 'EQUITY' },
      { symbol: 'DTE.DE', name: 'Deutsche Telekom',     type: 'EQUITY' },
      { symbol: 'BAYN.DE',name: 'Bayer',                type: 'EQUITY' },
      { symbol: 'ADS.DE', name: 'adidas',               type: 'EQUITY' },
      { symbol: 'ASML',   name: 'ASML Holding',         type: 'EQUITY' },
      { symbol: 'NVO',    name: 'Novo Nordisk',         type: 'EQUITY' },
    ],
  },
  {
    id: 'etfs', icon: Globe, label: 'ETFs', example: 'IWDA, VWCE, MSCI …',
    assets: [
      { symbol: 'IWDA.L',  name: 'iShares MSCI World',            type: 'ETF' },
      { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World',       type: 'ETF' },
      { symbol: 'EUNL.DE', name: 'iShares Core MSCI World',       type: 'ETF' },
      { symbol: 'VUSA.L',  name: 'Vanguard S&P 500',              type: 'ETF' },
      { symbol: 'CSPX.L',  name: 'iShares Core S&P 500',         type: 'ETF' },
      { symbol: 'XDWD.DE', name: 'Xtrackers MSCI World',         type: 'ETF' },
      { symbol: 'SPPW.DE', name: 'SPDR MSCI World',               type: 'ETF' },
      { symbol: 'EXXT.DE', name: 'iShares NASDAQ-100',            type: 'ETF' },
      { symbol: 'QQQ',     name: 'Invesco NASDAQ-100 (US)',       type: 'ETF' },
      { symbol: 'SPY',     name: 'SPDR S&P 500 (US)',             type: 'ETF' },
      { symbol: 'VTI',     name: 'Vanguard Total Stock Market',   type: 'ETF' },
      { symbol: 'VXUS',    name: 'Vanguard Total Intl Stock',     type: 'ETF' },
      { symbol: 'EEM',     name: 'iShares MSCI Emerging Markets', type: 'ETF' },
      { symbol: 'AEEM.DE', name: 'iShares MSCI EM (DE)',          type: 'ETF' },
      { symbol: 'IUSQ.DE', name: 'iShares MSCI ACWI',            type: 'ETF' },
      { symbol: 'EUNN.DE', name: 'iShares MSCI Europe',           type: 'ETF' },
      { symbol: 'EWG',     name: 'iShares MSCI Germany',          type: 'ETF' },
      { symbol: 'GLD',     name: 'SPDR Gold Shares',              type: 'ETF' },
      { symbol: 'SLV',     name: 'iShares Silver Trust',          type: 'ETF' },
      { symbol: 'IQQH.DE', name: 'iShares Global Clean Energy',  type: 'ETF' },
    ],
  },
  {
    id: 'krypto', icon: Bitcoin, label: 'Krypto', example: 'BTC, ETH, SOL …',
    assets: [
      { symbol: 'BTC-USD',   name: 'Bitcoin',        type: 'CRYPTOCURRENCY' },
      { symbol: 'ETH-USD',   name: 'Ethereum',       type: 'CRYPTOCURRENCY' },
      { symbol: 'SOL-USD',   name: 'Solana',         type: 'CRYPTOCURRENCY' },
      { symbol: 'BNB-USD',   name: 'BNB',            type: 'CRYPTOCURRENCY' },
      { symbol: 'XRP-USD',   name: 'XRP',            type: 'CRYPTOCURRENCY' },
      { symbol: 'DOGE-USD',  name: 'Dogecoin',       type: 'CRYPTOCURRENCY' },
      { symbol: 'ADA-USD',   name: 'Cardano',        type: 'CRYPTOCURRENCY' },
      { symbol: 'AVAX-USD',  name: 'Avalanche',      type: 'CRYPTOCURRENCY' },
      { symbol: 'LINK-USD',  name: 'Chainlink',      type: 'CRYPTOCURRENCY' },
      { symbol: 'DOT-USD',   name: 'Polkadot',       type: 'CRYPTOCURRENCY' },
      { symbol: 'MATIC-USD', name: 'Polygon',        type: 'CRYPTOCURRENCY' },
      { symbol: 'LTC-USD',   name: 'Litecoin',       type: 'CRYPTOCURRENCY' },
      { symbol: 'UNI7083-USD',name: 'Uniswap',      type: 'CRYPTOCURRENCY' },
      { symbol: 'ATOM1-USD', name: 'Cosmos',         type: 'CRYPTOCURRENCY' },
      { symbol: 'XLM-USD',   name: 'Stellar',        type: 'CRYPTOCURRENCY' },
      { symbol: 'BCH-USD',   name: 'Bitcoin Cash',   type: 'CRYPTOCURRENCY' },
      { symbol: 'FIL-USD',   name: 'Filecoin',       type: 'CRYPTOCURRENCY' },
      { symbol: 'ICP1-USD',  name: 'Internet Computer', type: 'CRYPTOCURRENCY' },
      { symbol: 'ETC-USD',   name: 'Ethereum Classic', type: 'CRYPTOCURRENCY' },
      { symbol: 'ALGO-USD',  name: 'Algorand',       type: 'CRYPTOCURRENCY' },
      { symbol: 'NEAR-USD',  name: 'NEAR Protocol',  type: 'CRYPTOCURRENCY' },
      { symbol: 'APT21794-USD', name: 'Aptos',       type: 'CRYPTOCURRENCY' },
      { symbol: 'ARB11841-USD', name: 'Arbitrum',    type: 'CRYPTOCURRENCY' },
      { symbol: 'OP-USD',    name: 'Optimism',       type: 'CRYPTOCURRENCY' },
      { symbol: 'SUI20947-USD', name: 'Sui',         type: 'CRYPTOCURRENCY' },
    ],
  },
  {
    id: 'rohstoffe', icon: Layers, label: 'Rohstoffe', example: 'Gold, Silber, Öl …',
    assets: [
      { symbol: 'GC=F',  name: 'Gold',            type: 'FUTURE' },
      { symbol: 'SI=F',  name: 'Silber',          type: 'FUTURE' },
      { symbol: 'PL=F',  name: 'Platin',          type: 'FUTURE' },
      { symbol: 'PA=F',  name: 'Palladium',       type: 'FUTURE' },
      { symbol: 'CL=F',  name: 'Rohöl (WTI)',     type: 'FUTURE' },
      { symbol: 'BZ=F',  name: 'Rohöl (Brent)',   type: 'FUTURE' },
      { symbol: 'NG=F',  name: 'Erdgas',          type: 'FUTURE' },
      { symbol: 'HG=F',  name: 'Kupfer',          type: 'FUTURE' },
      { symbol: 'ZW=F',  name: 'Weizen',          type: 'FUTURE' },
      { symbol: 'ZC=F',  name: 'Mais',            type: 'FUTURE' },
      { symbol: 'ZS=F',  name: 'Sojabohnen',      type: 'FUTURE' },
      { symbol: 'CC=F',  name: 'Kakao',           type: 'FUTURE' },
      { symbol: 'KC=F',  name: 'Kaffee',          type: 'FUTURE' },
    ],
  },
  {
    id: 'indizes', icon: TrendingUp, label: 'Indizes', example: '^DAX, ^GSPC …',
    assets: [
      { symbol: '^GDAXI',    name: 'DAX 40',           type: 'INDEX' },
      { symbol: '^GSPC',     name: 'S&P 500',          type: 'INDEX' },
      { symbol: '^IXIC',     name: 'NASDAQ Composite', type: 'INDEX' },
      { symbol: '^NDX',      name: 'NASDAQ-100',       type: 'INDEX' },
      { symbol: '^DJI',      name: 'Dow Jones',        type: 'INDEX' },
      { symbol: '^STOXX50E', name: 'Euro Stoxx 50',    type: 'INDEX' },
      { symbol: '^FTSE',     name: 'FTSE 100',         type: 'INDEX' },
      { symbol: '^N225',     name: 'Nikkei 225',       type: 'INDEX' },
      { symbol: '^HSI',      name: 'Hang Seng',        type: 'INDEX' },
      { symbol: '^MDAXI',    name: 'MDAX',             type: 'INDEX' },
      { symbol: '^RUT',      name: 'Russell 2000',     type: 'INDEX' },
      { symbol: '^VIX',      name: 'VIX Volatilität',  type: 'INDEX' },
    ],
  },
  {
    id: 'waehrungen', icon: ArrowLeftRight, label: 'Währungen', example: 'EUR/USD, GBP/USD …',
    assets: [
      { symbol: 'EURUSD=X', name: 'Euro / US-Dollar',            type: 'CURRENCY' },
      { symbol: 'GBPUSD=X', name: 'Britisches Pfund / USD',      type: 'CURRENCY' },
      { symbol: 'USDJPY=X', name: 'US-Dollar / Yen',             type: 'CURRENCY' },
      { symbol: 'USDCHF=X', name: 'US-Dollar / Schweizer Franken', type: 'CURRENCY' },
      { symbol: 'EURGBP=X', name: 'Euro / Britisches Pfund',     type: 'CURRENCY' },
      { symbol: 'EURCHF=X', name: 'Euro / Schweizer Franken',    type: 'CURRENCY' },
      { symbol: 'EURJPY=X', name: 'Euro / Japanischer Yen',      type: 'CURRENCY' },
      { symbol: 'AUDUSD=X', name: 'Australischer Dollar / USD',  type: 'CURRENCY' },
      { symbol: 'USDCAD=X', name: 'US-Dollar / Kanadischer Dollar', type: 'CURRENCY' },
    ],
  },
]

function CategorySheet({ category, onClose }) {
  const { dark }   = useTheme()
  const navigate   = useNavigate()
  const listRef    = useRef(null)
  const sheetRef   = useRef(null)
  const handleRef  = useRef(null)       // pill + header area
  const onCloseRef = useRef(onClose)
  const [backdropVisible, setBackdropVisible] = useState(false)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // ── Enter animation (managed entirely via ref to avoid CSS transition conflict) ──
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.style.transform  = 'translateY(100%)'
    sheet.style.transition = 'none'
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        sheet.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
        sheet.style.transform  = 'translateY(0)'
        setBackdropVisible(true)
      })
    )
  }, [])

  // ── iOS scroll lock ───────────────────────────────────────────────────────
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

  // ── Close helpers ─────────────────────────────────────────────────────────
  const animateClose = () => {
    setBackdropVisible(false)
    const sheet = sheetRef.current
    if (sheet) {
      sheet.style.transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1)'
      sheet.style.transform  = 'translateY(100%)'
    }
    setTimeout(() => onCloseRef.current(), 290)
  }

  const snapBack = () => {
    const sheet = sheetRef.current
    if (sheet) {
      sheet.style.transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1)'
      sheet.style.transform  = 'translateY(0)'
    }
  }

  // ── Unified touch handler on sheet (non-passive so we can preventDefault) ──
  useEffect(() => {
    const sheet  = sheetRef.current
    const list   = listRef.current
    const handle = handleRef.current
    if (!sheet || !list || !handle) return

    let startY   = 0
    let dragging = false
    let offset   = 0
    let source   = null   // 'handle' | 'list'

    const onStart = (e) => {
      startY   = e.touches[0].clientY
      dragging = false
      offset   = 0
      source   = handle.contains(e.target) ? 'handle' : 'list'
    }

    const onMove = (e) => {
      const dy = e.touches[0].clientY - startY

      if (!dragging) {
        // Start dragging when finger moves down (positive dy) AND
        // either we're in the handle area OR the list is scrolled to the top
        const canDrag = source === 'handle'
          ? dy > 4
          : dy > 8 && list.scrollTop <= 0
        if (canDrag) {
          dragging = true
          // re-anchor so drag starts from 0 at this exact point
          startY = e.touches[0].clientY
          offset = 0
        }
      }

      if (dragging) {
        e.preventDefault()   // block native scroll while dragging sheet
        offset = Math.max(0, e.touches[0].clientY - startY)
        sheet.style.transition = 'none'
        sheet.style.transform  = `translateY(${offset}px)`
      }
    }

    const onEnd = () => {
      if (!dragging) return
      dragging = false
      if (offset > 100) {
        animateClose()
      } else {
        snapBack()
      }
      offset = 0
    }

    sheet.addEventListener('touchstart', onStart, { passive: true  })
    sheet.addEventListener('touchmove',  onMove,  { passive: false })
    sheet.addEventListener('touchend',   onEnd,   { passive: true  })
    sheet.addEventListener('touchcancel',onEnd,   { passive: true  })
    return () => {
      sheet.removeEventListener('touchstart',  onStart)
      sheet.removeEventListener('touchmove',   onMove)
      sheet.removeEventListener('touchend',    onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Desktop: wheel-up at top closes sheet ────────────────────────────────
  const handleWheel = (e) => {
    const el = listRef.current
    if (el && el.scrollTop === 0 && e.deltaY < 0) animateClose()
  }

  const text    = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub     = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const bg      = dark ? 'bg-tp-bg'      : 'bg-tp-bg-l'
  const card    = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const divider = dark ? 'bg-tp-border'  : 'bg-tp-border-l'
  const Icon    = category.icon

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300"
        style={{ opacity: backdropVisible ? 1 : 0 }}
        onClick={animateClose}
      />

      {/* Sheet — transform managed via sheetRef, no CSS transition class */}
      <div
        ref={sheetRef}
        className={`relative mt-auto rounded-t-3xl ${bg} flex flex-col max-h-[72vh]`}
      >
        {/* Drag handle + header — tap/drag anywhere here to close */}
        <div ref={handleRef} className="shrink-0 cursor-grab active:cursor-grabbing select-none">
          <div className="flex justify-center pt-3 pb-1">
            <div className={`w-10 h-1 rounded-full ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <Icon size={18} className={sub} />
              <h2 className={`text-lg font-bold ${text}`}>{category.label}</h2>
              <span className={`text-sm ${sub}`}>· {category.assets.length}</span>
            </div>
            <button
              onTouchEnd={(e) => { e.stopPropagation(); animateClose() }}
              onClick={animateClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`}
            >
              <X size={15} className={sub} />
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div
          ref={listRef}
          className="overflow-y-auto px-4 overscroll-contain"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
          onWheel={handleWheel}
        >
          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            {category.assets.map((asset, i) => (
              <div key={asset.symbol}>
                {i > 0 && <div className={`h-px mx-4 ${divider}`} />}
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
                    ${dark ? 'hov-dark' : 'hov-light'}`}
                  onClick={() => { onCloseRef.current(); navigate(`/asset/${asset.symbol}`) }}
                >
                  <AssetLogo symbol={asset.symbol} type={asset.type} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${text}`}>
                      {asset.symbol.replace(/-USD$|-USDT$/i, '')}
                    </div>
                    <div className={`text-xs ${sub} truncate`}>{asset.name}</div>
                  </div>
                  <ChevronRight size={15} className={sub} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Home() {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState(null)

  const text = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card    = dark ? 'bg-tp-card border-tp-border hov-dark' : 'bg-tp-card-l border-tp-border-l hov-light'
  const catCard = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const divider = dark ? 'divide-tp-border' : 'divide-tp-border-l'

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${text}`}>TraderPro</h1>
          <p className={`text-sm mt-0.5 ${sub}`}>Marktdaten in Echtzeit</p>
        </div>
        <button
          onClick={toggle}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors
            ${dark ? 'border-tp-border hov-dark text-tp-sub' : 'border-tp-border-l hov-light text-tp-sub-l'}`}
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {/* Search */}
      <SearchBar />

      {/* Trending */}
      <div>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>Beliebt</h2>
        <div className="grid grid-cols-2 gap-2">
          {TRENDING.map(({ symbol, name, type }) => (
            <button
              key={symbol}
              onClick={() => navigate(`/asset/${symbol}`)}
              className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${card}`}
            >
              <AssetLogo symbol={symbol} type={type} size={36} />
              <div className="min-w-0">
                <div className={`font-semibold text-sm leading-tight ${text}`}>{symbol.replace(/-USD$|-USDT$/i, '')}</div>
                <div className={`text-xs truncate ${sub}`}>{name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Guru Tracker Widget */}
      <div
        onClick={() => navigate('/guru')}
        className={`w-full rounded-3xl border p-5 text-left cursor-pointer transition-colors ${dark ? 'bg-tp-card border-tp-border hov-dark' : 'bg-tp-card-l border-tp-border-l hov-light'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-tp-blue/15 flex items-center justify-center shrink-0">
              <TrendingUp size={20} className="text-tp-blue" />
            </div>
            <div>
              <div className={`text-base font-bold ${dark ? 'text-tp-text' : 'text-tp-text-l'}`}>Guru Tracker</div>
              <div className={`text-xs ${dark ? 'text-tp-sub' : 'text-tp-sub-l'}`}>13F-Filings der Top-Investoren</div>
            </div>
          </div>
          <ChevronRight size={16} className={dark ? 'text-tp-sub' : 'text-tp-sub-l'} />
        </div>

        {/* Guru avatars grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ['WB','Warren Buffett','#3b82f6'],
            ['MB','Michael Burry','#ef4444'],
            ['BA','Bill Ackman','#8b5cf6'],
            ['SD','Stan Druckenmiller','#f59e0b'],
            ['DT','David Tepper','#00b15d'],
            ['GS','George Soros','#06b6d4'],
          ].map(([init, name, color]) => (
            <div key={init} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl ${dark ? 'bg-tp-border/60' : 'bg-tp-border-l/60'}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ background: color }}>
                {init}
              </div>
              <div className={`text-[10px] font-medium leading-tight truncate ${dark ? 'text-tp-text' : 'text-tp-text-l'}`}>
                {name.split(' ')[1]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>Kategorien</h2>
        <div className={`rounded-2xl border overflow-hidden divide-y ${catCard} ${divider}`}>
          {CATEGORIES.map(({ id, icon: Icon, label, example, assets }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(CATEGORIES.find(c => c.id === id))}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${dark ? 'hov-dark' : 'hov-light'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`}>
                <Icon size={15} className={sub} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${text}`}>{label}</span>
                <span className={`text-xs ml-2 ${sub}`}>{example}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-xs ${sub}`}>{assets.length}</span>
                <ChevronRight size={14} className={sub} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Category Sheet */}
      {activeCategory && (
        <CategorySheet
          category={activeCategory}
          onClose={() => setActiveCategory(null)}
        />
      )}
    </div>
  )
}
