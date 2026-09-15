import { useState, useEffect, useRef, useCallback } from 'react' // useRef used by PriceChart
import { fetchMarketChart, fetchCoinDetail } from '../services/coinGeckoApi'
import { fmt, fmtPrice, fmtPct, fmtCompact } from '../utils/calculations'
import { useApp } from '../context/AppContext'
import { useMediaQuery } from '../utils/useMediaQuery'
import AddTransactionModal from './modals/AddTransactionModal'

const fmtCycleDate = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

// Two fixed geometries rather than one that stretches. The SVG has no height,
// so a 300x110 viewBox at 1368px wide renders 1368x501 and multiplies every user
// unit by 4.56 — a 1.5 stroke becomes 6.8px and 7.5 text becomes 34px. Capping
// with max-height cannot fix it: the default preserveAspectRatio letterboxes the
// drawing instead of shrinking it, and "none" distorts text and strokes
// non-uniformly. A second set of constants keeps roughly 1 user unit = 1 CSS px
// in each band, and since the media query is false on every phone the narrow
// path runs exactly the numbers it ran before.
const CHART = {
  narrow: { W: 300, H: 110, PAD: 4,  stroke: 1.5, dot: 3.5, font: 7.5, fontSm: 7,  boxW: 104, boxH: 36, padX: 7,  t1: 13, t2: 27, dash: '3,3' },
  wide:   { W: 760, H: 240, PAD: 10, stroke: 1.8, dot: 4,   font: 11,  fontSm: 10, boxW: 150, boxH: 46, padX: 10, t1: 18, t2: 34, dash: '5,5' },
}

// ── SVG Price Chart ──────────────────────────────────────────────────────────
function PriceChart({ data, cgId, variant = 'narrow' }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null) // { x, price, ts }

  const C = CHART[variant] || CHART.narrow
  const { W, H, PAD } = C

  // Every hook has to run before the early return further down. This component
  // used to call useRef/useState, return early when it had no data, and only
  // then call useCallback. It got away with it because the parent unmounts it on
  // every range change, but the moment the same MOUNTED instance flips between
  // having data and not — which a line/candles toggle does — React compares hook
  // counts across renders and throws "Rendered more hooks than during the
  // previous render".
  const ready = Array.isArray(data) && data.length >= 2

  const prices = ready ? data.map(d => d[1]) : []
  const times  = ready ? data.map(d => d[0]) : []
  const minP   = ready ? Math.min(...prices) : 0
  const maxP   = ready ? Math.max(...prices) : 0
  const pRange = maxP - minP
  const tRange = ready ? times[times.length - 1] - times[0] : 0

  // Edge case: all same price → flat line in center
  const toX = (ts) => tRange > 0 ? PAD + ((ts - times[0]) / tRange) * (W - PAD * 2) : W / 2
  const toY = (p)  => pRange > 0
    ? PAD + ((maxP - p) / pRange) * (H - PAD * 2)
    : H / 2

  const pts = data.map(([ts, p]) => `${toX(ts).toFixed(2)},${toY(p).toFixed(2)}`)
  const polyline = pts.join(' ')

  const isUp = prices[prices.length - 1] >= prices[0]
  const color = isUp ? 'var(--success)' : 'var(--danger)'
  const gradId = `grad-${cgId}`

  // Area path: polyline + close down at bottom
  const firstX = toX(times[0]).toFixed(2)
  const lastX  = toX(times[times.length - 1]).toFixed(2)
  const areaPath = `M${firstX},${H} ` + pts.map((pt, i) => (i === 0 ? `L${pt}` : `L${pt}`)).join(' ') + ` L${lastX},${H} Z`

  // Pointer logic (shared for mouse and touch)
  const getHoverFromClientX = useCallback((clientX) => {
    const svg = svgRef.current
    if (!svg || !ready) return
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * W
    // Find closest data point by x
    let closest = 0
    let minDist = Infinity
    data.forEach(([ts], i) => {
      const dx = Math.abs(toX(ts) - relX)
      if (dx < minDist) { minDist = dx; closest = i }
    })
    const [ts, price] = data[closest]
    setHover({ x: toX(ts), y: toY(price), price, ts })
  }, [data, ready, W, H, PAD]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = (e) => getHoverFromClientX(e.clientX)
  const handleMouseLeave = () => setHover(null)

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (e.touches.length > 0) getHoverFromClientX(e.touches[0].clientX)
  }
  const handleTouchEnd = () => setHover(null)

  // Safe to return early now: every hook above has already run.
  if (!ready) {
    return (
      <div className="chart-loading">
        {data && data.length === 1 ? 'Un solo punto de datos' : 'Sin datos'}
      </div>
    )
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Gradient area */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={C.stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Hover overlay */}
      {hover && (
        <>
          {/* Vertical dashed line */}
          <line
            x1={hover.x} y1={PAD}
            x2={hover.x} y2={H - PAD}
            stroke={color}
            strokeWidth={C.stroke * 0.67}
            strokeDasharray={C.dash}
            opacity="0.7"
          />
          {/* Dot */}
          <circle cx={hover.x} cy={hover.y} r={C.dot} fill={color} />
          <circle cx={hover.x} cy={hover.y} r={C.dot * 1.7} fill={color} opacity="0.2" />

          {/* Tooltip box */}
          {(() => {
            const dateStr = new Date(hover.ts).toLocaleDateString('es-ES', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })
            const priceStr = fmtPrice(hover.price)
            const boxW = C.boxW
            const boxH = C.boxH
            const margin = PAD + 2
            // Position tooltip: prefer right of dot, flip if near edge
            let bx = hover.x + margin
            if (bx + boxW > W - PAD) bx = hover.x - margin - boxW
            let by = hover.y - boxH / 2
            if (by < PAD) by = PAD
            if (by + boxH > H - PAD) by = H - PAD - boxH

            return (
              <g>
                <rect
                  x={bx} y={by} width={boxW} height={boxH}
                  rx={C.PAD + 1} ry={C.PAD + 1}
                  fill="var(--surface)"
                  stroke="var(--border)"
                  strokeWidth={C.stroke * 0.53}
                />
                <text x={bx + C.padX} y={by + C.t1} fontSize={C.font} fill={color} fontWeight="700">
                  {priceStr}
                </text>
                <text x={bx + C.padX} y={by + C.t2} fontSize={C.fontSm} fill="var(--text-muted)">
                  {dateStr}
                </text>
              </g>
            )
          })()}
        </>
      )}
    </svg>
  )
}

// ── CryptoDetail ─────────────────────────────────────────────────────────────
const RANGES = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
]

const DETAIL_TTL = 24 * 60 * 60 * 1000

export default function CryptoDetail({ entry, onClose }) {
  const { cgApiKey, cgMeta, saveCgMeta } = useApp()

  const { cgId, symbol, name, currentPrice, change24h } = entry
  const thumb = cgMeta[cgId]?.thumb

  // Read cache synchronously — shows data instantly if background fetch already ran
  const cachedDetail    = cgMeta[cgId]?.cachedDetail   ?? null
  const detailFetchedAt = cgMeta[cgId]?.detailFetchedAt ?? 0

  const [range, setRange]               = useState(7)
  const [chartData, setChartData]       = useState(null)
  const [coinInfo, setCoinInfo]         = useState(cachedDetail)
  const [infoError, setInfoError]       = useState(false)
  const [loadingChart, setLoadingChart] = useState(true)
  const [loadingInfo, setLoadingInfo]   = useState(cachedDetail === null)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [showAdd, setShowAdd]           = useState(false)
  const [copied, setCopied]             = useState(false)
  const [retryKey, setRetryKey]         = useState(0)
  const [showHistory, setShowHistory]   = useState(false)
  const isWideChart                     = useMediaQuery('(min-width: 1000px)')

  // Load chart data when range changes
  useEffect(() => {
    if (!cgId) return
    setLoadingChart(true)
    setChartData(null)
    fetchMarketChart(cgId, range, cgApiKey)
      .then(prices => setChartData(prices))
      .catch(() => setChartData([]))
      .finally(() => setLoadingChart(false))
  }, [cgId, range, cgApiKey])

  // Fetch coin detail only when cache is missing or stale (>24h); retryKey forces a re-fetch
  useEffect(() => {
    if (!cgId) return
    const isFresh = cachedDetail && (Date.now() - detailFetchedAt) < DETAIL_TTL
    if (retryKey === 0 && isFresh) return  // cache is good, nothing to do

    if (!cachedDetail) setLoadingInfo(true)
    setInfoError(false)

    let cancelled = false
    const run = async (attempt = 0) => {
      try {
        const info = await fetchCoinDetail(cgId, cgApiKey)
        if (cancelled) return
        setCoinInfo(info)
        const patch = { cachedDetail: info, detailFetchedAt: Date.now() }
        if (info.homepage)        patch.homepage        = info.homepage
        if (info.contractAddress) patch.contractAddress = info.contractAddress
        saveCgMeta(cgId, patch)
      } catch {
        if (cancelled) return
        if (attempt < 1) {
          await new Promise(r => setTimeout(r, 3000))
          return run(attempt + 1)
        }
        if (!cachedDetail) setInfoError(true)
      } finally {
        if (!cancelled) setLoadingInfo(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [cgId, cgApiKey, retryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayPrice = currentPrice || coinInfo?.currentPrice || 0
  const change24hVal = currentPrice ? (change24h ?? 0) : (coinInfo?.change24h ?? change24h ?? 0)
  const isUp = change24hVal >= 0

  // Use cgMeta as immediate source (populated by background fetch); coinInfo overrides once loaded
  const homepage        = coinInfo?.homepage        || cgMeta[cgId]?.homepage        || null
  const contractAddress = coinInfo?.contractAddress || cgMeta[cgId]?.contractAddress || null

  const description = coinInfo?.description || ''
  const descTruncated = description.length > 280
  const descDisplay = (!showFullDesc && descTruncated)
    ? description.slice(0, 280) + '…'
    : description

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg)' }}>

      {/* ── Sticky header ── */}
      <div className="detail-header">
        <button
          className="btn-icon"
          style={{ fontSize: '1.1rem', flexShrink: 0 }}
          onClick={onClose}
          aria-label="Volver"
        >
          ←
        </button>

        {thumb ? (
          <img
            src={thumb}
            alt={symbol}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div className="crypto-avatar" style={{ width: 32, height: 32, fontSize: '.7rem' }}>
            {symbol.slice(0, 2)}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {symbol} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{name}</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{displayPrice ? fmtPrice(displayPrice) : (loadingInfo ? '…' : '—')}</div>
          <div style={{ fontSize: '.75rem', color: isUp ? 'var(--success)' : 'var(--danger)' }}>
            {displayPrice ? `${isUp ? '+' : ''}${change24hVal.toFixed(2)}%` : ''}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>

        {/* ── Chart section ── */}
        <div className="detail-section">
          <div className="chart-range-tabs">
            {RANGES.map(r => (
              <button
                key={r.days}
                className={`tab${range === r.days ? ' active' : ''}`}
                style={{ padding: '4px 12px', fontSize: '.78rem' }}
                onClick={() => setRange(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="chart-box">
            {loadingChart ? (
              <div className="chart-loading">Cargando gráfica…</div>
            ) : (
              <PriceChart data={chartData} cgId={cgId} variant={isWideChart ? 'wide' : 'narrow'} />
            )}
          </div>
        </div>

        {/* ── Market data grid ── */}
        <div className="detail-section">
          <div className="detail-section-label">Datos de mercado</div>
          <div className="crypto-card-stats">

            {loadingInfo && !coinInfo ? (
              <div style={{ gridColumn: '1 / -1', color: 'var(--text-dim)', fontSize: '.82rem' }}>
                Cargando…
              </div>
            ) : coinInfo ? (
              <>
                <div className="stat">
                  <div className="stat-label">Ranking</div>
                  <div className="stat-value">#{coinInfo.rank ?? '—'}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Cap. mercado</div>
                  <div className="stat-value">{coinInfo.marketCap ? fmtCompact(coinInfo.marketCap) : '—'}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Volumen 24h</div>
                  <div className="stat-value">{coinInfo.volume24h ? fmtCompact(coinInfo.volume24h) : '—'}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Máx 24h</div>
                  <div className="stat-value">{coinInfo.high24h ? fmtPrice(coinInfo.high24h) : '—'}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Mín 24h</div>
                  <div className="stat-value">{coinInfo.low24h ? fmtPrice(coinInfo.low24h) : '—'}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">7D%</div>
                  <div className={`stat-value ${coinInfo.change7d !== null ? (coinInfo.change7d >= 0 ? 'pos' : 'neg') : ''}`}>
                    {coinInfo.change7d !== null ? fmtPct(coinInfo.change7d) : '—'}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">ATH</div>
                  <div className="stat-value">{coinInfo.ath ? fmtPrice(coinInfo.ath) : '—'}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">vs ATH</div>
                  <div className={`stat-value ${coinInfo.athChange !== null ? (coinInfo.athChange >= 0 ? 'pos' : 'neg') : ''}`}>
                    {coinInfo.athChange !== null ? fmtPct(coinInfo.athChange) : '—'}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">ATL</div>
                  <div className="stat-value">{coinInfo.atl ? fmtPrice(coinInfo.atl) : '—'}</div>
                </div>
              </>
            ) : (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '.82rem' }}>No se pudo cargar</span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '.78rem', padding: '4px 10px' }}
                  onClick={() => setRetryKey(k => k + 1)}
                >Reintentar</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Posición cerrada: todos sus ciclos volvieron a cero ── */}
        {entry.status === 'closed' && (
          <div className="detail-section">
            <div className="detail-section-label">Posición cerrada</div>
            <div className="crypto-card-stats">
              <div className="stat">
                <div className="stat-label">Realizado</div>
                <div className={`stat-value ${entry.realizedPnL >= 0 ? 'pos' : 'neg'}`}>
                  {fmt(entry.realizedPnL)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Rent. realiz.</div>
                <div className={`stat-value ${entry.realizedPnL >= 0 ? 'pos' : 'neg'}`}>
                  {fmtPct(entry.realizedPct)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Ciclos</div>
                <div className="stat-value">{entry.closedCycles.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Portfolio position — ocultar si no hay posición ── */}
        {entry.amountHeld > 0 && <div className="detail-section">
          <div className="detail-section-label">Tu posición</div>
          <div className="crypto-card-stats">
            <div className="stat">
              <div className="stat-label">Valor</div>
              <div className="stat-value">{fmt(entry.currentValue)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Invertido</div>
              <div className="stat-value">{fmt(entry.invested)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">P&L</div>
              <div className={`stat-value ${entry.profitabilityUSD >= 0 ? 'pos' : 'neg'}`}>
                {fmt(entry.profitabilityUSD)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Rentab.</div>
              <div className={`stat-value ${entry.profitability >= 0 ? 'pos' : 'neg'}`}>
                {fmtPct(entry.profitability)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Cantidad</div>
              <div className="stat-value">{entry.amountHeld.toFixed(6)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Precio medio</div>
              <div className="stat-value">{fmtPrice(entry.avgBuy)}</div>
            </div>
          </div>
        </div>}

        {/* ── Histórico: ciclos ya cerrados de esta moneda ── */}
        {entry.closedCycles && entry.closedCycles.length > 0 && (
          <div className="detail-section">
            <button
              onClick={() => setShowHistory(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none', padding: 0,
                color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span className="detail-section-label" style={{ marginBottom: 0 }}>
                Histórico · posiciones cerradas ({entry.closedCycles.length})
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: '.8rem' }}>{showHistory ? '▾' : '▸'}</span>
            </button>

            {showHistory && entry.closedCycles.map(cy => (
              <div
                key={cy.index}
                style={{ marginTop: '10px', padding: '10px', background: 'var(--card)', borderRadius: 'var(--radius-sm)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                    #{cy.index + 1} · {fmtCycleDate(cy.start)} → {fmtCycleDate(cy.end)}
                  </span>
                  <span
                    className={cy.realizedPnL >= 0 ? 'pos' : 'neg'}
                    style={{ fontSize: '.86rem', fontWeight: 600 }}
                  >
                    {fmt(cy.realizedPnL)} ({fmtPct(cy.realizedPct)})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '.74rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                  <span>Invertido {fmt(cy.invested)}</span>
                  <span>Vendido {fmt(cy.soldValue)}</span>
                  <span>Avg {fmtPrice(cy.avgBuy)}</span>
                  <span>{cy.txIds.length} tx</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Info: web + contract ── */}
        {(homepage || contractAddress) && (
          <div className="detail-section">
            <div className="detail-section-label">Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {homepage && (
                <a
                  href={homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', fontSize: '.85rem', textDecoration: 'none', wordBreak: 'break-all' }}
                >
                  🌐 {homepage.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              )}
              {contractAddress && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(contractAddress)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '.78rem', textAlign: 'left',
                    wordBreak: 'break-all', display: 'flex', alignItems: 'flex-start', gap: '6px',
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{copied ? '✅' : '📋'}</span>
                  <span style={{ fontFamily: 'monospace', lineHeight: 1.4 }}>
                    {contractAddress}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Description ── */}
        {coinInfo?.description && (
          <div className="detail-section">
            <div className="detail-section-label">Acerca de {name}</div>
            <p className="desc-text">{descDisplay}</p>
            {descTruncated && (
              <button
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '.82rem', padding: '6px 0', cursor: 'pointer' }}
                onClick={() => setShowFullDesc(v => !v)}
              >
                {showFullDesc ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>
        )}

      </div>

      {/* ── Fixed bottom bar ── */}
      <div className="detail-bottom-bar">
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => setShowAdd(true)}
        >
          Añadir transacción
        </button>
      </div>

      {showAdd && (
        <AddTransactionModal
          prefill={{ cgId: entry.cgId, cryptoId: entry.cryptoId, symbol: entry.symbol, name: entry.name }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
