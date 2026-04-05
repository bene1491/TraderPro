import { useState, useEffect } from 'react'
import Navigation from './Navigation'
import { useTheme } from '../context/ThemeContext'

export default function Layout({ children }) {
  const { dark } = useTheme()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solidBg = dark ? '#111111' : '#f2f2f7'

  return (
    <div className={`min-h-screen transition-colors ${dark ? 'bg-tp-bg' : 'bg-tp-bg-l'}`}>

      {/* Solid status-bar cover — always visible */}
      <div
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: 'env(safe-area-inset-top)', background: solidBg }}
      />

      {/* Scroll-fade gradient — only visible once page scrolls */}
      <div
        className="fixed top-0 left-0 right-0 z-40 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: scrolled ? 1 : 0,
          height: `calc(env(safe-area-inset-top) + 52px)`,
          background: `linear-gradient(to bottom,
            ${solidBg} env(safe-area-inset-top),
            ${solidBg}cc calc(env(safe-area-inset-top) + 20px),
            ${solidBg}00 100%)`,
        }}
      />

      <main
        className="max-w-lg mx-auto px-4 pb-28"
        style={{ paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top) + 0.75rem))' }}
      >
        {children}
      </main>
      <Navigation />
    </div>
  )
}
