import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create a real client when both values are present
export const supabase = (url && key)
  ? createClient(url, key)
  : null

export const supabaseReady = !!(url && key)
