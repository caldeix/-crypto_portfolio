import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { buildPortfolio, buildTotals, fmt, fmtPct } from '../utils/calculations'

function StatBar({ label, leftLabel, leftValue, leftPct, rightLabel, rightValue, rightPct, hideValues }) {
  const mv = (v) => hideValues ? '••••' : v
  const leftW = Math.max(0, Math.min(100, leftPct * 100))
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
          <span className="stat-legend-name">{leftLabel}</span>
          <span className="stat-legend-val">{mv(fmt(leftValue))}</span>
          <span className="stat-legend-pct">{(leftPct * 100).toFixed(1)}%</span>
        </div>
        <div className="stat-legend-item stat-legend-right">
          <span className="stat-legend-dot dot-right" />
          <span className="stat-legend-name">{rightLabel}</span>
          <span className="stat-legend-val">{mv(fmt(rightValue))}</span>
          <span className="stat-legend-pct">{(rightPct * 100).toFixed(1)}%</span>
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

  const { totalCurrentValue, totalLiquidez } = totals
  const total = totalCurrentValue + totalLiquidez

  return (
    <div className="main-content">
      <div className="stats-header">
        <div className="stats-title">Estadísticas</div>
      </div>

      {total <= 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Sin datos</div>
          <div className="empty-state-text">Añade transacciones para ver estadísticas</div>
        </div>
      ) : (
        <div className="stats-list">
          {totalLiquidez !== 0 && (
            <StatBar
              label="Distribución de capital"
              leftLabel="Portfolio"
              leftValue={totalCurrentValue}
              leftPct={total > 0 ? totalCurrentValue / total : 0}
              rightLabel="Liquidez"
              rightValue={totalLiquidez}
              rightPct={total > 0 ? totalLiquidez / total : 0}
              hideValues={hideValues}
            />
          )}
        </div>
      )}
    </div>
  )
}
