import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { buildPortfolio, buildTotals, fmt, fmtPct } from '../utils/calculations'
import CryptoCard from './CryptoCard'
import AddTransactionModal from './modals/AddTransactionModal'

export default function Dashboard() {
  const { transactions, prices } = useApp()
  const [showAddForCrypto, setShowAddForCrypto] = useState(null)

  const portfolio = useMemo(() => buildPortfolio(transactions, prices), [transactions, prices])
  const totals = useMemo(() => buildTotals(portfolio), [portfolio])

  if (portfolio.length === 0) {
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

  return (
    <div className="main-content">
      <PortfolioContent
        portfolio={portfolio}
        totals={totals}
        onCardClick={setShowAddForCrypto}
      />
      {showAddForCrypto && (
        <AddTransactionModal
          prefill={showAddForCrypto}
          onClose={() => setShowAddForCrypto(null)}
        />
      )}
    </div>
  )
}

function PortfolioContent({ portfolio, totals, onCardClick }) {
  const totalPnlClass = totals.totalPnL >= 0 ? 'pnl-chip pos' : 'pnl-chip neg'
  const sorted = [...portfolio].sort((a, b) => b.currentValue - a.currentValue)

  return (
    <>
      <div className="portfolio-summary">
        <div className="total-label">Valor total del portafolio</div>
        <div className="total-value">{fmt(totals.totalCurrentValue)}</div>
        <div className="pnl-row">
          <div className={totalPnlClass}>
            {fmtPct(totals.totalPct)} · {fmt(totals.totalPnL)}
          </div>
          <div className="pnl-chip neu" style={{ fontSize: '.76rem' }}>
            Invertido {fmt(totals.totalInvested)}
          </div>
        </div>
      </div>
      <div className="crypto-grid">
        {sorted.map(entry => (
          <CryptoCard
            key={entry.cryptoId}
            entry={entry}
            onClick={() => onCardClick({ cryptoId: entry.cryptoId, symbol: entry.symbol, name: entry.name })}
          />
        ))}
      </div>
    </>
  )
}
