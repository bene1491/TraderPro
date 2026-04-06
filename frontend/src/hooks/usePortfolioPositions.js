import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LS_KEY = 'traderpro_portfolio_positions'

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function lsSave(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export function usePortfolioPositions() {
  const { user } = useAuth()
  const [positions, setPositions] = useState([])
  const [loading,   setLoading]   = useState(false)

  const useCloud = supabaseReady && !!user

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (useCloud) {
        const { data } = await supabase
          .from('portfolio_positions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
        setPositions(data ?? [])
      } else {
        setPositions(lsLoad())
      }
    } catch {}
    finally { setLoading(false) }
  }, [useCloud, user?.id])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (symbol, name, assetType, quantity, avgPrice) => {
    const row = {
      symbol:     symbol.toUpperCase(),
      name,
      asset_type: assetType ?? 'EQUITY',
      quantity:   parseFloat(quantity),
      avg_price:  avgPrice ? parseFloat(avgPrice) : null,
    }

    if (useCloud) {
      const { data, error } = await supabase
        .from('portfolio_positions')
        .insert({ ...row, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      setPositions(prev => [...prev, data])
      return data
    } else {
      const local = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      setPositions(prev => { const n = [...prev, local]; lsSave(n); return n })
      return local
    }
  }, [useCloud, user?.id])

  const remove = useCallback(async (id) => {
    if (useCloud) {
      await supabase.from('portfolio_positions').delete().eq('id', id)
    }
    setPositions(prev => {
      const n = prev.filter(p => p.id !== id)
      if (!useCloud) lsSave(n)
      return n
    })
  }, [useCloud])

  const update = useCallback(async (id, changes) => {
    if (useCloud) {
      const { data, error } = await supabase
        .from('portfolio_positions')
        .update(changes)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setPositions(prev => prev.map(p => p.id === id ? data : p))
    } else {
      setPositions(prev => {
        const n = prev.map(p => p.id === id ? { ...p, ...changes } : p)
        lsSave(n)
        return n
      })
    }
  }, [useCloud])

  return { positions, loading, add, remove, update, reload: load, useCloud }
}
