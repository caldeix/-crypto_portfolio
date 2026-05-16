import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { buildPortfolio, buildTotals, fmt, fmtPct } from '../utils/calculations'
import CryptoCard from './CryptoCard'
import AddTransactionModal from './modals/AddTransactionModal'
import SearchCryptoModal from './modals/SearchCryptoModal'

const SORT_KEYS = [
  { key: 'value', label: 'Valor' },
  { key: 'pct',   label: 'Rent.' },
  { key: 'pnl',   label: 'P&L'   },
]

const sortFn = (key) => {
  switch (key) {
    case 'value-desc': return (a, b) => b.currentValue - a.currentValue
    case 'value-asc':  return (a, b) => a.currentValue - b.currentValue
    case 'pct-desc':   return (a, b) => b.profitability - a.profitability
    case 'pct-asc':    return (a, b) => a.profitability - b.profitability
    case 'pnl-desc':   return (a, b) => b.profitabilityUSD - a.profitabilityUSD
    case 'pnl-asc':    return (a, b) => a.profitabilityUSD - b.profitabilityUSD
    default:           return (a, b) => b.currentValue - a.currentValue
  }
}

export default function Dashboard() {
  const { transactions, prices, reassignCgId, archivedSymbols, archiveSymbol, unarchiveSymbol, hideValues, toggleHideValues } = useApp()
  const [showAddForCrypto, setShowAddForCrypto] = useState(null)
  const [reassignTarget, setReassignTarget] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [sortBy, setSortBy] = useState('value-desc')
  const [hiddenChips, setHiddenChips] = useState(new Set())

  const toggleChip = (key) => setHiddenChips(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  // mv global (para total y cartera), mvChip respeta también el toggle individual
  const mvChip = (v, key) => (hideValues || hiddenChips.has(key)) ? '••••' : v

  const portfolio = useMemo(() => buildPortfolio(transactions, prices), [transactions, prices])
  const active    = useMemo(() => portfolio.filter(e => !archivedSymbols.includes(e.symbol)), [portfolio, archivedSymbols])
  const archived  = useMemo(() => portfolio.filter(e =>  archivedSymbols.includes(e.symbol)), [portfolio, archivedSymbols])
  const totals    = useMemo(() => buildTotals(active, transactions), [active, transactions])

  if (active.length === 0 && archived.length === 0) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Sin activos aún</div>
          <div className="empty-state-text">Añade tu primera transacción pulsando el botón +</div>
        </div>
      </div>
    )
  }

  const mv = (v) => hideValues ? '••••' : v

  return (
    <div className="main-content">
      {/* Summary */}
      <div className="portfolio-summary">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="total-label">Valor total del portafolio</div>
          <button
            className="btn-icon"
            style={{ fontSize: '1rem', opacity: 0.65, padding: '4px 6px' }}
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            onClick={toggleHideValues}
          >{hideValues ? '🙈' : '👁️'}</button>
        </div>
        <div className="total-value">{mv(fmt(totals.totalCurrentValue))}</div>
        <div className="pnl-row">
          <div className={totals.totalPct >= 0 ? 'pnl-chip pos' : 'pnl-chip neg'}>
            {mv(fmtPct(totals.totalPct))}
          </div>
          <div className={totals.totalPnL >= 0 ? 'pnl-chip pos' : 'pnl-chip neg'}>
            {mv(fmt(totals.totalPnL))}
          </div>
          <div className="pnl-chip neu" style={{ fontSize: '.76rem' }}>
            Invertido {mv(fmt(totals.totalNetInvested))}
          </div>
          {totals.totalLiquidez !== 0 && (
            <div
              className={totals.totalLiquidez >= 0 ? 'pnl-chip pos' : 'pnl-chip neg'}
              style={{ fontSize: '.74rem', cursor: 'pointer', userSelect: 'none', opacity: hiddenChips.has('LIQUIDEZ') && !hideValues ? 0.6 : 1 }}
              title={`Pulsa para ${hiddenChips.has('LIQUIDEZ') ? 'mostrar' : 'ocultar'} — Saldo de caja disponible`}
              onClick={() => toggleChip('LIQUIDEZ')}
            >
              💵 Liquidez {mvChip(fmt(totals.totalLiquidez), 'LIQUIDEZ')}
            </div>
          )}
        </div>
      </div>

      {/* Sort bar — toggle */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 0 4px', marginBottom: '4px' }}>
        {SORT_KEYS.map(({ key, label }) => {
          const [activeKey, activeDir] = sortBy.split('-')
          const isActive = activeKey === key
          const dir = isActive ? activeDir : 'desc'
          const arrow = isActive ? (dir === 'desc' ? ' ↓' : ' ↑') : ''
          return (
            <button
              key={key}
              className={`tab ${isActive ? 'active' : ''}`}
              style={{ flexShrink: 0, fontSize: '.74rem', padding: '4px 12px' }}
              onClick={() => setSortBy(isActive ? `${key}-${dir === 'desc' ? 'asc' : 'desc'}` : `${key}-desc`)}
            >{label}{arrow}</button>
          )
        })}
      </div>

      {/* Active grid */}
      <div className="crypto-grid">
        {[...active].sort(sortFn(sortBy)).map(entry => (
          <CryptoCard
            key={entry.cgId || entry.symbol}
            entry={entry}
            onClick={() => setShowAddForCrypto({ cryptoId: entry.cryptoId, cgId: entry.cgId, symbol: entry.symbol, name: entry.name })}
            onReassign={() => setReassignTarget({ symbol: entry.symbol })}
            onArchive={() => archiveSymbol(entry.symbol)}
          />
        ))}
      </div>

      {/* Archived section */}
      {archived.length > 0 && (
        <div style={{ margin: '8px 0 0' }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'space-between', fontSize: '.82rem', opacity: 0.7 }}
            onClick={() => setShowArchived(s => !s)}
          >
            <span>🗄️ Archivadas ({archived.length})</span>
            <span>{showArchived ? '▲' : '▼'}</span>
          </button>
          {showArchived && (
            <div className="crypto-grid" style={{ marginTop: '8px' }}>
              {[...archived].sort(sortFn(sortBy)).map(entry => (
                <CryptoCard
                  key={entry.cgId || entry.symbol}
                  entry={entry}
                  onClick={() => setShowAddForCrypto({ cryptoId: entry.cryptoId, cgId: entry.cgId, symbol: entry.symbol, name: entry.name })}
                  onReassign={() => setReassignTarget({ symbol: entry.symbol })}
                  onArchive={() => unarchiveSymbol(entry.symbol)}
                  archived
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showAddForCrypto && (
        <AddTransactionModal
          prefill={showAddForCrypto}
          onClose={() => setShowAddForCrypto(null)}
        />
      )}
      {reassignTarget && (
        <SearchCryptoModal
          onSelect={crypto => {
            reassignCgId(reassignTarget.symbol, crypto.cgId, crypto.name)
            setReassignTarget(null)
          }}
          onClose={() => setReassignTarget(null)}
        />
      )}
    </div>
  )
}
