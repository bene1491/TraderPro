import { useState, useMemo, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ChevronDown, ChevronUp, Save, Trash2, Calculator as CalcIcon, Cloud, LogIn } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useCalculatorScenarios } from '../hooks/useCalculatorScenarios'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Mio. €'
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtShort(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return Math.round(n).toString()
}

function compute({ start, monthly, rate, years, kest }) {
  const r = rate / 100
  const rows = []
  let value = start
  let invested = start

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = value * (1 + r / 12) + monthly
      invested += monthly
    }
    rows.push({ year: y, value: Math.round(value), invested: Math.round(invested) })
  }

  const finalValue = value
  const totalInvested = invested
  const rawGain = finalValue - totalInvested

  let afterTax = finalValue
  let taxAmount = 0
  if (kest && rawGain > 0) {
    taxAmount = rawGain * 0.26375
    afterTax = totalInvested + rawGain - taxAmount
  }

  return {
    rows,
    finalValue,
    totalInvested,
    rawGain,
    afterTax,
    taxAmount,
    factor: totalInvested > 0 ? finalValue / totalInvested : 1,
  }
}

function SliderInput({ label, value, min, max, step, onChange, display }) {
  const { dark } = useTheme()
  const pct = ((value - min) / (max - min)) * 100
  const trackRef = useRef(null)

  const trackBg = dark
    ? `linear-gradient(to right, #3b82f6 ${pct}%, #2a2d35 ${pct}%)`
    : `linear-gradient(to right, #3b82f6 ${pct}%, #e2e5eb ${pct}%)`

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className={`text-sm font-medium ${dark ? 'text-tp-text' : 'text-tp-text-l'}`}>{label}</span>
        <span className="text-sm font-bold text-tp-blue">{display(value)}</span>
      </div>
      <input
        ref={trackRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ background: trackBg }}
      />
      <div className={`flex justify-between text-xs ${dark ? 'text-tp-sub' : 'text-tp-sub-l'}`}>
        <span>{display(min)}</span>
        <span>{display(max)}</span>
      </div>
    </div>
  )
}

function NumberInput({ label, value, onChange, prefix = '€', placeholder }) {
  const { dark } = useTheme()
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    if (document.activeElement?.dataset?.field === label) return
    setRaw(value === 0 ? '' : String(value))
  }, [value])

  const bg   = dark ? 'bg-tp-border text-tp-text placeholder-tp-sub' : 'bg-tp-border-l text-tp-text-l placeholder-tp-sub-l'
  const text = dark ? 'text-tp-sub' : 'text-tp-sub-l'

  const commit = (v) => {
    const num = parseFloat(v.replace(',', '.'))
    onChange(isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100)
  }

  return (
    <div className="space-y-1.5">
      <label className={`text-sm font-medium ${dark ? 'text-tp-text' : 'text-tp-text-l'}`}>{label}</label>
      <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 ${bg}`}>
        <span className={`text-sm ${text}`}>{prefix}</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          placeholder={placeholder ?? '0'}
          value={raw}
          data-field={label}
          className="flex-1 bg-transparent text-sm outline-none"
          onChange={e => setRaw(e.target.value)}
          onBlur={e => commit(e.target.value)}
        />
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label, dark }) => {
  if (!active || !payload?.length) return null
  const invested = payload.find(p => p.dataKey === 'invested')?.value ?? 0
  const value    = payload.find(p => p.dataKey === 'value')?.value ?? 0
  const gain     = value - invested
  const bg   = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const text = dark ? 'text-tp-text' : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'  : 'text-tp-sub-l'
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs shadow-xl ${bg}`}>
      <div className={`font-semibold mb-1 ${text}`}>Jahr {label}</div>
      <div className={sub}>Eingesetzt: {fmt(invested)}</div>
      <div className="text-tp-blue">Gewinn: {fmt(gain)}</div>
      <div className={`font-bold mt-0.5 ${text}`}>Gesamt: {fmt(value)}</div>
    </div>
  )
}

export default function Calculator() {
  const { dark }    = useTheme()
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const toast       = useToast()
  const { scenarios, save, remove, useCloud } = useCalculatorScenarios()
  const lastCalcTickIndex = useRef(null)

  const [start,   setStart]   = useState(1000)
  const [monthly, setMonthly] = useState(100)
  const [rate,    setRate]    = useState(7.0)
  const [years,   setYears]   = useState(20)
  const [kest,    setKest]    = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [saveName,  setSaveName]  = useState('')
  const [saveOpen,  setSaveOpen]  = useState(false)

  const result = useMemo(() => compute({ start, monthly, rate, years, kest }), [start, monthly, rate, years, kest])

  const text    = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub     = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card    = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const divider = dark ? 'border-tp-border' : 'border-tp-border-l'

  const handleSave = async () => {
    if (!user) { setSaveOpen(true); return }
    const name = saveName.trim() || `${rate}% · ${years}J`
    try {
      await save({ name, start, monthly, rate, years, kest, finalValue: kest ? result.afterTax : result.finalValue })
      setSaveName('')
      setSaveOpen(false)
      toast(`Szenario "${name}" gespeichert.`, 'success')
    } catch (e) {
      toast('Fehler beim Speichern. Bitte versuche es erneut.', 'error')
    }
  }

  const handleRemove = async (s) => {
    await remove(s.id)
    toast(`Szenario "${s.name}" gelöscht.`, 'info')
  }

  const handleLoad = (s) => {
    setStart(s.start_amount)
    setMonthly(s.monthly_rate)
    setRate(s.annual_return)
    setYears(s.years)
    setKest(s.kest)
  }

  // chart data — show every year, but thin out for many years
  const chartData = result.rows.filter((_, i, arr) => {
    if (arr.length <= 20) return true
    return (i + 1) % Math.ceil(arr.length / 20) === 0 || i === arr.length - 1
  })

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="pt-2">
        <h1 className={`text-2xl font-bold tracking-tight ${text}`}>Renditerechner</h1>
        <p className={`text-sm mt-1 ${sub}`}>Zinseszins-Simulation für dein Vermögen</p>
      </div>

      {/* Inputs */}
      <div className={`rounded-2xl border p-5 space-y-5 ${card}`}>
        <NumberInput label="Startbetrag"      value={start}   onChange={setStart}   placeholder="1000" />
        <NumberInput label="Monatliche Sparrate" value={monthly} onChange={setMonthly} placeholder="100" />
        <div className={`border-t pt-4 ${divider}`}>
          <SliderInput
            label="Jährliche Rendite"
            value={rate} min={1} max={30} step={0.1}
            onChange={setRate}
            display={v => v.toFixed(1) + ' %'}
          />
        </div>
        <SliderInput
          label="Anlagehorizont"
          value={years} min={1} max={50} step={1}
          onChange={setYears}
          display={v => v + (v === 1 ? ' Jahr' : ' Jahre')}
        />

        {/* KeSt toggle */}
        <div className={`flex items-center justify-between border-t pt-4 ${divider}`}>
          <div>
            <div className={`text-sm font-medium ${text}`}>KeSt abziehen</div>
            <div className={`text-xs mt-0.5 ${sub}`}>Kapitalertragsteuer 26,375 %</div>
          </div>
          <button
            onClick={() => setKest(k => !k)}
            className={`relative w-12 h-6 rounded-full transition-colors ${kest ? 'bg-tp-blue' : dark ? 'bg-tp-border' : 'bg-tp-border-l'}`}
          >
            <span className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform ${kest ? 'translate-x-[22px]' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Result cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-2xl border p-4 col-span-2 ${card}`}>
          <div className={`text-xs ${sub} mb-1`}>{kest ? 'Endvermögen (nach KeSt)' : 'Endvermögen'}</div>
          <div className={`text-2xl font-bold ${text}`}>{fmt(kest ? result.afterTax : result.finalValue)}</div>
        </div>
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className={`text-xs ${sub} mb-1`}>Eingesetzt</div>
          <div className={`text-base font-semibold ${text}`}>{fmt(result.totalInvested)}</div>
        </div>
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className={`text-xs ${sub} mb-1`}>Gewinn</div>
          <div className={`text-base font-semibold text-tp-green`}>
            {fmt(result.rawGain)}
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className={`text-xs ${sub} mb-1`}>Faktor</div>
          <div className={`text-base font-semibold ${text}`}>× {result.factor.toFixed(2)}</div>
        </div>
        {kest && (
          <div className={`rounded-2xl border p-4 ${card}`}>
            <div className={`text-xs ${sub} mb-1`}>KeSt</div>
            <div className={`text-base font-semibold text-tp-red`}>−{fmt(result.taxAmount)}</div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className={`rounded-2xl border p-4 ${card}`}>
        <div className={`text-sm font-semibold mb-4 ${text}`}>Vermögensentwicklung</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            onMouseMove={(s) => {
              if (s?.activeTooltipIndex != null && s.activeTooltipIndex !== lastCalcTickIndex.current) {
                lastCalcTickIndex.current = s.activeTooltipIndex
                navigator.vibrate?.(6)
              }
            }}
            onMouseLeave={() => { lastCalcTickIndex.current = null }}
          >
            <defs>
              <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradGain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#2a2d35' : '#e2e5eb'} vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: dark ? '#6b7280' : '#9ca3af' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v}J`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: dark ? '#6b7280' : '#9ca3af' }}
              axisLine={false} tickLine={false}
              tickFormatter={fmtShort}
              width={40}
            />
            <Tooltip content={<CustomTooltip dark={dark} />} />
            {/* stacked: invested on bottom, value on top */}
            <Area
              type="monotone"
              dataKey="invested"
              stackId="1"
              stroke="#3b82f6"
              fill="url(#gradInvested)"
              strokeWidth={2}
              dot={false}
              name="Eingesetzt"
            />
            <Area
              type="monotone"
              dataKey="value"
              stackId="2"
              stroke="#22c55e"
              fill="url(#gradGain)"
              strokeWidth={2}
              dot={false}
              name="Endvermögen"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-tp-sub">
            <span className="w-3 h-3 rounded-sm bg-tp-blue/60 inline-block" />
            Eingesetzt
          </div>
          <div className="flex items-center gap-1.5 text-xs text-tp-sub">
            <span className="w-3 h-3 rounded-sm bg-tp-green/60 inline-block" />
            Endvermögen
          </div>
        </div>
      </div>

      {/* Yearly table (collapsible) */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <button
          onClick={() => setTableOpen(o => !o)}
          className={`w-full flex items-center justify-between px-5 py-4 text-sm font-semibold transition-colors
            ${dark ? 'hov-dark' : 'hov-light'} ${text}`}
        >
          Jahresübersicht
          {tableOpen ? <ChevronUp size={16} className={sub} /> : <ChevronDown size={16} className={sub} />}
        </button>
        {tableOpen && (
          <div className={`border-t overflow-x-auto ${divider}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${divider}`}>
                  {['Jahr', 'Eingesetzt', 'Gewinn', 'Gesamt'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-left font-medium ${sub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => {
                  const gain = row.value - row.invested
                  return (
                    <tr key={row.year} className={`border-b last:border-0 ${divider}`}>
                      <td className={`px-4 py-2.5 font-medium ${text}`}>{row.year}</td>
                      <td className={`px-4 py-2.5 ${sub}`}>{fmt(row.invested)}</td>
                      <td className="px-4 py-2.5 text-tp-green">{fmt(gain)}</td>
                      <td className={`px-4 py-2.5 font-semibold ${text}`}>{fmt(row.value)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save section */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <button
          onClick={() => setSaveOpen(o => !o)}
          className={`w-full flex items-center justify-between px-5 py-4 text-sm font-semibold transition-colors
            ${dark ? 'hov-dark' : 'hov-light'} ${text}`}
        >
          <span className="flex items-center gap-2">
            <Save size={15} />
            Szenarien speichern
            {useCloud && <Cloud size={13} className="text-tp-blue ml-1" />}
          </span>
          {saveOpen ? <ChevronUp size={16} className={sub} /> : <ChevronDown size={16} className={sub} />}
        </button>

        {saveOpen && (
          <div className={`border-t px-5 py-4 space-y-3 ${divider}`}>
            {!user ? (
              /* Not logged in — show login prompt */
              <div className="space-y-3 text-center">
                <p className={`text-sm ${sub}`}>Melde dich an, um Szenarien zu speichern.</p>
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full py-2.5 rounded-2xl bg-tp-blue text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <LogIn size={15} /> Jetzt anmelden
                </button>
              </div>
            ) : (
              <>
                <div className={`flex gap-2 items-center rounded-2xl px-4 py-3
                  ${dark ? 'bg-tp-border text-tp-text' : 'bg-tp-border-l text-tp-text-l'}`}>
                  <CalcIcon size={14} className={sub} />
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                  />
                </div>
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-2xl bg-tp-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Jetzt speichern
                </button>
              </>
            )}
          </div>
        )}

        {scenarios.length > 0 && (
          <div className={`border-t ${divider}`}>
            {scenarios.map((s, i) => (
              <div key={s.id}>
                {i > 0 && <div className={`h-px mx-4 ${divider}`} />}
                <div className="flex items-center px-5 py-3 gap-3">
                  <button onClick={() => handleLoad(s)} className="flex-1 text-left">
                    <div className={`text-sm font-medium ${text}`}>{s.name}</div>
                    <div className={`text-xs mt-0.5 ${sub}`}>
                      {s.annual_return}% · {s.years}J → {fmt(s.final_value)}
                    </div>
                  </button>
                  <button
                    onClick={() => handleRemove(s)}
                    className="p-2 rounded-xl text-tp-red"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
