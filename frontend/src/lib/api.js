const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  search:  (q)              => request(`/api/search?q=${encodeURIComponent(q)}`),
  quote:   (symbol)         => request(`/api/quote/${symbol}`),
  history: (symbol, period) => request(`/api/history/${symbol}?period=${period}`),
  news:    (symbol)         => request(`/api/news/${symbol}`),
}
