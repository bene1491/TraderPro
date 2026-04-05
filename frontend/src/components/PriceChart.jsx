import { useMemo, useState, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useTheme } from '../context/ThemeContext'

const PERIODS = ['1D', '1W', '1M', '1Y', '5Y', '10Y', '15Y', 'MAX']

function formatDate(dateStr, period) {
  const d = new Date(dateStr)
  if (period === '1D') return d.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
  if (period === '1W') return d.toLocaleDateString('de', { weekday: 'short', day: 'numeric' })
  if (period === '1M') return d.toLocaleDateString('de', { day: 'numeric', month: 'short' })
  if (period === '1Y') return d.toLocaleDateString('de', { month: 'short', year: '2-digit' })
  return d.toLocaleDateString('de', { month: 'short', year: 'numeric' })
}

function formatPrice(val, currency = 'USD') {
  if (val == null) return '—'
  return new Intl.NumberFormat('de', {
    style: 'currency',
    currency,
    minimumFractionDigits: val < 10 ? 4 : 2,
    maximumFractionDigits: val < 10 ? 4 : 2,
  }).format(val)
}

const CustomTooltip = ({ active, payload, period, currency, dark }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={`rounded-xl px-3 py-2 text-xs shadow-lg border
      ${dark ? 'bg-tp-card border-tp-border text-tp-text' : 'bg-white border-tp-border-l text-tp-text-l'}`}>
      <div className="font-semibold">{formatPrice(d.close, currency)}</div>
      <div className="text-tp-sub mt-0.5">{formatDate(d.date, period)}</div>
    </div>
  )
}

export default function PriceChart({ data = [], period, onPeriodChange, currency = 'USD', loading, lastTradeTime, marketState }) {
  const { dark } = useTheme()

  const isPositive = useMemo(() => {
    if (!data.length) return true
    return data[data.length - 1].close >= data[0].close
  }, [data])

  const color = isPositive ? '#00b15d' : '#ff3b30'

  const domain = useMemo(() => {
    if (!data.length) return ['auto', 'auto']
    const vals = data.map(d => d.close)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const pad = (max - min) * 0.08
    return [min - pad, max + pad]
  }, [data])

  const tickFormatter = useCallback(
    (v) => formatDate(v, period),
    [period]
  )

  const tickCount = useMemo(() => {
    if (['1D', '1W'].includes(period)) return 4
    if (['1M', '1Y'].includes(period)) return 5
    return 4
  }, [period])

  const bgClass = dark ? 'bg-tp-bg' : 'bg-tp-bg-l'
  const subText = dark ? '#8e8e93' : '#6c6c70'

  return (
    <div className="w-full">
      {/* Chart area */}
      <div className="h-48 w-full relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-tp-sub border-t-transparent animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-tp-sub">
            Keine Daten verfügbar
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={tickFormatter}
                tickCount={tickCount}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: subText }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={domain}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: subText }}
                width={56}
                tickFormatter={v => v.toLocaleString('de', { maximumFractionDigits: 2 })}
              />
              <Tooltip
                content={<CustomTooltip period={period} currency={currency} dark={dark} />}
                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                fill="url(#chartGrad)"
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: dark ? '#111' : '#fff', strokeWidth: 2 }}
                isAnimationActive={data.length < 500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 1D info */}
      {period === '1D' && lastTradeTime && (
        <div className="mt-3 text-xs text-tp-sub text-center space-y-0.5">
          {(() => {
            const d = new Date(lastTradeTime)
            const isToday = d.toDateString() === new Date().toDateString()
            const dateStr = isToday
              ? 'Heutiger Handelstag'
              : `Letzter Handelstag: ${d.toLocaleDateString('de', { weekday: 'long', day: 'numeric', month: 'long' })}`
            return (
              <>
                <div>{dateStr} · Zeiten in deiner Ortszeit</div>
                <div className="opacity-60">Inkl. Pre- &amp; Post-Market · US: 15:30–22:00 Uhr · EU/Xetra: 08:00–22:00 Uhr</div>
              </>
            )
          })()}
        </div>
      )}

      {/* Period selector */}
      <div className="flex justify-between mt-4 px-1">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`text-xs font-semibold px-2 py-1.5 rounded-lg transition-all
              ${period === p
                ? `text-white`
                : `text-tp-sub ${dark ? 'hover:text-tp-text' : 'hover:text-tp-text-l'}`
              }`}
            style={period === p ? { backgroundColor: color } : {}}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
