import { fmt, fmtPct, fmtAmount } from '../utils/calculations'
import { useApp } from '../context/AppContext'

export default function CryptoCard({ entry, onClick, onReassign, onArchive, archived }) {
  const { hideValues } = useApp()
  const mv = (v) => hideValues ? '••••' : v
  const {
    symbol, name, amountHeld,
    currentPrice, currentValue,
    profitability, profitabilityUSD,
    invested, soldValue, change24h,
  } = entry

  const pnlClass = profitabilityUSD >= 0 ? 'pos' : 'neg'
  const c24Class = change24h >= 0 ? 'pos' : 'neg'

  return (
    <div className="crypto-card" onClick={onClick}>
      <div className="crypto-card-header">
        <div className="crypto-card-symbol">
          <div className="crypto-avatar">{symbol.slice(0, 3)}</div>
          <div>
            <div className="crypto-card-symbol-text">{symbol}</div>
            <div className="crypto-card-name">{name}</div>
          </div>
        </div>
        <div className="crypto-card-value">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div className="crypto-card-price">{mv(fmt(currentValue))}</div>
            <button
              className="btn-icon"
              style={{ fontSize: '.8rem', opacity: 0.5, padding: '4px', minWidth: '26px', minHeight: '26px' }}
              title="Reasignar moneda CoinGecko"
              onClick={e => { e.stopPropagation(); onReassign() }}
            >🔗</button>
            <button
              className="btn-icon"
              style={{ fontSize: '.8rem', opacity: 0.5, padding: '4px', minWidth: '26px', minHeight: '26px' }}
              title={archived ? 'Desarchivar' : 'Archivar'}
              onClick={e => { e.stopPropagation(); onArchive() }}
            >{archived ? '📤' : '🗄️'}</button>
          </div>
          <div className={`crypto-card-change ${c24Class}`}>
            {change24h >= 0 ? '▲' : '▼'} {Math.abs(change24h).toFixed(2)}% 24h
          </div>
        </div>
      </div>
      <div className="crypto-card-stats">
        <div className="stat">
          <span className="stat-label">Cantidad</span>
          <span className="stat-value">{fmtAmount(amountHeld)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Precio</span>
          <span className="stat-value">{mv(fmt(currentPrice, currentPrice < 1 ? 4 : 2))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Rent.</span>
          <span className={`stat-value ${pnlClass}`}>{mv(fmtPct(profitability))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Invertido</span>
          <span className="stat-value">{mv(fmt(invested))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Vendido</span>
          <span className="stat-value">{mv(fmt(soldValue))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">P&L</span>
          <span className={`stat-value ${pnlClass}`}>{mv(fmt(profitabilityUSD))}</span>
        </div>
      </div>
    </div>
  )
}
