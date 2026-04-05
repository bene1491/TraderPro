import { useEffect, useRef, useState } from 'react'

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
  .replace(/^http/, 'ws')

/**
 * Opens a WebSocket to /api/ws/{symbol} and returns live tick data.
 * Falls back to null values if the connection fails.
 */
export function useTickerWS(symbol) {
  const [tick, setTick]     = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!symbol) return

    let reconnectTimer = null
    let dead = false

    function connect() {
      if (dead) return
      const ws = new WebSocket(`${WS_BASE}/api/ws/${symbol}`)
      wsRef.current = ws

      ws.onopen  = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        if (!dead) reconnectTimer = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.ping) return          // keepalive — ignore
          if (data.price != null) setTick(data)
        } catch {}
      }
    }

    connect()
    return () => {
      dead = true
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [symbol])

  return { tick, connected }
}
