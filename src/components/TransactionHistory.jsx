import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { fmt, fmtAmount } from '../utils/calculations'
import AddTransactionModal from './modals/AddTransactionModal'

const iconClass = (cat) => {
  if (cat === 'BUY') return 'tx-icon buy'
  if (cat === 'SELL') return 'tx-icon sell'
  return 'tx-icon custom'
}

const iconLabel = (cat) => {
  if (cat === 'BUY') return '↑'
  if (cat === 'SELL') return '↓'
  return '◆'
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function TransactionHistory() {
  const { transactions, allCategories, deleteTransaction } = useApp()
  const [filterCat, setFilterCat] = useState('ALL')
  const [filterSymbol, setFilterSymbol] = useState('ALL')
  const [editTx, setEditTx] = useState(null)

  const symbols = useMemo(() => {
    const s = new Set(transactions.map(t => t.symbol))
    return ['ALL', ...s]
  }, [transactions])

  const filtered = useMemo(() => {
    return [...transactions]
      .filter(t => filterCat === 'ALL' || t.category === filterCat)
      .filter(t => filterSymbol === 'ALL' || t.symbol === filterSymbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [transactions, filterCat, filterSymbol])

  if (transactions.length === 0) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Sin transacciones</div>
          <div className="empty-state-text">Tus operaciones aparecerán aquí</div>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
        <div className="tabs">
          <button className={`tab ${filterCat === 'ALL' ? 'active' : ''}`} onClick={() => setFilterCat('ALL')}>
            Todas
          </button>
          {['BUY', 'SELL', ...allCategories.filter(c => c !== 'BUY' && c !== 'SELL')].map(cat => (
            <button
              key={cat}
              className={`tab ${filterCat === cat ? 'active' : ''}`}
              onClick={() => setFilterCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        {symbols.length > 2 && (
          <div className="tabs">
            {symbols.map(s => (
              <button
                key={s}
                className={`tab ${filterSymbol === s ? 'active' : ''}`}
                onClick={() => setFilterSymbol(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px' }}>
          <div className="empty-state-text">Sin resultados para este filtro</div>
        </div>
      ) : (
        <div className="tx-list">
          {filtered.map(tx => (
            <div key={tx.id} className="tx-item" onClick={() => setEditTx(tx)}>
              <div className={iconClass(tx.category)}>{iconLabel(tx.category)}</div>
              <div className="tx-info">
                <div className="tx-main">
                  <span className="tx-symbol">{tx.symbol}</span>
                  <span className="tx-amount">{fmt(tx.totalUSD)}</span>
                </div>
                <div className="tx-sub">
                  <span className="tx-date">{fmtDate(tx.date)} · {tx.category}</span>
                  <span className="tx-total">{fmtAmount(tx.amount)} @ {fmt(tx.priceUSD, tx.priceUSD < 1 ? 4 : 2)}</span>
                </div>
                {tx.notes && (
                  <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {tx.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editTx && (
        <AddTransactionModal
          editTx={editTx}
          onClose={() => setEditTx(null)}
          onDelete={(id) => { deleteTransaction(id); setEditTx(null) }}
        />
      )}
    </div>
  )
}
