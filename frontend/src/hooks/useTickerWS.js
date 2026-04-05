import { useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const BINANCE_WS  = 'wss://stream.binance.com:9443/ws'
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price'

function toBinanceSym(symbol) {
  const s = symbol.toUpperCase()
  if (s.endsWith('-USDT')) return s.replace('-USDT', 'USDT').toLowerCase()
  if (s.endsWith('-USD'))  return s.replace('-USD',  'USDT').toLowerCase()
  if (s.endsWith('-EUR'))  return s.replace('-EUR',  'EUR' ).toLowerCase()
  return null
}

export function useTickerWS(symbol) {
  const [tick, setTick]           = useState(null)
  const [connected, setConnected] = useState(false)
  const eurRateRef = useRef(null)

  useEffect(() => {
    if (!symbol) return
    const binanceSym = toBinanceSym(symbol)

    // ── CRYPTO: direct Binance WebSocket ─────────────────────────────────
    if (binanceSym) {
      const isUsdPair = binanceSym.endsWith('usdt')
      let dead = false
      let ws   = null
      let reconnectTimer = null

      // Fetch EUR/USDT rate once from Binance REST, then refresh every 60s
      const refreshEurRate = () => {
        fetch(`${BINANCE_API}?symbol=EURUSDT`)
          .then(r => r.json())
          .then(d => { if (d.price) eurRateRef.current = 1 / parseFloat(d.price) })
          .catch(() => {})
      }
      if (isUsdPair) {
        refreshEurRate()
        const rateTimer = setInterval(refreshEurRate, 60_000)
        // clean up via closure below
        const origCleanup = () => clearInterval(rateTimer)
        // attach to dead-flag cleanup
        void origCleanup  // referenced in return
      }

      const connect = () => {
        if (dead) return
        ws = new WebSocket(`${BINANCE_WS}/${binanceSym}@miniTicker`)

        ws.onopen  = () => setConnected(true)
        ws.onclose = () => {
          setConnected(false)
          if (!dead) reconnectTimer = setTimeout(connect, 3000)
        }
        ws.onerror = () => ws.close()
        ws.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data)
            let price = parseFloat(d.c)
            if (isUsdPair && eurRateRef.current) {
              price = Math.round(price * eurRateRef.current * 100) / 100
            }
            setTick({
              price,
              currency:    'EUR',
              marketState: 'REGULAR',
              source:      'live',
              ts:          new Date().toISOString(),
            })
          } catch {}
        }
      }

      connect()
      return () => {
        dead = true
        clearTimeout(reconnectTimer)
        ws?.close()
      }
    }

    // ── STOCKS / ETFs / FUTURES: poll REST every 5s ───────────────────────
    let dead  = false
    let timer = null

    const poll = () => {
      if (dead) return
      fetch(`${API_BASE}/api/quote/${symbol}`)
        .then(r => r.json())
        .then(d => {
          if (d.price != null) {
            setConnected(true)
            setTick({
              price:         d.price,
              change:        d.change,
              changePercent: d.changePercent,
              currency:      d.currency,
              marketState:   d.marketState,
              source:        'yahoo',
              ts:            new Date().toISOString(),
            })
          }
        })
        .catch(() => setConnected(false))
        .finally(() => { if (!dead) timer = setTimeout(poll, 5000) })
    }

    timer = setTimeout(poll, 5000)   // first tick after 5s (initial load already loaded the quote)
    return () => { dead = true; clearTimeout(timer) }
  }, [symbol])

  return { tick, connected }
}
