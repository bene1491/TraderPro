import { useNavigate } from 'react-router-dom'
import AssetLogo from './AssetLogo'
import { useTheme } from '../context/ThemeContext'

function formatPrice(val, currency = 'EUR') {
  if (val == null) return '—'
  return new Intl.NumberFormat('de', {
    style: 'currency',
    currency,
    minimumFractionDigits: val < 10 ? 4 : 2,
    maximumFractionDigits: val < 10 ? 4 : 2,
  }).format(val)
}

export default function AssetCard({ symbol, name, price, changePercent, currency = 'EUR', type }) {
  const { dark } = useTheme()
  const navigate = useNavigate()

  const up          = (changePercent ?? 0) >= 0
  const changeColor = up ? 'text-tp-green' : 'text-tp-red'
  const card        = dark
    ? 'bg-tp-card border-tp-border hov-dark'
    : 'bg-tp-card-l border-tp-border-l hov-light'
  const text        = dark ? 'text-tp-text' : 'text-tp-text-l'

  return (
    <button
      onClick={() => navigate(`/asset/${symbol}`)}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors text-left ${card}`}
    >
      <AssetLogo symbol={symbol} type={type} size={40} />

      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm truncate ${text}`}>{symbol.replace(/-USD$|-USDT$/, '')}</div>
        <div className="text-xs text-tp-sub truncate">{name}</div>
      </div>

      <div className="text-right shrink-0">
        <div className={`font-semibold text-sm tabular-nums ${text}`}>
          {formatPrice(price, currency)}
        </div>
        <div className={`text-xs font-medium tabular-nums mt-0.5 ${changeColor}`}>
          {up ? '+' : ''}{(changePercent ?? 0).toFixed(2)}%
        </div>
      </div>
    </button>
  )
}
