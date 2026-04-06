import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun, User, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const CONSENT_KEY = 'tp_portfolio_consent'

export default function Account() {
  const { user, signOut } = useAuth()
  const { dark, toggle }  = useTheme()
  const navigate = useNavigate()
  const [portfolioConsent, setPortfolioConsent] = useState(
    () => localStorage.getItem(CONSENT_KEY) === 'true'
  )

  const toggleConsent = () => {
    const next = !portfolioConsent
    localStorage.setItem(CONSENT_KEY, String(next))
    setPortfolioConsent(next)
  }

  const text  = dark ? 'text-tp-text'  : 'text-tp-text-l'
  const sub   = dark ? 'text-tp-sub'   : 'text-tp-sub-l'
  const card  = dark ? 'bg-tp-card border-tp-border' : 'bg-tp-card-l border-tp-border-l'
  const row   = dark ? 'hov-dark' : 'hov-light'

  if (!user) {
    return (
      <div className="space-y-5">
        <h1 className={`text-2xl font-bold tracking-tight pt-2 ${text}`}>Konto</h1>
        <div className={`rounded-2xl border p-5 text-center space-y-3 ${card}`}>
          <User size={40} className="mx-auto text-tp-sub opacity-40" />
          <p className={`text-sm ${sub}`}>Nicht angemeldet</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-2.5 rounded-2xl bg-tp-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Anmelden
          </button>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="space-y-5">
      <h1 className={`text-2xl font-bold tracking-tight pt-2 ${text}`}>Konto</h1>

      {/* Profile */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${card}`}>
        <div className="w-12 h-12 rounded-full bg-tp-blue/20 flex items-center justify-center">
          <User size={24} className="text-tp-blue" />
        </div>
        <div>
          <div className={`font-semibold text-sm ${text}`}>{user.email}</div>
          <div className="text-xs text-tp-sub mt-0.5">Aktiv</div>
        </div>
      </div>

      {/* Settings */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <button
          onClick={toggle}
          className={`w-full flex items-center justify-between px-5 py-4 text-sm transition-colors ${row}`}
        >
          <span className={`flex items-center gap-3 font-medium ${text}`}>
            {dark ? <Moon size={16} /> : <Sun size={16} />}
            {dark ? 'Dark Mode' : 'Light Mode'}
          </span>
          <span className="text-tp-sub text-xs">{dark ? 'An' : 'Aus'}</span>
        </button>
        <div className={`border-t ${dark ? 'border-tp-border' : 'border-tp-border-l'}`} />
        <button
          onClick={toggleConsent}
          className={`w-full flex items-center justify-between px-5 py-4 text-sm transition-colors ${row}`}
        >
          <span className={`flex items-center gap-3 font-medium ${text}`}>
            <Sparkles size={16} />
            Portfolio-Analyse (KI)
          </span>
          <span className={`text-xs ${portfolioConsent ? 'text-tp-green' : 'text-tp-sub'}`}>
            {portfolioConsent ? 'Eingewilligt' : 'Nicht eingewilligt'}
          </span>
        </button>
        <div className={`border-t ${dark ? 'border-tp-border' : 'border-tp-border-l'}`} />
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-5 py-4 text-sm text-tp-red transition-colors ${row}`}
        >
          <LogOut size={16} />
          <span className="font-medium">Abmelden</span>
        </button>
      </div>

      <p className="text-xs text-center text-tp-muted pb-4">TraderPro v1.0</p>
    </div>
  )
}
