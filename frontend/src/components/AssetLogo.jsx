import { useState } from 'react'

const CRYPTO_TYPES = ['CRYPTOCURRENCY', 'Krypto']

function cryptoIconUrl(symbol) {
  const base = symbol.replace(/-USD$|-USDT$|-EUR$|-USDC$/i, '').toLowerCase()
  return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${base}.svg`
}

function stockLogoUrl(symbol) {
  // Parqet logo CDN — works for most stocks & ETFs by ticker symbol
  const clean = symbol.replace(/\.[A-Z]+$/, '') // strip exchange suffix (IWDA.L → IWDA)
  return `https://assets.parqet.com/logos/symbol/${clean}?format=svg`
}

const GRADIENTS = [
  ['#007aff', '#0055cc'],
  ['#00b15d', '#007a40'],
  ['#ff3b30', '#cc1a10'],
  ['#ff9500', '#cc7000'],
  ['#af52de', '#7a2aaa'],
  ['#5ac8fa', '#2a8fcc'],
  ['#ff2d55', '#cc0030'],
  ['#34c759', '#1a8f35'],
]

function gradientFor(symbol) {
  const idx = (symbol?.charCodeAt(0) ?? 0) % GRADIENTS.length
  return GRADIENTS[idx]
}

export default function AssetLogo({ symbol, type, size = 40, className = '' }) {
  const [failed, setFailed] = useState(false)

  const isCrypto = CRYPTO_TYPES.includes(type)
  const src      = !failed
    ? (isCrypto ? cryptoIconUrl(symbol) : stockLogoUrl(symbol))
    : null

  const sizeStyle = { width: size, height: size, minWidth: size }
  const label     = (symbol ?? '?').replace(/-USD$|-USDT$|-EUR$/i, '').slice(0, 2).toUpperCase()
  const [g1, g2]  = gradientFor(symbol ?? '')

  if (src) {
    return (
      <div
        className={`rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${className}`}
        style={{ ...sizeStyle, background: isCrypto ? 'transparent' : '#fff', padding: isCrypto ? 0 : 5 }}
      >
        <img
          src={src}
          alt={symbol}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl flex items-center justify-center shrink-0 ${className}`}
      style={{ ...sizeStyle, background: `linear-gradient(135deg, ${g1}, ${g2})` }}
    >
      <span style={{ fontSize: size * 0.32, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
        {label}
      </span>
    </div>
  )
}
