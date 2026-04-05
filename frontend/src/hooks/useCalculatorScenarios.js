import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LS_KEY = 'tp_calc_saves'

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function lsSave(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export function useCalculatorScenarios() {
  const { user } = useAuth()
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(false)

  const useCloud = supabaseReady && !!user

  const fetch = useCallback(async () => {
    setLoading(true)
    if (useCloud) {
      const { data } = await supabase
        .from('calculator_scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setScenarios(data ?? [])
    } else {
      setScenarios(lsLoad())
    }
    setLoading(false)
  }, [useCloud, user?.id])

  useEffect(() => { fetch() }, [fetch])

  const save = async ({ name, start, monthly, rate, years, kest, finalValue }) => {
    if (!user) throw new Error('not_authenticated')
    if (useCloud) {
      const row = {
        user_id:      user.id,
        name,
        start_amount: start,
        monthly_rate: monthly,
        annual_return: rate,
        years,
        kest,
        final_value:  finalValue,
      }
      const { data } = await supabase
        .from('calculator_scenarios')
        .insert(row)
        .select()
        .single()
      if (data) setScenarios(prev => [data, ...prev])
    } else {
      const row = {
        id: crypto.randomUUID(),
        name,
        start_amount: start,
        monthly_rate: monthly,
        annual_return: rate,
        years,
        kest,
        final_value: finalValue,
        created_at: new Date().toISOString(),
      }
      setScenarios(prev => { const n = [row, ...prev]; lsSave(n); return n })
    }
  }

  const remove = async (id) => {
    if (useCloud) {
      await supabase
        .from('calculator_scenarios')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
    }
    setScenarios(prev => {
      const n = prev.filter(s => s.id !== id)
      if (!useCloud) lsSave(n)
      return n
    })
  }

  return { scenarios, loading, save, remove, useCloud }
}
