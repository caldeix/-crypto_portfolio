import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { buildPortfolio, buildTotals, fmt, fmtPct } from '../utils/calculations'

function StatBar({ label, left, right, hideValues, onDelete }) {
  const mv = (v) => hideValues ? '••••' : v
  const leftW  = Math.max(0, Math.min(100, left.pct  * 100))
  const rightW = 100 - leftW

  return (
    <div className="stat-row-wrap">
      {onDelete && (
        <button className="stat-row-delete" onClick={onDelete} title="Eliminar barra">✕</button>
      )}
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
    </div>
  )
}

function PerfBar({ label, invested, current, totalPct, totalPnL, hideValues }) {
  const mv      = (v) => hideValues ? '••••' : v
  const isProfit = totalPct >= 0
  const fillPct  = Math.min(Math.max(0, 1 + totalPct), 1) * 100
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
            {mv(`${totalPnL >= 0 ? '+' : ''}${fmt(totalPnL)} (${fmtPct(totalPct)})`)}
          </span>
        </div>
      </div>
    </div>
  )
}

function calcCustomBar(config, portfolio) {
  const left  = portfolio.filter(e => config.leftCgIds.includes(e.cgId))
  const right = config.rightCgIds[0] === 'REST'
    ? portfolio.filter(e => !config.leftCgIds.includes(e.cgId))
    : portfolio.filter(e => config.rightCgIds.includes(e.cgId))
  const lv = left.reduce((s, e) => s + e.currentValue, 0)
  const rv = right.reduce((s, e) => s + e.currentValue, 0)
  const total = lv + rv
  return {
    leftValue:  lv,
    rightValue: rv,
    leftPct:  total > 0 ? lv / total : 0,
    rightPct: total > 0 ? rv / total : 0,
    leftLabel:  left.map(e => e.symbol).join('+') || '?',
    rightLabel: config.rightCgIds[0] === 'REST'
      ? (right.length === 1 ? right[0].symbol : 'Resto')
      : right.map(e => e.symbol).join('+') || '?',
  }
}

function CustomBarEditor({ portfolio, onConfirm, onClose }) {
  const options = portfolio.map(e => ({ cgId: e.cgId, symbol: e.symbol }))
  const [leftCgId,  setLeftCgId]  = useState(options[0]?.cgId || '')
  const [rightCgId, setRightCgId] = useState('REST')

  const rightOptions = [
    { cgId: 'REST', symbol: 'Resto (todo lo demás)' },
    ...options.filter(o => o.cgId !== leftCgId),
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Nueva barra de comparación</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label>Lado izquierdo</label>
          <select value={leftCgId} onChange={e => {
            setLeftCgId(e.target.value)
            if (rightCgId === e.target.value) setRightCgId('REST')
          }}>
            {options.map(o => (
              <option key={o.cgId} value={o.cgId}>{o.symbol}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Lado derecho</label>
          <select value={rightCgId} onChange={e => setRightCgId(e.target.value)}>
            {rightOptions.map(o => (
              <option key={o.cgId} value={o.cgId}>{o.symbol}</option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => {
            if (leftCgId) { onConfirm({ leftCgIds: [leftCgId], rightCgIds: [rightCgId] }) }
          }}>
            Añadir
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Stats() {
  const { transactions, prices, archivedSymbols, hideValues, customBars, addCustomBar, deleteCustomBar } = useApp()
  const [showEditor, setShowEditor] = useState(false)

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
              label="Distribución de capital"
              left={{  label: 'Portfolio', value: totalCurrentValue, pct: total > 0 ? totalCurrentValue / total : 0 }}
              right={{ label: 'Liquidez',  value: totalLiquidez,     pct: total > 0 ? totalLiquidez / total     : 0 }}
              hideValues={hideValues}
            />
          )
        })()}

        {totalNetInvested > 0 && (
          <PerfBar
            label="Rendimiento"
            invested={totalNetInvested}
            current={totalCurrentValue}
            totalPct={totals.totalPct}
            totalPnL={totals.totalPnL}
            hideValues={hideValues}
          />
        )}

        {customBars.map(bar => {
          const calc = calcCustomBar(bar, active)
          return (
            <StatBar
              key={bar.id}
              label={`${calc.leftLabel} vs ${calc.rightLabel}`}
              left={{  label: calc.leftLabel,  value: calc.leftValue,  pct: calc.leftPct  }}
              right={{ label: calc.rightLabel, value: calc.rightValue, pct: calc.rightPct }}
              hideValues={hideValues}
              onDelete={() => deleteCustomBar(bar.id)}
            />
          )
        })}

        {active.length >= 2 && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', fontSize: '.82rem', opacity: 0.7 }}
            onClick={() => setShowEditor(true)}
          >
            + Añadir barra personalizada
          </button>
        )}

      </div>

      {showEditor && (
        <CustomBarEditor
          portfolio={active}
          onConfirm={(bar) => { addCustomBar(bar); setShowEditor(false) }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
