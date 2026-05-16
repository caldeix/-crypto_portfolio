import { useState } from 'react'
import StatusBanner from './components/StatusBanner'
import Dashboard from './components/Dashboard'
import TransactionHistory from './components/TransactionHistory'
import Stats from './components/Stats'
import CryptoDetail from './components/CryptoDetail'
import AddTransactionModal from './components/modals/AddTransactionModal'
import ConfigModal from './components/modals/ConfigModal'

const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconStats = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
)

export default function App() {
  const [tab, setTab] = useState('home')
  const [showAdd, setShowAdd] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [detailEntry, setDetailEntry] = useState(null)

  if (detailEntry) {
    return <CryptoDetail entry={detailEntry} onClose={() => setDetailEntry(null)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <StatusBanner />

      <main style={{ flex: 1 }}>
        {tab === 'home'    && <Dashboard onOpenDetail={setDetailEntry} />}
        {tab === 'stats'   && <Stats />}
        {tab === 'history' && <TransactionHistory />}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-item ${tab === 'home' ? 'active' : ''}`}
          onClick={() => setTab('home')}
        >
          <IconHome />
          Dashboard
        </button>

        <button
          className={`nav-item ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => setTab('stats')}
        >
          <IconStats />
          Stats
        </button>

        <button className="nav-fab" onClick={() => setShowAdd(true)} aria-label="Añadir transacción">
          <div className="nav-fab-inner">
            <IconPlus />
          </div>
        </button>

        <button
          className={`nav-item ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          <IconList />
          Historial
        </button>

        <button
          className="nav-item"
          onClick={() => setShowConfig(true)}
        >
          <IconSettings />
          Ajustes
        </button>
      </nav>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} />}
      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
    </div>
  )
}
