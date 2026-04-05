import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, RefreshCw } from 'lucide-react'
import AssetCard from '../components/AssetCard'
import SwipeToDelete from '../components/SwipeToDelete'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'

export default function Watchlist() {
  const { dark }     = useTheme()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const { items, loading, remove, refresh, useCloud } = useWatchlist()
  const [quotes, setQuotes]   = useState({})
  const [refreshing, setRefreshing] = useState(false)

  const toast = useToast()
  const text = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'   : 'text-tp-sub-l'

  const handleRemove = async (item) => {
    await remove(item.symbol)
    toast(`${item.name} von der Watchlist entfernt.`, 'info')
  }

  const loadQuotes = async (list) => {
    if (!list.length) return
    const results = await Promise.allSettled(list.map(i => api.quote(i.symbol)))
    const map = {}
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') map[list[idx].symbol] = r.value
    })
    setQuotes(map)
  }

  useEffect(() => {
    if (items.length) loadQuotes(items)
  }, [items])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    await loadQuotes(items)
    setRefreshing(false)
  }

  // No gate — localStorage works without login

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className={`text-2xl font-bold tracking-tight ${text}`}>Watchlist</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-2 rounded-xl border transition-colors
            ${dark ? 'border-tp-border hov-dark' : 'border-tp-border-l hov-light'}`}
        >
          <RefreshCw size={16} className={`${sub} ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !items.length ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-16 rounded-2xl animate-pulse
              ${dark ? 'bg-tp-card' : 'bg-tp-card-l'}`} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Star size={40} className="text-tp-sub opacity-30" />
          <p className={`text-sm ${sub}`}>Noch nichts auf der Watchlist.</p>
          <button onClick={() => navigate('/')} className="text-sm text-tp-blue hover:underline">
            Jetzt suchen →
          </button>
        </div>
      ) : (
        <div className="space-y-2 animate-slide-up">
          <p className={`text-xs ${sub} text-right pr-1 pb-0.5 opacity-60`}>← Links wischen zum Entfernen</p>
          {items.map(item => {
            const q = quotes[item.symbol]
            return (
              <SwipeToDelete key={item.symbol} onDelete={() => handleRemove(item)}>
                <AssetCard
                  symbol={item.symbol}
                  name={item.name}
                  price={q?.price}
                  changePercent={q?.changePercent ?? 0}
                  currency={q?.currency}
                  type={item.asset_type}
                />
              </SwipeToDelete>
            )
          })}
        </div>
      )}
    </div>
  )
}
