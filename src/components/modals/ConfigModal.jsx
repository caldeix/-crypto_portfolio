import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import ImportExportModal from './ImportExportModal'

export default function ConfigModal({ onClose }) {
  const { cgApiKey, setCgApiKey, customCategories, allCategories, addCategory, renameCategory, deleteCategory, expenseCategories, toggleExpenseCategory } = useApp()

  const [keyInput, setKeyInput] = useState(cgApiKey)
  const [showKey, setShowKey] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [editCat, setEditCat] = useState(null)
  const [editCatVal, setEditCatVal] = useState('')
  const [showImportExport, setShowImportExport] = useState(false)

  const handleSave = () => { setCgApiKey(keyInput.trim()); onClose() }

  const handleAddCat = () => { if (!newCat.trim()) return; addCategory(newCat.trim()); setNewCat('') }

  const handleRenameCat = (old) => {
    if (editCatVal.trim() && editCatVal.trim() !== old) renameCategory(old, editCatVal.trim())
    setEditCat(null); setEditCatVal('')
  }

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
          <div className="settings-section-title">Categorías de transacciones</div>
          <div className="category-list">
            {['BUY', 'SELL', 'LIQUIDEZ'].map(cat => (
              <div key={cat} className="category-item">
                <span className="category-item-name">{cat}</span>
                <span className="category-item-locked">🔒 Nativa</span>
              </div>
            ))}
            {customCategories.map(cat => (
              <div key={cat} className="category-item">
                {editCat === cat ? (
                  <>
                    <input
                      style={{ flex: 1, padding: '4px 8px', fontSize: '.85rem' }}
                      value={editCatVal}
                      onChange={e => setEditCatVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameCat(cat); if (e.key === 'Escape') { setEditCat(null); setEditCatVal('') } }}
                      autoFocus
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleRenameCat(cat)}>✓</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditCat(null); setEditCatVal('') }}>✕</button>
                  </>
                ) : (
                  <>
                    <span className="category-item-name">{cat}</span>
                    <button
                      className="btn-icon"
                      style={{ fontSize: '.8rem', opacity: expenseCategories.includes(cat) ? 1 : 0.35 }}
                      title={expenseCategories.includes(cat) ? 'Quitar gasto' : 'Marcar como gasto'}
                      onClick={() => toggleExpenseCategory(cat)}
                    >💸</button>
                    <button className="btn-icon" style={{ fontSize: '.8rem' }} onClick={() => { setEditCat(cat); setEditCatVal(cat) }}>✏️</button>
                    <button className="btn-icon" style={{ fontSize: '.8rem' }} onClick={() => deleteCategory(cat)}>🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="Nueva categoría…" value={newCat} onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCat()} />
            <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={handleAddCat}>+ Añadir</button>
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
