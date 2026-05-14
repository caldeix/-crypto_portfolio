import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { fmt, fmtAmount } from '../utils/calculations'
import AddTransactionModal from './modals/AddTransactionModal'

const PAGE = 30

const iconClass = (cat) => {
  if (cat === 'BUY') return 'tx-icon buy'
  if (cat === 'SELL') return 'tx-icon sell'
  return 'tx-icon custom'
}

const iconLabel = (cat) => {
  if (cat === 'BUY') return '↑'
  if (cat === 'SELL') return '↓'
  if (cat === 'LIQUIDEZ') return '💵'
  return '◆'
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function TransactionHistory() {
  const { transactions, allCategories, deleteTransaction, hideValues } = useApp()
  const [filterCat, setFilterCat] = useState('ALL')
  const [filterSymbol, setFilterSymbol] = useState('ALL')
  const [showSymbols, setShowSymbols] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE)
  const sentinelRef = useRef(null)

  const symbols = useMemo(() => {
    const s = [...new Set(transactions.map(t => t.symbol))].sort()
    return s
  }, [transactions])

  const filtered = useMemo(() => {
    return [...transactions]
      .filter(t => filterCat === 'ALL' || t.category === filterCat)
      .filter(t => filterSymbol === 'ALL' || t.symbol === filterSymbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [transactions, filterCat, filterSymbol])

  // Reset page when filters change
  useEffect(() => { setVisibleCount(PAGE) }, [filterCat, filterSymbol])

  // Infinite scroll via IntersectionObserver
  const observerCb = useCallback(entries => {
    if (entries[0].isIntersecting) setVisibleCount(c => c + PAGE)
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(observerCb, { rootMargin: '100px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered, observerCb])

  const mv = (v) => hideValues ? '••••' : v

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

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="main-content">
      {/* Category tabs */}
      <div className="tabs" style={{ marginBottom: '8px' }}>
        <button className={`tab ${filterCat === 'ALL' ? 'active' : ''}`} onClick={() => setFilterCat('ALL')}>
          Todas
        </button>
        {['BUY', 'SELL', ...allCategories.filter(c => c !== 'BUY' && c !== 'SELL')].map(cat => (
          <button key={cat} className={`tab ${filterCat === cat ? 'active' : ''}`} onClick={() => setFilterCat(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* Symbol filter — collapsible */}
      <div style={{ marginBottom: '10px' }}>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'space-between', fontSize: '.82rem' }}
          onClick={() => setShowSymbols(s => !s)}
        >
          <span>🪙 {filterSymbol === 'ALL' ? 'Todas las cryptos' : filterSymbol}</span>
          <span>{showSymbols ? '▲' : '▼'}</span>
        </button>
        {showSymbols && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 0 4px' }}>
            <button
              className={`tab ${filterSymbol === 'ALL' ? 'active' : ''}`}
              style={{ fontSize: '.75rem', padding: '4px 10px' }}
              onClick={() => { setFilterSymbol('ALL'); setShowSymbols(false) }}
            >Todas</button>
            {symbols.map(s => (
              <button
                key={s}
                className={`tab ${filterSymbol === s ? 'active' : ''}`}
                style={{ fontSize: '.75rem', padding: '4px 10px' }}
                onClick={() => { setFilterSymbol(s); setShowSymbols(false) }}
              >{s}</button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px' }}>
          <div className="empty-state-text">Sin resultados para este filtro</div>
        </div>
      ) : (
        <>
          <div className="tx-list">
            {visible.map(tx => (
              <div key={tx.id} className="tx-item" onClick={() => setEditTx(tx)}>
                <div className={iconClass(tx.category)}>{iconLabel(tx.category)}</div>
                <div className="tx-info">
                  <div className="tx-main">
                    <span className="tx-symbol">{tx.symbol}</span>
                    <span className="tx-amount">{mv(fmt(tx.totalUSD))}</span>
                  </div>
                  <div className="tx-sub">
                    <span className="tx-date">{fmtDate(tx.date)} · {tx.category}</span>
                    <span className="tx-total">{fmtAmount(tx.amount)} @ {mv(fmt(tx.priceUSD, tx.priceUSD < 1 ? 4 : 2))}</span>
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
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Cargando…</span>
            </div>
          )}
          {visibleCount >= filtered.length && filtered.length > PAGE && (
            <div style={{ textAlign: 'center', padding: '12px', fontSize: '.75rem', color: 'var(--text-muted)' }}>
              {filtered.length} transacciones
            </div>
          )}
        </>
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
