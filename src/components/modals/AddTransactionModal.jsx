import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { genId } from '../../utils/calculations'
import SearchCryptoModal from './SearchCryptoModal'

const today = () => new Date().toISOString().slice(0, 16)

const emptyForm = (prefill) => ({
  cgId: prefill?.cgId || '',
  cryptoId: prefill?.cryptoId || null,
  symbol: prefill?.symbol || '',
  name: prefill?.name || '',
  category: 'BUY',
  date: today(),
  amount: '',
  priceUSD: '',
  notes: '',
})

export default function AddTransactionModal({ onClose, prefill, editTx, onDelete }) {
  const { allCategories, addTransaction, editTransaction } = useApp()
  const isEdit = !!editTx

  const [form, setForm] = useState(isEdit ? { ...editTx, date: editTx.date.slice(0, 16) } : emptyForm(prefill))
  const [showSearch, setShowSearch] = useState(!form.cgId && !form.symbol)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const totalUSD = form.amount && form.priceUSD
    ? (parseFloat(form.amount) * parseFloat(form.priceUSD)).toFixed(2)
    : ''

  const validate = () => {
    const e = {}
    if (!form.symbol) e.crypto = 'Selecciona una cripto'
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Importe inválido'
    if (!form.priceUSD || parseFloat(form.priceUSD) <= 0) e.priceUSD = 'Precio inválido'
    if (!form.date) e.date = 'Fecha requerida'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = () => {
    if (!validate()) return
    const tx = {
      ...(isEdit ? { id: editTx.id } : { id: genId() }),
      cgId: form.cgId || null,
      cryptoId: form.cryptoId || null,
      symbol: form.symbol,
      name: form.name,
      category: form.category,
      date: new Date(form.date).toISOString(),
      amount: parseFloat(form.amount),
      priceUSD: parseFloat(form.priceUSD),
      totalUSD: parseFloat(form.amount) * parseFloat(form.priceUSD),
      notes: form.notes.trim(),
    }
    isEdit ? editTransaction(tx) : addTransaction(tx)
    onClose()
  }

  if (showSearch) {
    return (
      <SearchCryptoModal
        onSelect={(crypto) => {
          setForm(f => ({ ...f, cgId: crypto.cgId, symbol: crypto.symbol, name: crypto.name, cryptoId: null }))
          setShowSearch(false)
        }}
        onClose={() => { if (!form.symbol) onClose(); else setShowSearch(false) }}
      />
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Editar' : 'Nueva'} Transacción</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label>Criptomoneda</label>
          <button className="btn btn-ghost" style={{ justifyContent: 'space-between' }} onClick={() => setShowSearch(true)}>
            {form.symbol ? `${form.symbol} — ${form.name}` : 'Seleccionar cripto…'}
            <span>›</span>
          </button>
          {errors.crypto && <span style={{ color: 'var(--danger)', fontSize: '.78rem' }}>{errors.crypto}</span>}
        </div>

        <div className="form-group">
          <label>Categoría</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Cantidad</label>
            <input type="number" inputMode="decimal" step="any" min="0" placeholder="0.00"
              value={form.amount} onChange={e => set('amount', e.target.value)} />
            {errors.amount && <span style={{ color: 'var(--danger)', fontSize: '.78rem' }}>{errors.amount}</span>}
          </div>
          <div className="form-group">
            <label>Precio (USD)</label>
            <input type="number" inputMode="decimal" step="any" min="0" placeholder="0.00"
              value={form.priceUSD} onChange={e => set('priceUSD', e.target.value)} />
            {errors.priceUSD && <span style={{ color: 'var(--danger)', fontSize: '.78rem' }}>{errors.priceUSD}</span>}
          </div>
        </div>

        {totalUSD && (
          <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            Total: <strong style={{ color: 'var(--text)' }}>${totalUSD}</strong>
          </div>
        )}

        <div className="form-group">
          <label>Fecha y hora</label>
          <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} />
          {errors.date && <span style={{ color: 'var(--danger)', fontSize: '.78rem' }}>{errors.date}</span>}
        </div>

        <div className="form-group">
          <label>Notas (opcional)</label>
          <input type="text" placeholder="Ej. Exchange, estrategia…"
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div className="modal-actions">
          {isEdit && <button className="btn btn-danger btn-sm" onClick={() => onDelete(editTx.id)}>Eliminar</button>}
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{isEdit ? 'Guardar' : 'Añadir'}</button>
        </div>
      </div>
    </div>
  )
}
