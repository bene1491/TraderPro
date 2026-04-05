import { useEffect, useRef, useState } from 'react'

const API_BASE    = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
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
      let rateTimer      = null

      const refreshEurRate = () => {
        fetch(BINANCE_API + '?symbol=EURUSDT')
          .then(function(r) { return r.json() })
          .then(function(d) { if (d.price) eurRateRef.current = 1 / parseFloat(d.price) })
          .catch(function() {})
      }

      if (isUsdPair) {
        refreshEurRate()
        rateTimer = setInterval(refreshEurRate, 60000)
      }

      function connect() {
        if (dead) return
        ws = new WebSocket(BINANCE_WS + '/' + binanceSym + '@miniTicker')

        ws.onopen = function() { setConnected(true) }
        ws.onclose = function() {
          setConnected(false)
          if (!dead) reconnectTimer = setTimeout(connect, 3000)
        }
        ws.onerror = function() { ws.close() }
        ws.onmessage = function(e) {
          try {
            var d = JSON.parse(e.data)
            var price = parseFloat(d.c)
            if (isUsdPair && eurRateRef.current) {
              price = Math.round(price * eurRateRef.current * 100) / 100
            }
            setTick({
              price:       price,
              currency:    'EUR',
              marketState: 'REGULAR',
              source:      'live',
              ts:          new Date().toISOString(),
            })
          } catch (err) {}
        }
      }

      connect()
      return function() {
        dead = true
        clearTimeout(reconnectTimer)
        clearInterval(rateTimer)
        if (ws) ws.close()
      }
    }

    // ── STOCKS / ETFs / FUTURES: poll REST every 5s ───────────────────────
    let dead  = false
    let timer = null

    function poll() {
      if (dead) return
      fetch(API_BASE + '/api/quote/' + symbol)
        .then(function(r) { return r.json() })
        .then(function(d) {
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
        .catch(function() { setConnected(false) })
        .finally(function() { if (!dead) timer = setTimeout(poll, 5000) })
    }

    timer = setTimeout(poll, 5000)
    return function() { dead = true; clearTimeout(timer) }
  }, [symbol])

  return { tick, connected }
}
