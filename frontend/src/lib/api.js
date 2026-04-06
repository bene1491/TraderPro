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
  search:   (q)              => request(`/api/search?q=${encodeURIComponent(q)}`),
  quote:    (symbol)         => request(`/api/quote/${symbol}`),
  history:  (symbol, period) => request(`/api/history/${symbol}?period=${period}`),
  news:     (symbol)         => request(`/api/news/${symbol}`),
  batchQuotes:     (symbols) => request(`/api/quotes/batch?symbols=${symbols.map(encodeURIComponent).join(',')}`),
  portfolioChart:  (positions, period) => {
    const posStr = positions.map(p => `${p.symbol}:${p.quantity}`).join(',')
    return request(`/api/portfolio/chart?positions=${encodeURIComponent(posStr)}&period=${period}`, 30000)
  },
  portfolioNews: (symbols) => request(`/api/portfolio/news?symbols=${symbols.map(encodeURIComponent).join(',')}`),
  gurus:         ()        => request('/api/gurus'),
  guruHoldings:  (cik)     => request(`/api/gurus/${cik}/holdings`, 30000),
  analyzePortfolio: async (images, investmentStyle) => {
    const formData = new FormData()
    images.forEach(img => formData.append('images', img))
    formData.append('investment_style', investmentStyle || '')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000) // 60s for AI
    try {
      const res = await fetch(`${BASE}/api/portfolio/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `HTTP ${res.status}`)
      }
      return res.json()
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Analyse-Timeout – bitte erneut versuchen.')
      throw err
    } finally {
      clearTimeout(timer)
    }
  },
}
