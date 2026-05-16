import { useState, useEffect, useRef, useCallback } from 'react' // useRef used by PriceChart
import { fetchMarketChart, fetchCoinDetail } from '../services/coinGeckoApi'
import { fmt, fmtPrice, fmtPct, fmtCompact } from '../utils/calculations'
import { useApp } from '../context/AppContext'
import AddTransactionModal from './modals/AddTransactionModal'

// ── SVG Price Chart ──────────────────────────────────────────────────────────
function PriceChart({ data, cgId }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null) // { x, price, ts }

  const W = 300
  const H = 110
  const PAD = 4

  if (!data || data.length < 2) {
    return (
      <div className="chart-loading" style={{ height: H }}>
        {data && data.length === 1 ? 'Un solo punto de datos' : 'Sin datos'}
      </div>
    )
  }

  const prices = data.map(d => d[1])
  const times  = data.map(d => d[0])
  const minP   = Math.min(...prices)
  const maxP   = Math.max(...prices)
  const pRange = maxP - minP
  const tRange = times[times.length - 1] - times[0]

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
    if (!svg) return
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
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = (e) => getHoverFromClientX(e.clientX)
  const handleMouseLeave = () => setHover(null)

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (e.touches.length > 0) getHoverFromClientX(e.touches[0].clientX)
  }
  const handleTouchEnd = () => setHover(null)

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
        strokeWidth="1.5"
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
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.7"
          />
          {/* Dot */}
          <circle cx={hover.x} cy={hover.y} r="3.5" fill={color} />
          <circle cx={hover.x} cy={hover.y} r="6" fill={color} opacity="0.2" />

          {/* Tooltip box */}
          {(() => {
            const dateStr = new Date(hover.ts).toLocaleDateString('es-ES', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })
            const priceStr = fmtPrice(hover.price)
            const boxW = 104
            const boxH = 36
            const margin = 6
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
                  rx="5" ry="5"
                  fill="var(--surface)"
                  stroke="var(--border)"
                  strokeWidth="0.8"
                />
                <text x={bx + 7} y={by + 13} fontSize="7.5" fill={color} fontWeight="700">
                  {priceStr}
                </text>
                <text x={bx + 7} y={by + 27} fontSize="7" fill="var(--text-muted)">
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

          {loadingChart ? (
            <div className="chart-loading">Cargando gráfica…</div>
          ) : (
            <PriceChart data={chartData} cgId={cgId} />
          )}
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
