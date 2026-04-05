import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'traderpro_watchlist'

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function lsSave(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useWatchlist() {
  const { user } = useAuth()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)

  // Use cloud only when Supabase is configured AND user is logged in
  const useCloud = supabaseReady && !!user

  const fetch = useCallback(async () => {
    setLoading(true)
    if (useCloud) {
      const { data } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setItems(data ?? [])
    } else {
      setItems(lsLoad())
    }
    setLoading(false)
  }, [useCloud, user?.id])

  useEffect(() => { fetch() }, [fetch])

  const isWatched = (symbol) =>
    items.some(i => i.symbol === symbol.toUpperCase())

  const add = async (symbol, name, type) => {
    const sym = symbol.toUpperCase()
    if (!user) throw new Error('not_authenticated')
    if (isWatched(sym)) return

    if (useCloud) {
      const row = { user_id: user.id, symbol: sym, name, asset_type: type ?? '' }
      const { data } = await supabase.from('watchlist').insert(row).select().single()
      if (data) setItems(prev => [data, ...prev])
    } else {
      const row = { id: crypto.randomUUID(), symbol: sym, name, asset_type: type ?? '', created_at: new Date().toISOString() }
      setItems(prev => { const n = [row, ...prev]; lsSave(n); return n })
    }
  }

  const remove = async (symbol) => {
    const sym = symbol.toUpperCase()
    if (useCloud) {
      await supabase.from('watchlist').delete().eq('user_id', user.id).eq('symbol', sym)
    }
    setItems(prev => { const n = prev.filter(i => i.symbol !== sym); if (!useCloud) lsSave(n); return n })
  }

  const toggle = (symbol, name, type) =>
    isWatched(symbol) ? remove(symbol) : add(symbol, name, type)

  return { items, loading, isWatched, add, remove, toggle, refresh: fetch, useCloud }
}
