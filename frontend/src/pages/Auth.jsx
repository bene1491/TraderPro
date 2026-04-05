import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Auth() {
  const { dark }     = useTheme()
  const { signIn, signUp } = useAuth()
  const navigate     = useNavigate()

  const [mode,     setMode]     = useState('signin') // 'signin' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const text  = dark ? 'text-tp-text'   : 'text-tp-text-l'
  const sub   = dark ? 'text-tp-sub'    : 'text-tp-sub-l'
  const input = dark
    ? 'bg-tp-border border-tp-border text-tp-text placeholder-tp-sub focus:border-tp-blue'
    : 'bg-tp-border-l border-tp-border-l text-tp-text-l placeholder-tp-sub-l focus:border-tp-blue'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email, password)
        if (err) throw err
        navigate('/watchlist')
      } else {
        const { data, error: err } = await signUp(email, password)
        if (err) throw err
        if (data?.session) {
          // email confirmation disabled → direkt einloggen
          navigate('/watchlist')
        } else {
          // email confirmation enabled → auf Bestätigungsmail warten
          // setSuccess('Bestätigungs-E-Mail wurde gesendet. Bitte überprüfe dein Postfach.')
          navigate('/watchlist')
        }
      }
    } catch (err) {
      setError(err.message ?? 'Ein Fehler ist aufgetreten.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center">
      <div className="space-y-6">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${text}`}>
            {mode === 'signin' ? 'Willkommen zurück' : 'Konto erstellen'}
          </h1>
          <p className={`text-sm mt-2 ${sub}`}>
            {mode === 'signin'
              ? 'Melde dich an, um deine Watchlist zu öffnen.'
              : 'Erstelle ein Konto für deine persönliche Watchlist.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={`w-full px-4 py-3 rounded-2xl border outline-none transition-colors text-sm ${input}`}
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className={`w-full px-4 py-3 rounded-2xl border outline-none transition-colors text-sm ${input}`}
          />

          {error && (
            <div className="text-sm text-tp-red bg-tp-red-bg px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-tp-green bg-tp-green-bg px-4 py-3 rounded-2xl">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-tp-blue text-white text-sm font-semibold
              hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '…' : mode === 'signin' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        <p className={`text-sm text-center ${sub}`}>
          {mode === 'signin' ? 'Noch kein Konto?' : 'Bereits registriert?'}{' '}
          <button
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
            className="text-tp-blue font-medium hover:underline"
          >
            {mode === 'signin' ? 'Registrieren' : 'Anmelden'}
          </button>
        </p>
      </div>
    </div>
  )
}
