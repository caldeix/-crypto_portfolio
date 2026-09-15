import { useState, useEffect, useRef, useCallback, useMemo } from 'react' // useRef used by PriceChart
import { fetchMarketChart, fetchOHLC, fetchCoinDetail } from '../services/coinGeckoApi'
import { fmt, fmtPrice, fmtPct, fmtCompact, buildPortfolio } from '../utils/calculations'
import { useApp } from '../context/AppContext'
import { useMediaQuery } from '../utils/useMediaQuery'
import { save, load } from '../utils/storage'
import AddTransactionModal from './modals/AddTransactionModal'
import TransactionRow from './TransactionRow'

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
  narrow: { W: 300, H: 110, PAD: 4,  stroke: 1.5, dot: 3.5, font: 7.5, fontSm: 7,  boxW: 104, boxH: 36, padX: 7,  t1: 13, t2: 27, dash: '3,3',
            boxWc: 122, boxHc: 48, c1: 13, c2: 28, c3: 42, col2: 62 },
  wide:   { W: 760, H: 240, PAD: 10, stroke: 1.8, dot: 4,   font: 11,  fontSm: 10, boxW: 150, boxH: 46, padX: 10, t1: 18, t2: 34, dash: '5,5',
            boxWc: 176, boxHc: 68, c1: 19, c2: 40, c3: 59, col2: 90 },
}

// CoinGecko fixes OHLC granularity per range, so 30 days arrives as ~180
// candles. In a 300-unit viewBox that is 1.7 units each — under two device
// pixels on a 360px phone, which reads as mush. Group consecutive candles so no
// range ever draws more than this: open of the first, highest high, lowest low,
// close of the last. 1D, 7D and 3M pass through untouched; 1M collapses to
// 12-hour candles.
const CANDLE_TARGET = 70
const aggregate = (rows, target = CANDLE_TARGET) => {
  const step = Math.max(1, Math.ceil(rows.length / target))
  if (step === 1) return rows
  const out = []
  for (let i = 0; i < rows.length; i += step) {
    const g = rows.slice(i, i + step)
    out.push([
      g[0][0],
      g[0][1],
      Math.max(...g.map(r => r[2])),
      Math.min(...g.map(r => r[3])),
      g[g.length - 1][4],
    ])
  }
  return out
}

const noCurrency = (v) => fmtPrice(v).replace('$', '')

// ── SVG Price Chart ──────────────────────────────────────────────────────────
function PriceChart({ data, cgId, variant = 'narrow', mode = 'line' }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null) // { x, price, ts }

  const C = CHART[variant] || CHART.narrow
  const { W, H, PAD } = C
  const candles = mode === 'candles'

  // Every hook has to run before the early return further down. This component
  // used to call useRef/useState, return early when it had no data, and only
  // then call useCallback. It got away with it because the parent unmounts it on
  // every range change, but the moment the same MOUNTED instance flips between
  // having data and not — which a line/candles toggle does — React compares hook
  // counts across renders and throws "Rendered more hooks than during the
  // previous render".
  const ready = Array.isArray(data) && data.length >= 2

  const prices = ready && !candles ? data.map(d => d[1]) : []
  const times  = ready ? data.map(d => d[0]) : []
  // The candle domain has to come from highs and lows, not closes, or the wicks
  // would be clipped at the top and bottom of the plot.
  const minP   = ready ? (candles ? Math.min(...data.map(d => d[3])) : Math.min(...prices)) : 0
  const maxP   = ready ? (candles ? Math.max(...data.map(d => d[2])) : Math.max(...prices)) : 0
  const pRange = maxP - minP
  const tRange = ready ? times[times.length - 1] - times[0] : 0

  const n     = ready ? data.length : 0
  const plotW = W - PAD * 2
  const slot  = candles && n > 0 ? plotW / n : 0
  const bodyW = Math.max(0.8, slot * 0.62)   // floor so a dense range still draws
  const cx    = (i) => PAD + slot * (i + 0.5)

  // Edge case: all same price → flat line in center
  const toX = (ts) => tRange > 0 ? PAD + ((ts - times[0]) / tRange) * (W - PAD * 2) : W / 2
  const toY = (p)  => pRange > 0
    ? PAD + ((maxP - p) / pRange) * (H - PAD * 2)
    : H / 2

  // Guarded on `ready`: these used to sit after an early return, but the return
  // had to move below the hooks, so they now run on every render — including the
  // one where data is still null.
  const line = ready && !candles
  const pts = line ? data.map(([ts, p]) => `${toX(ts).toFixed(2)},${toY(p).toFixed(2)}`) : []
  const polyline = pts.join(' ')

  const isUp = line ? prices[prices.length - 1] >= prices[0] : true
  const color = isUp ? 'var(--success)' : 'var(--danger)'
  const gradId = `grad-${cgId}`

  // Area path: polyline + close down at bottom
  const areaPath = line
    ? `M${toX(times[0]).toFixed(2)},${H} ` + pts.map(pt => `L${pt}`).join(' ') +
      ` L${toX(times[times.length - 1]).toFixed(2)},${H} Z`
    : ''

  // Pointer logic (shared for mouse and touch)
  const getHoverFromClientX = useCallback((clientX) => {
    const svg = svgRef.current
    if (!svg || !ready) return
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * W

    if (candles) {
      // Candles sit on a regular grid, so hit-testing is a division rather than
      // a scan over every point.
      const i = Math.min(n - 1, Math.max(0, Math.floor((relX - PAD) / slot)))
      const [ts, o, h, l, c] = data[i]
      setHover({ x: cx(i), y: toY(c), ts, o, h, l, c, price: c })
      return
    }

    // Find closest data point by x
    let closest = 0
    let minDist = Infinity
    data.forEach(([ts], i) => {
      const dx = Math.abs(toX(ts) - relX)
      if (dx < minDist) { minDist = dx; closest = i }
    })
    const [ts, price] = data[closest]
    setHover({ x: toX(ts), y: toY(price), price, ts })
  }, [data, ready, W, H, PAD, candles, n, slot]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = (e) => getHoverFromClientX(e.clientX)
  const handleMouseLeave = () => setHover(null)

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (e.touches.length > 0) getHoverFromClientX(e.touches[0].clientX)
  }
  const handleTouchEnd = () => setHover(null)

  const candleEls = useMemo(() => {
    if (!ready || !candles) return null
    return data.map(([ts, o, h, l, c], i) => {
      const col   = c >= o ? 'var(--success)' : 'var(--danger)'
      const x     = cx(i)
      const yTop  = toY(Math.max(o, c))
      // Floor the body so a doji renders as a hairline instead of vanishing.
      const bodyH = Math.max(0.6, Math.abs(toY(o) - toY(c)))
      return (
        <g key={`${ts}-${i}`}>
          {/* Wicks are hairlines whose user-unit width would otherwise be
              multiplied by the viewBox scale, so they are pinned. */}
          <line
            x1={x} y1={toY(h)} x2={x} y2={toY(l)}
            stroke={col}
            strokeWidth={Math.max(0.35, bodyW * 0.18)}
            vectorEffect="non-scaling-stroke"
          />
          <rect x={x - bodyW / 2} y={yTop} width={bodyW} height={bodyH} fill={col} />
        </g>
      )
    })
  }, [data, ready, candles, W, H, PAD, slot, bodyW, minP, maxP]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {candles ? candleEls : (
        <>
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
        </>
      )}

      {/* Hover overlay */}
      {hover && (
        <>
          {/* Slot highlight — each candle has its own colour, so the crosshair
              is neutral here rather than tinted like the line series. */}
          {candles && (
            <rect
              x={hover.x - slot / 2} y={PAD}
              width={slot} height={H - PAD * 2}
              fill="var(--text)" opacity="0.06"
            />
          )}
          {/* Vertical dashed line */}
          <line
            x1={hover.x} y1={PAD}
            x2={hover.x} y2={H - PAD}
            stroke={candles ? 'var(--text-muted)' : color}
            strokeWidth={C.stroke * 0.67}
            strokeDasharray={C.dash}
            opacity="0.7"
            vectorEffect={candles ? 'non-scaling-stroke' : undefined}
          />
          {/* Dot — line mode only; a candle is already its own marker */}
          {!candles && (
            <>
              <circle cx={hover.x} cy={hover.y} r={C.dot} fill={color} />
              <circle cx={hover.x} cy={hover.y} r={C.dot * 1.7} fill={color} opacity="0.2" />
            </>
          )}

          {/* Tooltip box */}
          {(() => {
            const dateStr = new Date(hover.ts).toLocaleDateString('es-ES', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })
            const priceStr = fmtPrice(hover.price)
            const boxW = candles ? C.boxWc : C.boxW
            const boxH = candles ? C.boxHc : C.boxH
            const margin = PAD + 2
            const upC = candles && hover.c >= hover.o
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
                {candles ? (
                  <>
                    <text x={bx + C.padX} y={by + C.c1} fontSize={C.fontSm} fill="var(--text-muted)">
                      {dateStr}
                    </text>
                    <text x={bx + C.padX} y={by + C.c2} fontSize={C.fontSm} fill="var(--text-dim)">
                      O <tspan fill="var(--text)">{noCurrency(hover.o)}</tspan>
                    </text>
                    <text x={bx + C.col2} y={by + C.c2} fontSize={C.fontSm} fill="var(--text-dim)">
                      H <tspan fill="var(--text)">{noCurrency(hover.h)}</tspan>
                    </text>
                    <text x={bx + C.padX} y={by + C.c3} fontSize={C.fontSm} fill="var(--text-dim)">
                      L <tspan fill="var(--text)">{noCurrency(hover.l)}</tspan>
                    </text>
                    <text x={bx + C.col2} y={by + C.c3} fontSize={C.fontSm} fill="var(--text-dim)">
                      C <tspan fill={upC ? 'var(--success)' : 'var(--danger)'} fontWeight="700">{noCurrency(hover.c)}</tspan>
                    </text>
                  </>
                ) : (
                  <>
                    <text x={bx + C.padX} y={by + C.t1} fontSize={C.font} fill={color} fontWeight="700">
                      {priceStr}
                    </text>
                    <text x={bx + C.padX} y={by + C.t2} fontSize={C.fontSm} fill="var(--text-muted)">
                      {dateStr}
                    </text>
                  </>
                )}
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
const TX_PREVIEW = 8

export default function CryptoDetail({ entry, onClose }) {
  const { cgApiKey, cgMeta, saveCgMeta, transactions, prices, cycles, hideValues, deleteTransaction } = useApp()

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
  const [showAllTx, setShowAllTx]       = useState(false)
  const [editTx, setEditTx]             = useState(null)
  // Pure UI preference, so it lives in storage directly rather than in
  // AppContext: it is the same category as hideValues, not portfolio data.
  const [chartType, setChartType]       = useState(() => load('chartType', 'line'))
  const [candleFail, setCandleFail]     = useState(null) // "cgId|range" that had no OHLC
  const chartCacheRef                   = useRef(new Map())
  const isWideChart                     = useMediaQuery('(min-width: 1000px)')

  const entryKey = entry.cgId || entry.symbol

  // App.jsx holds the tapped card in useState, so `entry` is a snapshot frozen
  // at the moment the detail opened: adding or editing a transaction from this
  // screen left "Tu posición" showing stale numbers until you navigated away and
  // back. Re-derive it from live state instead, falling back to the prop for a
  // coin opened from the global search that has no transactions at all.
  const live = useMemo(() => {
    const found = buildPortfolio(transactions, prices, cycles)
      .find(e => (e.cgId || e.symbol) === entryKey)
    return found || entry
  }, [transactions, prices, cycles, entryKey, entry])

  const txById = useMemo(() => new Map(transactions.map(t => [t.id, t])), [transactions])

  // The main list shows the OPEN cycle only; everything already realized lives
  // under the histórico below, so no transaction is printed twice.
  const openTxs = useMemo(() => transactions
    .filter(t => (t.cgId || t.symbol) === entryKey)
    .filter(t => !(cycles.cycleByTxId.get(t.id) || {}).closed)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions, entryKey, cycles])

  const shownTxs = showAllTx ? openTxs : openTxs.slice(0, TX_PREVIEW)
  const closedCycles = live.closedCycles || []

  useEffect(() => { save('chartType', chartType) }, [chartType])

  // Load chart data when the coin, range or chart type changes
  useEffect(() => {
    if (!cgId) return
    let cancelled = false
    const key = `${cgId}|${range}|${chartType}`

    // Flipping the toggle back and forth must not spend another request against
    // the free tier's 30/min.
    const cached = chartCacheRef.current.get(key)
    if (cached) { setChartData(cached); setLoadingChart(false); return }

    setLoadingChart(true)
    setChartData(null)

    const req = chartType === 'candles'
      ? fetchOHLC(cgId, range, cgApiKey).then(rows => aggregate(rows))
      : fetchMarketChart(cgId, range, cgApiKey)

    req
      .then(rows => {
        if (cancelled) return
        chartCacheRef.current.set(key, rows)
        setChartData(rows)
      })
      .catch(() => {
        if (cancelled) return
        if (chartType === 'candles') {
          // 404 = this coin has no OHLC series, 429 = rate limited, abort =
          // timeout. Fall back to the line instead of an empty frame. No auto
          // retry: fetchCoinDetail already spends a retry on this screen.
          setCandleFail(`${cgId}|${range}`)
          // Leave an empty series behind, not null: changing chartType re-runs
          // this effect, and the render in between must not hand PriceChart a
          // null to map over.
          setChartData([])
          setChartType('line')
        } else {
          setChartData([])
        }
      })
      .finally(() => { if (!cancelled) setLoadingChart(false) })

    return () => { cancelled = true }
  }, [cgId, range, cgApiKey, chartType])

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
            {/* One icon rather than two labelled pills: at 360px the row has
                296px of usable width and the four range pills already take
                ~202px. */}
            <button
              className="tab"
              style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '.78rem', flexShrink: 0 }}
              title={chartType === 'line' ? 'Ver velas japonesas' : 'Ver línea'}
              aria-label={chartType === 'line' ? 'Ver velas japonesas' : 'Ver línea'}
              onClick={() => {
                setCandleFail(null)
                setChartType(t => (t === 'line' ? 'candles' : 'line'))
              }}
            >
              {chartType === 'line' ? '📊' : '📈'}
            </button>
          </div>

          <div className="chart-box">
            {loadingChart ? (
              <div className="chart-loading">Cargando gráfica…</div>
            ) : (
              <PriceChart
                data={chartData}
                cgId={cgId}
                variant={isWideChart ? 'wide' : 'narrow'}
                mode={chartType}
              />
            )}
          </div>

          {chartType === 'line' && candleFail === `${cgId}|${range}` && (
            <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Velas no disponibles para este rango — mostrando línea
            </div>
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

        {/* ── Posición cerrada: todos sus ciclos volvieron a cero ── */}
        {live.status === 'closed' && (
          <div className="detail-section">
            <div className="detail-section-label">Posición cerrada</div>
            <div className="crypto-card-stats">
              <div className="stat">
                <div className="stat-label">Realizado</div>
                <div className={`stat-value ${live.realizedPnL >= 0 ? 'pos' : 'neg'}`}>
                  {fmt(live.realizedPnL)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Rent. realiz.</div>
                <div className={`stat-value ${live.realizedPnL >= 0 ? 'pos' : 'neg'}`}>
                  {fmtPct(live.realizedPct)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Ciclos</div>
                <div className="stat-value">{closedCycles.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Portfolio position — ocultar si no hay posición ── */}
        {live.amountHeld > 0 && <div className="detail-section">
          <div className="detail-section-label">Tu posición</div>
          <div className="crypto-card-stats">
            <div className="stat">
              <div className="stat-label">Valor</div>
              <div className="stat-value">{fmt(live.currentValue)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Invertido</div>
              <div className="stat-value">{fmt(live.invested)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">P&L</div>
              <div className={`stat-value ${live.profitabilityUSD >= 0 ? 'pos' : 'neg'}`}>
                {fmt(live.profitabilityUSD)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Rentab.</div>
              <div className={`stat-value ${live.profitability >= 0 ? 'pos' : 'neg'}`}>
                {fmtPct(live.profitability)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Cantidad</div>
              <div className="stat-value">{live.amountHeld.toFixed(6)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Precio medio</div>
              <div className="stat-value">{fmtPrice(live.avgBuy)}</div>
            </div>
          </div>
        </div>}

        {/* ── Transacciones de esta moneda (ciclo abierto) ── */}
        <div className="detail-section">
          <div className="detail-section-label">
            Transacciones{openTxs.length > 0 ? ` (${openTxs.length})` : ''}
          </div>

          {openTxs.length === 0 ? (
            <div style={{ fontSize: '.82rem', color: 'var(--text-dim)' }}>
              {closedCycles.length > 0
                ? 'Esta posición está cerrada. Sus transacciones están en el histórico.'
                : 'Sin transacciones en esta moneda'}
            </div>
          ) : (
            <>
              <div className="tx-list">
                {shownTxs.map(tx => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    leftLabel={tx.category}
                    hideValues={hideValues}
                    onClick={() => setEditTx(tx)}
                  />
                ))}
              </div>
              {openTxs.length > TX_PREVIEW && (
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '8px', fontSize: '.78rem' }}
                  onClick={() => setShowAllTx(v => !v)}
                >
                  {showAllTx ? 'Ver menos' : `Ver todas (${openTxs.length})`}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Histórico: ciclos ya cerrados de esta moneda ── */}
        {closedCycles.length > 0 && (
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
                Histórico · posiciones cerradas ({closedCycles.length})
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: '.8rem' }}>{showHistory ? '▾' : '▸'}</span>
            </button>

            {showHistory && closedCycles.map(cy => (
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
                <div className="tx-list" style={{ marginTop: '8px' }}>
                  {cy.txIds.map(id => txById.get(id)).filter(Boolean).map(tx => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      leftLabel={tx.category}
                      hideValues={hideValues}
                      muted
                      onClick={() => setEditTx(tx)}
                    />
                  ))}
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
