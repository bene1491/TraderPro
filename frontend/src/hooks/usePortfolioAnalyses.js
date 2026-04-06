import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function usePortfolioAnalyses() {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading]   = useState(false)

  const load = useCallback(async () => {
    if (!user || !supabaseReady) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('portfolio_analyses')
        .select('*')
        .order('created_at', { ascending: false })
      setAnalyses(data ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (investmentStyle, analysisResult) => {
    if (!user || !supabaseReady) return null
    const { data, error } = await supabase
      .from('portfolio_analyses')
      .insert({ user_id: user.id, investment_style: investmentStyle, analysis_result: analysisResult })
      .select()
      .single()
    if (error) throw error
    setAnalyses(prev => [data, ...prev])
    return data
  }, [user])

  const remove = useCallback(async (id) => {
    if (!user || !supabaseReady) return
    await supabase.from('portfolio_analyses').delete().eq('id', id)
    setAnalyses(prev => prev.filter(a => a.id !== id))
  }, [user])

  return { analyses, loading, save, remove, reload: load }
}
