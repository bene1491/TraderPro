import { useTheme } from '../context/ThemeContext'

function formatNum(val, type = 'number', currency = 'USD') {
  if (val == null) return '—'
  if (type === 'currency') {
    if (val >= 1e12) return `${(val / 1e12).toFixed(2)} T`
    if (val >= 1e9)  return `${(val / 1e9).toFixed(2)} B`
    if (val >= 1e6)  return `${(val / 1e6).toFixed(2)} M`
    return new Intl.NumberFormat('de', { style: 'currency', currency }).format(val)
  }
  if (type === 'percent') return `${(val * 100).toFixed(2)} %`
  if (type === 'price') {
    return new Intl.NumberFormat('de', {
      style: 'currency',
      currency,
      minimumFractionDigits: val < 10 ? 4 : 2,
      maximumFractionDigits: val < 10 ? 4 : 2,
    }).format(val)
  }
  return val.toLocaleString('de')
}

export default function StatsGrid({ quote }) {
  const { dark } = useTheme()
  const c = quote?.currency ?? 'USD'

  const items = [
    { label: '52W Hoch',      value: formatNum(quote?.yearHigh,      'price',   c) },
    { label: '52W Tief',      value: formatNum(quote?.yearLow,       'price',   c) },
    { label: 'Market Cap',    value: formatNum(quote?.marketCap,     'currency', c) },
    { label: 'Volumen',       value: formatNum(quote?.volume,        'number') },
    { label: 'KGV',           value: quote?.pe?.toFixed(2) ?? '—' },
    { label: 'EPS',           value: quote?.eps != null ? formatNum(quote.eps, 'price', c) : '—' },
    { label: 'Dividende',     value: formatNum(quote?.dividendYield, 'percent') },
    { label: 'Börse',         value: quote?.exchange ?? '—' },
  ]

  const card = dark
    ? 'bg-tp-card border-tp-border'
    : 'bg-tp-card-l border-tp-border-l'
  const label = 'text-tp-sub text-xs mb-1'
  const val   = `text-sm font-semibold ${dark ? 'text-tp-text' : 'text-tp-text-l'}`

  return (
    <div className={`rounded-2xl border p-4 ${card}`}>
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${dark ? 'text-tp-sub' : 'text-tp-sub-l'}`}>
        Kennzahlen
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map(({ label: l, value: v }) => (
          <div key={l}>
            <div className={label}>{l}</div>
            <div className={val}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
