import { useState, useEffect, useRef } from 'react'
import { searchCG } from '../services/coinGeckoApi'
import { useApp } from '../context/AppContext'

export default function GlobalSearchScreen({ onSelect, onClose }) {
  const { cgMeta } = useApp()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchCG(query.trim())
        setResults(data)
      } catch {}
      finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <button className="btn-icon" onClick={onClose} style={{ flexShrink: 0, fontSize: '1.1rem' }}>←</button>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Bitcoin, ETH, SOL…"
            style={{ paddingLeft: '36px' }}
          />
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              width: '16px', height: '16px', color: 'var(--text-dim)', pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        {loading && <span style={{ color: 'var(--text-dim)', fontSize: '.8rem', flexShrink: 0 }}>…</span>}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {results.map(r => {
          const thumb = r.thumb || cgMeta[r.cgId]?.thumb
          return (
            <div
              key={r.cgId}
              className="global-search-result-item"
              onClick={() => onSelect(r)}
            >
              {thumb
                ? <img src={thumb} width={40} height={40} style={{ borderRadius: '50%', flexShrink: 0 }} alt={r.symbol} />
                : <div className="crypto-avatar" style={{ width: 40, height: 40, fontSize: '.72rem', flexShrink: 0 }}>{r.symbol.slice(0, 2)}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{r.symbol}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              </div>
              {r.rank && <div style={{ fontSize: '.75rem', color: 'var(--text-dim)', flexShrink: 0 }}>#{r.rank}</div>}
            </div>
          )
        })}

        {!results.length && query.trim() && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-dim)', fontSize: '.85rem' }}>
            Sin resultados para "{query}"
          </div>
        )}

        {!query.trim() && (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-dim)', fontSize: '.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, opacity: .3 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Busca cualquier criptomoneda
          </div>
        )}
      </div>
    </div>
  )
}
