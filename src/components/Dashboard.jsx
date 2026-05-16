import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { buildPortfolio, buildTotals, fmt, fmtPct } from '../utils/calculations'
import CryptoCard from './CryptoCard'
import SearchCryptoModal from './modals/SearchCryptoModal'
import GlobalSearchScreen from './GlobalSearchScreen'

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

export default function Dashboard({ onOpenDetail }) {
  const { transactions, prices, reassignCgId, archivedSymbols, archiveSymbol, unarchiveSymbol, hideValues, toggleHideValues } = useApp()
  const [reassignTarget, setReassignTarget]     = useState(null)
  const [showArchived, setShowArchived]         = useState(false)
  const [sortBy, setSortBy]                     = useState('value-desc')
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [hiddenChips, setHiddenChips] = useState(new Set())

  const toggleChip = (key) => setHiddenChips(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const mvChip = (v, key) => (hideValues || hiddenChips.has(key)) ? '••••' : v

  const portfolio = useMemo(() => buildPortfolio(transactions, prices), [transactions, prices])
  const active    = useMemo(() => portfolio.filter(e => !archivedSymbols.includes(e.symbol)), [portfolio, archivedSymbols])
  const archived  = useMemo(() => portfolio.filter(e =>  archivedSymbols.includes(e.symbol)), [portfolio, archivedSymbols])
  const totals    = useMemo(() => buildTotals(active, transactions), [active, transactions])

  const total24hUSD = active.reduce((s, e) => s + (e.currentValue * (e.change24h / 100)), 0)
  const total24hPct = totals.totalCurrentValue > 0 ? total24hUSD / totals.totalCurrentValue : 0

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
          <div className="total-value" style={{ margin: 0 }}>{mv(fmt(totals.totalCurrentValue))}</div>
          <button
            className="btn-icon"
            style={{ fontSize: '1rem', opacity: 0.65, padding: '4px 6px', flexShrink: 0 }}
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            onClick={toggleHideValues}
          >{hideValues ? '🙈' : '👁️'}</button>
        </div>

        <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Invertido {mv(fmt(totals.totalNetInvested))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
          {totals.totalCurrentValue > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Hoy</span>
              <span className={`pnl-chip ${total24hUSD >= 0 ? 'pos' : 'neg'}`} style={{ fontSize: '.74rem' }}>
                {mv(`${total24hUSD >= 0 ? '+' : ''}${fmt(total24hUSD)}`)} ({mv(fmtPct(total24hPct))})
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Total</span>
            <span className={totals.totalPnL >= 0 ? 'pnl-chip pos' : 'pnl-chip neg'} style={{ fontSize: '.74rem' }}>
              {mv(`${totals.totalPnL >= 0 ? '+' : ''}${fmt(totals.totalPnL)}`)} ({mv(fmtPct(totals.totalPct))})
            </span>
          </div>
          {totals.totalLiquidez !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Liquidez</span>
              <span
                className={totals.totalLiquidez >= 0 ? 'pnl-chip pos' : 'pnl-chip neg'}
                style={{ fontSize: '.74rem', cursor: 'pointer', userSelect: 'none', opacity: hiddenChips.has('LIQUIDEZ') && !hideValues ? 0.6 : 1 }}
                title={`Pulsa para ${hiddenChips.has('LIQUIDEZ') ? 'mostrar' : 'ocultar'}`}
                onClick={() => toggleChip('LIQUIDEZ')}
              >
                💵 {mvChip(fmt(totals.totalLiquidez), 'LIQUIDEZ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sort bar + global search */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 0 4px', marginBottom: '4px', alignItems: 'center' }}>
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
        <button
          onClick={() => setShowGlobalSearch(true)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: '20px',
            color: 'var(--text-dim)', fontSize: '.74rem', cursor: 'text',
            minWidth: 0,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Buscar…</span>
        </button>
      </div>

      {/* Active grid */}
      <div className="crypto-grid">
        {[...active].sort(sortFn(sortBy)).map(entry => (
          <CryptoCard
            key={entry.cgId || entry.symbol}
            entry={entry}
            onClick={() => onOpenDetail && onOpenDetail(entry)}
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
                  onClick={() => onOpenDetail && onOpenDetail(entry)}
                  onReassign={() => setReassignTarget({ symbol: entry.symbol })}
                  onArchive={() => unarchiveSymbol(entry.symbol)}
                  archived
                />
              ))}
            </div>
          )}
        </div>
      )}

      {reassignTarget && (
        <SearchCryptoModal
          onSelect={crypto => {
            reassignCgId(reassignTarget.symbol, crypto.cgId, crypto.name, crypto.thumb)
            setReassignTarget(null)
          }}
          onClose={() => setReassignTarget(null)}
        />
      )}

      {showGlobalSearch && (
        <GlobalSearchScreen
          onSelect={crypto => {
            setShowGlobalSearch(false)
            if (onOpenDetail) onOpenDetail({
              cgId: crypto.cgId,
              symbol: crypto.symbol,
              name: crypto.name,
              currentPrice: 0,
              change24h: 0,
              currentValue: 0,
              invested: 0,
              profitabilityUSD: 0,
              profitability: 0,
              amountHeld: 0,
              avgBuy: 0,
            })
          }}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}
    </div>
  )
}
