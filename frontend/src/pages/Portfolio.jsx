import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Sparkles, Save, Trash2, ChevronDown, ChevronUp, AlertTriangle, LogIn, TrendingUp, AlertCircle, CheckCircle, Target } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePortfolioAnalyses } from '../hooks/usePortfolioAnalyses'
import { api } from '../lib/api'

const CONSENT_KEY = 'tp_portfolio_consent'

const COLORS = ['#3b82f6','#00b15d','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6']

function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('de', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

// ── Structured Analysis View ─────────────────────────────────────────────────
function AnalysisView({ data, dark }) {
  const text = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const div  = dark ? 'border-tp-border' : 'border-tp-border-l'

  const chartData = (data.positionen || [])
    .filter(p => p.anteil > 0)
    .slice(0, 10)

  const bewertungColor = {
    'sehr gut': 'text-tp-green', 'gut': 'text-tp-green', 'solide': 'text-tp-blue',
    'ausgewogen': 'text-tp-blue', 'einseitig': 'text-yellow-400', 'risikobehaftet': 'text-tp-red',
  }[data.bewertung] ?? 'text-tp-blue'

  return (
    <div className="space-y-4">

      {/* Header card */}
      <div className={`rounded-3xl border p-5 space-y-1 ${card}`}>
        <div className={`text-xs font-medium ${sub}`}>Gesamtwert</div>
        <div className={`text-3xl font-bold tracking-tight ${text}`}>{fmt(data.gesamtwert)}</div>
        {data.bewertung && (
          <div className={`text-sm font-semibold capitalize ${bewertungColor}`}>{data.bewertung}</div>
        )}
        {data.bewertung_kurz && (
          <div className={`text-sm ${sub} pt-1`}>{data.bewertung_kurz}</div>
        )}
      </div>

      {/* Donut chart + positionen */}
      {chartData.length > 0 && (
        <div className={`rounded-3xl border p-5 ${card}`}>
          <div className={`text-sm font-semibold mb-4 ${text}`}>Aufteilung</div>
          <div className="flex gap-4 items-center">
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="anteil" cx="50%" cy="50%" innerRadius={30} outerRadius={55} strokeWidth={0}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v.toFixed(1)}%`} contentStyle={{ background: dark ? '#1c1c1e' : '#fff', border: 'none', borderRadius: 12, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {chartData.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <div className={`text-xs truncate flex-1 ${sub}`}>{p.name}</div>
                  <div className={`text-xs font-semibold shrink-0 ${text}`}>{p.anteil.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Klassen */}
      {data.klassen?.length > 0 && (
        <div className={`rounded-3xl border p-5 ${card}`}>
          <div className={`text-sm font-semibold mb-3 ${text}`}>Anlageklassen</div>
          <div className="space-y-2.5">
            {data.klassen.map((k, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className={`text-xs ${sub}`}>{k.name}</span>
                  <span className={`text-xs font-semibold ${text}`}>{k.anteil.toFixed(1)}%</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-tp-border' : 'bg-tp-border-l'}`}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(k.anteil, 100)}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stärken */}
      {data.staerken?.length > 0 && (
        <div className={`rounded-3xl border p-5 ${card}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold mb-3 ${text}`}>
            <CheckCircle size={16} className="text-tp-green" /> Stärken
          </div>
          <div className="space-y-2">
            {data.staerken.map((s, i) => (
              <div key={i} className={`text-sm ${sub} flex gap-2`}>
                <span className="text-tp-green mt-0.5 shrink-0">✓</span>{s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redundanzen */}
      {data.redundanzen?.length > 0 && (
        <div className={`rounded-3xl border p-5 ${card}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold mb-3 ${text}`}>
            <AlertCircle size={16} className="text-yellow-400" /> Redundanzen
          </div>
          <div className="space-y-3">
            {data.redundanzen.map((r, i) => (
              <div key={i} className={`pb-3 ${i < data.redundanzen.length - 1 ? `border-b ${div}` : ''}`}>
                <div className={`text-sm font-medium ${text}`}>{r.titel}</div>
                {r.ueberlappung != null && (
                  <div className="text-xs text-yellow-400 font-semibold mt-0.5">~{r.ueberlappung}% Überschneidung</div>
                )}
                <div className={`text-xs mt-1 ${sub}`}>{r.beschreibung}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimierungen */}
      {data.optimierungen?.length > 0 && (
        <div className={`rounded-3xl border p-5 ${card}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold mb-3 ${text}`}>
            <Target size={16} className="text-tp-blue" /> Optimierungspotenziale
          </div>
          <div className="space-y-2">
            {data.optimierungen.map((o, i) => (
              <div key={i} className={`text-sm ${sub} flex gap-2`}>
                <span className="text-tp-blue mt-0.5 shrink-0">→</span>{o}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fazit */}
      {data.fazit && (
        <div className={`rounded-3xl border p-5 ${card}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold mb-2 ${text}`}>
            <TrendingUp size={16} className="text-tp-blue" /> Fazit
          </div>
          <div className={`text-sm leading-relaxed ${sub}`}>{data.fazit}</div>
        </div>
      )}
    </div>
  )
}

// ── Consent Modal ────────────────────────────────────────────────────────────
function ConsentModal({ onAccept, onDecline, dark }) {
  const text = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className={`relative w-full max-w-md rounded-3xl border p-6 space-y-4 ${card}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-tp-blue/15 flex items-center justify-center">
            <Sparkles size={20} className="text-tp-blue" />
          </div>
          <h2 className={`text-lg font-bold ${text}`}>KI-Portfolio-Analyse</h2>
        </div>
        <p className={`text-sm leading-relaxed ${sub}`}>
          Um dein Portfolio zu analysieren, werden die von dir hochgeladenen Screenshots an die
          <strong className={text}> Groq AI API</strong> übermittelt. Die Bilder werden
          <strong className={text}> nicht dauerhaft gespeichert</strong> und dienen ausschließlich der einmaligen Analyse.
        </p>
        <div className={`rounded-2xl p-3 text-xs space-y-1 ${dark ? 'bg-yellow-500/10 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} /> Hinweis
          </div>
          <p>Stelle sicher, dass auf deinen Screenshots <strong>kein Name, keine Kontonummer und keine Depot-ID</strong> sichtbar sind.</p>
        </div>
        <p className={`text-xs ${sub} opacity-70`}>
          Diese Einwilligung kann jederzeit unter <strong>Konto → Portfolio-Analyse</strong> widerrufen werden.
        </p>
        <div className="flex gap-3 pt-1">
          <button onClick={onDecline} className={`flex-1 py-3 rounded-2xl border text-sm font-medium transition-colors ${dark ? 'border-tp-border text-tp-sub' : 'border-tp-border-l text-tp-sub-l'}`}>
            Ablehnen
          </button>
          <button onClick={onAccept} className="flex-1 py-3 rounded-2xl bg-tp-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Einwilligen & starten
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Saved Analysis Card ──────────────────────────────────────────────────────
function AnalysisCard({ analysis, onDelete, dark }) {
  const [expanded, setExpanded] = useState(false)
  const text = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub  = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'

  const date = new Date(analysis.created_at).toLocaleDateString('de', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  let parsed = null
  try { parsed = typeof analysis.analysis_result === 'string' ? JSON.parse(analysis.analysis_result) : analysis.analysis_result } catch {}

  return (
    <div className={`rounded-2xl border overflow-hidden ${card}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <div className={`text-sm font-semibold ${text}`}>Analyse vom {date}</div>
          {parsed?.bewertung && <div className="text-xs mt-0.5 text-tp-blue capitalize">{parsed.bewertung} · {fmt(parsed.gesamtwert)}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onDelete(analysis.id) }} className="p-1.5 rounded-xl text-tp-red hover:bg-tp-red-bg transition-colors">
            <Trash2 size={15} />
          </button>
          {expanded ? <ChevronUp size={16} className={sub} /> : <ChevronDown size={16} className={sub} />}
        </div>
      </button>
      {expanded && (
        <div className={`px-4 pb-4 border-t ${dark ? 'border-tp-border' : 'border-tp-border-l'}`}>
          <div className="pt-3">
            {parsed ? <AnalysisView data={parsed} dark={dark} /> : (
              <div className={`text-sm leading-relaxed whitespace-pre-wrap ${sub}`}>{analysis.analysis_result}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const { dark } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast    = useToast()
  const { analyses, save, remove } = usePortfolioAnalyses()

  const text  = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub   = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card  = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const input = dark
    ? 'bg-tp-border border-tp-border text-tp-text placeholder-tp-sub focus:border-tp-blue'
    : 'bg-tp-border-l border-tp-border-l text-tp-text-l placeholder-tp-sub-l focus:border-tp-blue'

  const [consent, setConsent]         = useState(() => localStorage.getItem(CONSENT_KEY) === 'true')
  const [showConsent, setShowConsent] = useState(false)
  const [images, setImages]           = useState([])
  const [previews, setPreviews]       = useState([])
  const [style, setStyle]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)   // structured JSON or null
  const [rawResult, setRawResult]     = useState(null)   // fallback text
  const [saved, setSaved]             = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) === null) setShowConsent(true)
  }, [])

  const handleAccept = () => { localStorage.setItem(CONSENT_KEY, 'true'); setConsent(true); setShowConsent(false) }
  const handleDecline = () => { localStorage.setItem(CONSENT_KEY, 'false'); setConsent(false); setShowConsent(false) }

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    const toAdd = valid.slice(0, 5 - images.length)
    setImages(prev => [...prev, ...toAdd])
    toAdd.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target.result])
      reader.readAsDataURL(f)
    })
  }

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAnalyze = async () => {
    if (!images.length) { toast('Bitte mindestens einen Screenshot hochladen.', 'error'); return }
    setLoading(true); setResult(null); setRawResult(null); setSaved(false)
    try {
      const data = await api.analyzePortfolio(images, style)
      if (data.analysis) setResult(data.analysis)
      else setRawResult(data.raw)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) { toast('Bitte zuerst anmelden um Analysen zu speichern.', 'error'); return }
    try {
      const toSave = result ? JSON.stringify(result) : rawResult
      await save(style, toSave)
      setSaved(true)
      toast('Analyse gespeichert.', 'success')
    } catch {
      toast('Speichern fehlgeschlagen.', 'error')
    }
  }

  const handleDelete = async (id) => { await remove(id); toast('Analyse gelöscht.', 'info') }

  if (!consent && !showConsent) {
    return (
      <div className="space-y-5">
        <div className="pt-2"><h1 className={`text-2xl font-bold tracking-tight ${text}`}>Portfolio-Analyse</h1></div>
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="w-14 h-14 rounded-3xl bg-tp-border flex items-center justify-center">
            <Sparkles size={28} className="text-tp-sub" />
          </div>
          <p className={`text-sm max-w-xs ${sub}`}>
            Du hast die Einwilligung abgelehnt. Aktiviere das Feature unter <strong>Konto → Portfolio-Analyse</strong>.
          </p>
          <button onClick={() => navigate('/account')} className="text-sm text-tp-blue hover:underline">Zu den Einstellungen →</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {showConsent && <ConsentModal onAccept={handleAccept} onDecline={handleDecline} dark={dark} />}

      <div className="space-y-5">
        <div className="pt-2">
          <h1 className={`text-2xl font-bold tracking-tight ${text}`}>Portfolio-Analyse</h1>
          <p className={`text-sm mt-0.5 ${sub}`}>Lass dein Depot von KI analysieren</p>
        </div>

        {/* Upload */}
        <div className={`rounded-3xl border p-5 space-y-4 ${card}`}>
          <div className={`text-sm font-semibold ${text}`}>Screenshots hochladen</div>
          <div className={`rounded-2xl p-3 text-xs flex gap-2 ${dark ? 'bg-yellow-500/10 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Kein Name, keine Kontonummer und keine Depot-ID sichtbar lassen.</span>
          </div>
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-tp-border">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                    <X size={11} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < 5 && (
            <button onClick={() => fileRef.current?.click()}
              className={`w-full py-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors
                ${dark ? 'border-tp-border hover:border-tp-blue text-tp-sub hover:text-tp-blue' : 'border-tp-border-l hover:border-tp-blue text-tp-sub-l hover:text-tp-blue'}`}>
              <Upload size={22} />
              <span className="text-sm font-medium">{images.length === 0 ? 'Screenshots auswählen' : `Weitere hinzufügen (${images.length}/5)`}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
        </div>

        {/* Style */}
        <div className={`rounded-3xl border p-5 space-y-3 ${card}`}>
          <div>
            <div className={`text-sm font-semibold ${text}`}>Dein Anlagestil <span className={`font-normal ${sub}`}>(optional)</span></div>
            <div className={`text-xs mt-0.5 ${sub}`}>Hilft der KI, Redundanzen besser einzuordnen</div>
          </div>
          <textarea value={style} onChange={e => setStyle(e.target.value)}
            placeholder="z.B. Langfristig orientiert, tech-fokussiert, möchte breit diversifizieren..."
            rows={3} className={`w-full px-4 py-3 rounded-2xl border outline-none transition-colors text-sm resize-none ${input}`} />
        </div>

        {/* Button */}
        <button onClick={handleAnalyze} disabled={loading || images.length === 0}
          className="w-full py-4 rounded-2xl bg-tp-blue text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40">
          {loading ? (
            <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Analysiere…</>
          ) : (
            <><Sparkles size={18} />Analyse starten</>
          )}
        </button>

        {/* Result */}
        {(result || rawResult) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className={`text-sm font-semibold ${text}`}>Analyse-Ergebnis</div>
              {!saved ? (
                <button onClick={handleSave} className="flex items-center gap-1.5 text-xs text-tp-blue font-medium hover:opacity-80">
                  <Save size={14} /> Speichern
                </button>
              ) : <span className="text-xs text-tp-green font-medium">Gespeichert ✓</span>}
            </div>
            {result ? <AnalysisView data={result} dark={dark} /> : (
              <div className={`rounded-3xl border p-5 text-sm leading-relaxed whitespace-pre-wrap ${card} ${sub}`}>{rawResult}</div>
            )}
          </div>
        )}

        {/* Saved */}
        {user && analyses.length > 0 && (
          <div className="space-y-3">
            <div className={`text-sm font-semibold ${text}`}>Gespeicherte Analysen</div>
            {analyses.map(a => <AnalysisCard key={a.id} analysis={a} onDelete={handleDelete} dark={dark} />)}
          </div>
        )}

        {!user && (
          <button onClick={() => navigate('/auth')}
            className={`w-full py-3 rounded-2xl border flex items-center justify-center gap-2 text-sm ${sub} ${dark ? 'border-tp-border' : 'border-tp-border-l'}`}>
            <LogIn size={16} /> Anmelden um Analysen zu speichern
          </button>
        )}
      </div>
    </>
  )
}
