import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { api } from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import AssetLogo from './AssetLogo'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const TYPE_COLOR = {
  Aktie:   'text-blue-400',
  ETF:     'text-purple-400',
  Krypto:  'text-yellow-400',
  Index:   'text-tp-sub',
  Fonds:   'text-green-400',
  Rohstoff:'text-orange-400',
}

export default function SearchBar({ autoFocus = false, onClose }) {
  const { dark }  = useTheme()
  const navigate  = useNavigate()
  const inputRef  = useRef(null)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const debounced = useDebounce(query, 280)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (!debounced.trim()) { setResults([]); setOpen(false); return }
    let cancelled = false
    setLoading(true)
    api.search(debounced)
      .then(data => { if (!cancelled) { setResults(data.results ?? []); setOpen(true) } })
      .catch(() => { if (!cancelled) setResults([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debounced])

  const clear  = () => { setQuery(''); setResults([]); setOpen(false) }
  const select = (symbol) => { clear(); onClose?.(); navigate(`/asset/${symbol}`) }

  const card  = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const input = dark ? 'bg-tp-border text-tp-text placeholder-tp-sub' : 'bg-tp-border-l text-tp-text-l placeholder-tp-sub-l'
  const textMain = dark ? 'text-tp-text' : 'text-tp-text-l'

  return (
    <div className="relative w-full">
      <div className={`flex items-center gap-2 rounded-2xl px-3.5 py-3 ${input}`}>
        {loading
          ? <div className="w-4 h-4 rounded-full border-2 border-tp-sub border-t-transparent animate-spin shrink-0" />
          : <Search size={15} className="text-tp-sub shrink-0" />
        }
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          placeholder="Aktie, ETF, Krypto, Rohstoff…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button onClick={clear} className="text-tp-sub transition-colors">
            <X size={15} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border overflow-hidden shadow-2xl animate-fade-in ${card}`}>
          {results.map((r, i) => (
            <li key={r.symbol}>
              {i > 0 && <div className={`h-px mx-4 ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`} />}
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${dark ? 'hov-dark' : 'hov-light'}`}
                onClick={() => select(r.symbol)}
              >
                <AssetLogo symbol={r.symbol} type={r.type} size={36} />
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${textMain}`}>
                    {r.symbol.replace(/-USD$|-USDT$/, '')}
                  </div>
                  <div className="text-xs text-tp-sub truncate">{r.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-medium ${TYPE_COLOR[r.type] ?? 'text-tp-sub'}`}>
                    {r.type || '—'}
                  </div>
                  <div className="text-xs text-tp-muted mt-0.5">{r.exchange}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border px-4 py-6 text-center text-sm text-tp-sub animate-fade-in ${card}`}>
          Keine Ergebnisse für „{query}"
        </div>
      )}
    </div>
  )
}
