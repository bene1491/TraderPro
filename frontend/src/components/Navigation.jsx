import { NavLink } from 'react-router-dom'
import { Home, Star, Calculator, User, PieChart } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const NAV = [
  { to: '/',            icon: Home,       label: 'Entdecken' },
  { to: '/watchlist',   icon: Star,       label: 'Watchlist' },
  { to: '/calculator',  icon: Calculator, label: 'Rechner'   },
  { to: '/portfolio',   icon: PieChart,   label: 'Portfolio' },
  { to: '/account',     icon: User,       label: 'Konto'     },
]

export default function Navigation() {
  const { dark } = useTheme()
  const base = dark
    ? 'bg-tp-card/90 border-tp-border backdrop-blur-xl'
    : 'bg-tp-card-l/90 border-tp-border-l backdrop-blur-xl'

  return (
    <nav className={`fixed bottom-0 left-0 right-0 border-t z-40 ${base}`}
      style={{ paddingBottom: 'max(0px, calc(env(safe-area-inset-bottom) - 20px))' }}
    >
      <div className="flex max-w-lg mx-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors
               ${isActive
                 ? 'text-tp-blue'
                 : dark ? 'text-tp-sub hover:text-tp-text' : 'text-tp-sub-l hover:text-tp-text-l'
               }`
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
