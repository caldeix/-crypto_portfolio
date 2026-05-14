import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import ImportExportModal from './ImportExportModal'

export default function ConfigModal({ onClose }) {
  const { cgApiKey, setCgApiKey } = useApp()

  const [keyInput, setKeyInput] = useState(cgApiKey)
  const [showKey, setShowKey] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)

  const handleSave = () => { setCgApiKey(keyInput.trim()); onClose() }

  if (showImportExport) return <ImportExportModal onClose={() => setShowImportExport(false)} />

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">⚙️ Ajustes</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">CoinGecko API (opcional)</div>
          <div className="form-group">
            <label>Demo API Key — para mayor límite de peticiones</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="CG-xxxx (opcional, gratis en coingecko.com)"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                autoComplete="off"
              />
              <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => setShowKey(s => !s)}>
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
              Sin key funciona igual (30 req/min gratis). Se guarda cifrada localmente.
            </span>
          </div>
        </div>

        <hr className="divider" />

        <div className="settings-section">
          <div className="settings-section-title">Datos</div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowImportExport(true)}>
            📦 Importar / Exportar portafolio
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  )
}
