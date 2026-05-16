import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { buildPortfolio, buildTotals, fmt, fmtPct } from '../utils/calculations'

function StatBar({ label, left, right, hideValues }) {
  const mv = (v) => hideValues ? '••••' : v
  const leftW  = Math.max(0, Math.min(100, left.pct  * 100))
  const rightW = 100 - leftW

  return (
    <div className="stat-row">
      <div className="stat-row-label">{label}</div>
      <div className="stat-bar">
        <div className="stat-bar-left"  style={{ width: `${leftW}%`  }} />
        <div className="stat-bar-right" style={{ width: `${rightW}%` }} />
      </div>
      <div className="stat-bar-legend">
        <div className="stat-legend-item stat-legend-left">
          <span className="stat-legend-dot dot-left" />
          <span className="stat-legend-name">{left.label}</span>
          <span className="stat-legend-val">{mv(fmt(left.value))}</span>
          <span className="stat-legend-pct">{(left.pct * 100).toFixed(1)}%</span>
        </div>
        <div className="stat-legend-item stat-legend-right">
          <span className="stat-legend-dot dot-right" />
          <span className="stat-legend-name">{right.label}</span>
          <span className="stat-legend-val">{mv(fmt(right.value))}</span>
          <span className="stat-legend-pct">{(right.pct * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

function PerfBar({ label, invested, current, hideValues }) {
  const mv     = (v) => hideValues ? '••••' : v
  const isProfit = current >= invested
  const fillPct  = invested > 0 ? Math.min(current / invested, 1) * 100 : 0
  const pnl      = current - invested
  const pnlPct   = invested > 0 ? pnl / invested : 0
  const color    = isProfit ? 'var(--success)' : 'var(--danger)'

  return (
    <div className="stat-row">
      <div className="stat-row-label">{label}</div>
      <div className="stat-bar">
        <div style={{ width: `${fillPct}%`, background: color, transition: 'width .5s ease' }} />
      </div>
      <div className="stat-bar-legend">
        <div className="stat-legend-item stat-legend-left">
          <span className="stat-legend-dot" style={{ background: 'var(--text-dim)' }} />
          <span className="stat-legend-name">Invertido</span>
          <span className="stat-legend-val">{mv(fmt(invested))}</span>
        </div>
        <div className="stat-legend-item stat-legend-right">
          <span className="stat-legend-dot" style={{ background: color }} />
          <span className="stat-legend-name">Valor actual</span>
          <span className="stat-legend-val">{mv(fmt(current))}</span>
          <span className="stat-legend-pct" style={{ color }}>
            {mv(`${pnl >= 0 ? '+' : ''}${fmt(pnl)} (${fmtPct(pnlPct)})`)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Stats() {
  const { transactions, prices, archivedSymbols, hideValues } = useApp()

  const portfolio = useMemo(() => buildPortfolio(transactions, prices), [transactions, prices])
  const active    = useMemo(() => portfolio.filter(e => !archivedSymbols.includes(e.symbol)), [portfolio, archivedSymbols])
  const totals    = useMemo(() => buildTotals(active, transactions), [active, transactions])

  const { totalCurrentValue, totalNetInvested, totalLiquidez } = totals

  const hasData = totalNetInvested > 0 || totalCurrentValue > 0 || totalLiquidez !== 0

  if (!hasData) {
    return (
      <div className="main-content">
        <div className="stats-header">
          <div className="stats-title">Estadísticas</div>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Sin datos</div>
          <div className="empty-state-text">Añade transacciones para ver estadísticas</div>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content">
      <div className="stats-header">
        <div className="stats-title">Estadísticas</div>
      </div>
      <div className="stats-list">

        {totalLiquidez !== 0 && (() => {
          const total = totalCurrentValue + totalLiquidez
          return (
            <StatBar
              key="capital"
              label="Distribución de capital"
              left={{  label: 'Portfolio', value: totalCurrentValue, pct: total > 0 ? totalCurrentValue / total : 0 }}
              right={{ label: 'Liquidez',  value: totalLiquidez,     pct: total > 0 ? totalLiquidez / total     : 0 }}
              hideValues={hideValues}
            />
          )
        })()}

        {totalNetInvested > 0 && (
          <PerfBar
            key="rendimiento"
            label="Rendimiento"
            invested={totalNetInvested}
            current={totalCurrentValue}
            hideValues={hideValues}
          />
        )}

      </div>
    </div>
  )
}
