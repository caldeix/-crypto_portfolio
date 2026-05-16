import { useApp } from '../context/AppContext'

const timeAgo = (ts) => {
  if (!ts) return 'nunca'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'ahora mismo'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return `hace ${Math.floor(diff / 3600)} h`
}

export default function StatusBanner() {
  const { lastUpdated, isLoading, priceError, refreshPrices } = useApp()

  const dotClass = isLoading ? 'status-dot loading' : priceError ? 'status-dot error' : 'status-dot'

  return (
    <div className="status-banner">
      <div className="status-left">
        <div className={dotClass} />
        <span className="status-text">
          {priceError
            ? <span style={{ color: 'var(--danger)', fontSize: '.75rem' }} title={priceError}>⚠️ {priceError}</span>
            : isLoading
            ? <span>Actualizando precios…</span>
            : <span>Actualizado: <strong>{timeAgo(lastUpdated)}</strong></span>
          }
        </span>
      </div>
      <button
        className="btn-icon"
        onClick={refreshPrices}
        disabled={isLoading}
        title="Refrescar precios"
        style={{ fontSize: '1.15rem', opacity: isLoading ? 0.4 : 0.7 }}
      >↻</button>
    </div>
  )
}
