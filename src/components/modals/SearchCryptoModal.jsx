import { useState } from 'react'
import { searchCG } from '../../services/coinGeckoApi'

export default function SearchCryptoModal({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await searchCG(query.trim())
      setResults(data)
      if (!data.length) setError('Sin resultados.')
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Buscar Criptomoneda</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Nombre o símbolo: Bitcoin, ETH…"
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? '…' : '🔍'}
          </button>
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{error}</div>}

        {results.length > 0 && (
          <div className="search-results">
            {results.map(r => (
              <div key={r.cgId} className="search-result-item" onClick={() => onSelect(r)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {r.thumb && <img src={r.thumb} width={24} height={24} style={{ borderRadius: '50%' }} />}
                  <div>
                    <div className="search-result-symbol">{r.symbol}</div>
                    <div className="search-result-name">{r.name}</div>
                  </div>
                </div>
                <div className="search-result-rank">{r.rank ? `#${r.rank}` : ''}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          Precios via CoinGecko · Sin API key requerida
        </div>
      </div>
    </div>
  )
}
