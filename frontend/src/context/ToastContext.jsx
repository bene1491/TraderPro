import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: CheckCircle, bg: 'bg-tp-green',  text: 'text-white' },
  error:   { icon: AlertCircle, bg: 'bg-tp-red',    text: 'text-white' },
  info:    { icon: Info,        bg: 'bg-[#1c1c1e]', text: 'text-white' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info', duration = 1800) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-2), { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toasts float above the nav bar */}
      <div
        className="fixed left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
      >
        {toasts.map(t => {
          const { icon: Icon, bg, text } = STYLES[t.type] ?? STYLES.info
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5
                rounded-full px-4 py-2.5 shadow-2xl text-sm font-medium
                animate-slide-up ${bg} ${text}`}
            >
              <Icon size={15} className="shrink-0" />
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
