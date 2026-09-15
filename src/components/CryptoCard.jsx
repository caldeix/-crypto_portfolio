import { fmt, fmtPrice, fmtPct, fmtAmount } from '../utils/calculations'
import { useApp } from '../context/AppContext'


export default function CryptoCard({ entry, onClick, onReassign, onArchive, archived }) {
  const { hideValues, cgMeta } = useApp()
  const meta            = entry.cgId ? cgMeta[entry.cgId] : null
  const thumb           = meta?.thumb
  const contractAddress = meta?.contractAddress
  const mv = (v) => hideValues ? '••••' : v
  const {
    symbol, name, cgId, amountHeld,
    currentPrice, currentValue,
    profitability, profitabilityUSD,
    avgBuy, avgSell, unrealizedPct, unrealizedUSD,
    invested, soldValue, change24h,
    status, realizedPnL, realizedPct, closedCycles,
  } = entry

  const pnlClass = profitabilityUSD >= 0 ? 'pos' : 'neg'
  const c24Class = change24h >= 0 ? 'pos' : 'neg'

  // A position whose cycles have all closed has no cost basis left, so the
  // normal 10-stat grid would read "Avg Compra —, Invertido $0.00, Rent +0.00%"
  // and look like a bug. Show the realized result instead.
  const isClosed    = status === 'closed'
  const realClass   = realizedPnL >= 0 ? 'pos' : 'neg'
  const lastCycle   = closedCycles && closedCycles.length ? closedCycles[closedCycles.length - 1] : null
  const closedOn    = lastCycle
    ? new Date(lastCycle.end).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    : '—'

  return (
    <div className="crypto-card" onClick={onClick}>
      <div className="crypto-card-header">
        <div className="crypto-card-symbol">
          <div className="crypto-avatar">
            {thumb
              ? <img src={thumb} alt={symbol} width={36} height={36} style={{ borderRadius: '50%', display: 'block' }} />
              : symbol.slice(0, 3)
            }
          </div>
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
          {isClosed ? (
            <div className="crypto-card-change" style={{ color: 'var(--text-dim)' }}>cerrada</div>
          ) : (
            <div className={`crypto-card-change ${c24Class}`}>
              {change24h >= 0 ? '▲' : '▼'} {Math.abs(change24h).toFixed(2)}% 24h
            </div>
          )}
        </div>
      </div>
      {isClosed ? (
        <div className="crypto-card-stats">
          <div className="stat">
            <span className="stat-label">Realizado</span>
            <span className={`stat-value ${realClass}`}>{mv(fmt(realizedPnL))}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Rent. realiz.</span>
            <span className={`stat-value ${realClass}`}>{mv(fmtPct(realizedPct))}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Cerrada</span>
            <span className="stat-value">{closedOn}</span>
          </div>
        </div>
      ) : (
      <div className="crypto-card-stats">
        {/* Row 1 */}
        <div className="stat">
          <span className="stat-label">Cantidad</span>
          <span className="stat-value">{fmtAmount(amountHeld)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Avg Compra</span>
          <span className="stat-value">{mv(avgBuy > 0 ? fmtPrice(avgBuy) : '—')}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Precio act.</span>
          <span className="stat-value">{mv(currentPrice > 0 ? fmtPrice(currentPrice) : '—')}</span>
        </div>
        {/* Row 2 */}
        <div className="stat">
          <span className="stat-label">Invertido</span>
          <span className="stat-value">{mv(fmt(invested))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Avg Venta</span>
          <span className="stat-value">{mv(avgSell > 0 ? fmtPrice(avgSell) : '—')}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Vendido</span>
          <span className="stat-value">{mv(soldValue > 0 ? fmt(soldValue) : '—')}</span>
        </div>
        {/* Row 3 */}
        <div className="stat">
          <span className="stat-label">P&L total</span>
          <span className={`stat-value ${pnlClass}`}>{mv(fmt(profitabilityUSD))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">P&L posición</span>
          <span className={`stat-value ${unrealizedUSD >= 0 ? 'pos' : 'neg'}`}>{mv(fmt(unrealizedUSD))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">vs Avg</span>
          <span className={`stat-value ${unrealizedPct === null ? '' : unrealizedPct >= 0 ? 'pos' : 'neg'}`}>
            {unrealizedPct === null ? '—' : mv(fmtPct(unrealizedPct))}
          </span>
        </div>
        {/* Row 4 — Rent col3 only */}
        <div className="stat stat-rent">
          <span className="stat-label">Rent.</span>
          <span className={`stat-value ${pnlClass}`}>{mv(fmtPct(profitability))}</span>
        </div>
      </div>
      )}
    </div>
  )
}
