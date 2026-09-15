import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'

export default function ImportExportModal({ onClose }) {
  const { exportData, importData } = useApp()
  const [includeKey, setIncludeKey] = useState(false)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleExport = () => {
    const data = exportData(includeKey)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio_config_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        setSummary(importData(data))
      } catch (err) {
        setError(err?.message === 'Formato inválido'
          ? 'El archivo no contiene transacciones. ¿Seguro que es un export de esta app?'
          : 'Archivo inválido. Asegúrate de que es un JSON de portafolio exportado desde esta app.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">📦 Importar / Exportar</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {summary ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ color: 'var(--success)', marginBottom: '10px' }}>✓ Datos importados correctamente</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {summary.txCount} transacciones
              {summary.barCount !== null
                ? ` · ${summary.barCount} barra${summary.barCount === 1 ? '' : 's'} personalizada${summary.barCount === 1 ? '' : 's'}`
                : ' · el archivo no traía barras, se conservan las de este dispositivo'}
              {summary.metaCount > 0 && ` · ${summary.metaCount} logos`}
              {summary.version !== null && ` · v${summary.version}`}
            </div>
            {summary.warnings.map((w, i) => (
              <div key={i} className="api-warning" style={{ fontSize: '.78rem', marginTop: '10px', textAlign: 'left' }}>⚠️ {w}</div>
            ))}
            <br />
            <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="settings-section">
              <div className="settings-section-title">Exportar</div>
              <div className="switch-row" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '.85rem' }}>Incluir API Key en el archivo</span>
                <label className="switch">
                  <input type="checkbox" checked={includeKey} onChange={e => setIncludeKey(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
              {includeKey && (
                <div className="api-warning" style={{ fontSize: '.78rem' }}>
                  ⚠️ Guarda el archivo de forma segura: contiene tu API Key.
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleExport}>
                ⬇️ Descargar portfolio_config.json
              </button>
            </div>

            <hr className="divider" />

            <div className="settings-section">
              <div className="settings-section-title">Importar</div>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
                Esto reemplazará todos tus datos actuales.
              </p>
              {error && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{error}</div>}
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => fileRef.current?.click()}
              >
                📂 Cargar archivo JSON
              </button>
              <input
                ref={fileRef} type="file" accept=".json" style={{ display: 'none' }}
                onChange={handleImport}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
