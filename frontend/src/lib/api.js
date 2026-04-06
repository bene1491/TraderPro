const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(path, timeoutMs = 12000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `HTTP ${res.status}`)
    }
    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Server antwortet nicht – bitte kurz warten und neu laden.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// Wake up Render backend on app start (free tier sleeps after 15min inactivity)
export function pingBackend() {
  fetch(`${BASE}/health`, { signal: AbortSignal.timeout(30000) }).catch(() => {})
}

export const api = {
  search:  (q)              => request(`/api/search?q=${encodeURIComponent(q)}`),
  quote:   (symbol)         => request(`/api/quote/${symbol}`),
  history: (symbol, period) => request(`/api/history/${symbol}?period=${period}`),
  news:    (symbol)         => request(`/api/news/${symbol}`),
}
