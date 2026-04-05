import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home       from './pages/Home'
import Asset      from './pages/Asset'
import Watchlist  from './pages/Watchlist'
import Auth       from './pages/Auth'
import Account    from './pages/Account'
import Calculator from './pages/Calculator'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"             element={<Home />} />
        <Route path="/asset/:symbol" element={<Asset />} />
        <Route path="/watchlist"    element={<Watchlist />} />
        <Route path="/calculator"   element={<Calculator />} />
        <Route path="/auth"         element={<Auth />} />
        <Route path="/account"      element={<Account />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
