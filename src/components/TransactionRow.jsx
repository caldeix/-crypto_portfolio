import { fmt, fmtAmount } from '../utils/calculations'

export const iconClass = (cat) => {
  if (cat === 'BUY') return 'tx-icon buy'
  if (cat === 'SELL') return 'tx-icon sell'
  return 'tx-icon custom'
}

export const iconLabel = (cat) => {
  if (cat === 'BUY') return '↑'
  if (cat === 'SELL') return '↓'
  if (cat === 'LIQUIDEZ') return '💵'
  return '◆'
}

export const fmtDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
}

// Shared by the Historial screen and the per-coin list inside CryptoDetail.
// `leftLabel` defaults to the symbol, which is what the global history needs;
// the coin detail passes the category instead, since inside one coin's page the
// symbol is the same on every row. When a leftLabel is given the sub-line drops
// its trailing category so it is not printed twice.
// `muted` dims rows that belong to a closed cycle.
export default function TransactionRow({ tx, onClick, hideValues, leftLabel, muted = false }) {
  const mv = (v) => hideValues ? '••••' : v

  return (
    <div
      className="tx-item"
      onClick={onClick}
      style={muted ? { opacity: 0.6 } : undefined}
    >
      <div className={iconClass(tx.category)}>{iconLabel(tx.category)}</div>
      <div className="tx-info">
        <div className="tx-main">
          <span className="tx-symbol">{leftLabel || tx.symbol}</span>
          <span className="tx-amount">{mv(fmt(tx.totalUSD))}</span>
        </div>
        <div className="tx-sub">
          <span className="tx-date">{fmtDate(tx.date)}{leftLabel ? '' : ` · ${tx.category}`}</span>
          <span className="tx-total">{fmtAmount(tx.amount)} @ {mv(fmt(tx.priceUSD, tx.priceUSD < 1 ? 4 : 2))}</span>
        </div>
        {tx.notes && (
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {tx.notes}
          </div>
        )}
      </div>
    </div>
  )
}
