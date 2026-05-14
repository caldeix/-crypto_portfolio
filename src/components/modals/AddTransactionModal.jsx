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
  const { allCategories, addTransaction, editTransaction, expenseCategories } = useApp()
  const isEdit = !!editTx

  const [form, setForm] = useState(isEdit ? { ...editTx, date: editTx.date.slice(0, 16) } : emptyForm(prefill))
  const [showSearch, setShowSearch] = useState(false)
  const [errors, setErrors] = useState({})

  const isExpense = expenseCategories.includes(form.category)
  const isLiquidez = form.category === 'LIQUIDEZ'
  const isSimpleForm = isExpense || isLiquidez

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const totalUSD = form.amount && form.priceUSD
    ? (parseFloat(form.amount) * parseFloat(form.priceUSD)).toFixed(2)
    : ''

  const validate = () => {
    const e = {}
    if (!isSimpleForm && !form.symbol) e.crypto = 'Selecciona una cripto'
    if (!isSimpleForm && (!form.amount || parseFloat(form.amount) <= 0)) e.amount = 'Importe inválido'
    if (!isSimpleForm && (!form.priceUSD || parseFloat(form.priceUSD) <= 0)) e.priceUSD = 'Precio inválido'
    if (isSimpleForm && (!form.totalUSD || parseFloat(form.totalUSD) === 0)) e.totalUSD = 'Importe requerido'
    if (!form.date) e.date = 'Fecha requerida'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = () => {
    if (!validate()) return
    const cat = form.category
    const tx = isSimpleForm
      ? {
          ...(isEdit ? { id: editTx.id } : { id: genId() }),
          cgId: null, cryptoId: null,
          symbol: cat, name: cat, category: cat,
          date: new Date(form.date).toISOString(),
          amount: 0, priceUSD: 1,
          totalUSD: parseFloat(form.totalUSD),
          notes: form.notes.trim(),
        }
      : {
          ...(isEdit ? { id: editTx.id } : { id: genId() }),
          cgId: form.cgId || null,
          cryptoId: form.cryptoId || null,
          symbol: form.symbol, name: form.name, category: cat,
          date: new Date(form.date).toISOString(),
          amount: parseFloat(form.amount),
          priceUSD: parseFloat(form.priceUSD),
          totalUSD: parseFloat(form.amount) * parseFloat(form.priceUSD),
          notes: form.notes.trim(),
        }
    isEdit ? editTransaction(tx) : addTransaction(tx)
    onClose()
  }

  const handleCategoryChange = (cat) => {
    set('category', cat)
    if (expenseCategories.includes(cat) || cat === 'LIQUIDEZ') {
      set('symbol', cat); set('cgId', null); set('amount', ''); set('priceUSD', '')
    }
  }

  if (showSearch && !isSimpleForm) {
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
          <label>Categoría</label>
          <select value={form.category} onChange={e => handleCategoryChange(e.target.value)}>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {isSimpleForm ? (
          <div className="form-group">
            <label>{isLiquidez ? 'Importe (USD) — negativo si es retirada' : 'Importe (USD) — negativo si es recuperación'}</label>
            <input type="number" inputMode="decimal" step="any" placeholder="0.00"
              value={form.totalUSD || ''} onChange={e => set('totalUSD', e.target.value)} autoFocus />
            {errors.totalUSD && <span style={{ color: 'var(--danger)', fontSize: '.78rem' }}>{errors.totalUSD}</span>}
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>Criptomoneda</label>
              <button className="btn btn-ghost" style={{ justifyContent: 'space-between' }} onClick={() => setShowSearch(true)}>
                {form.symbol ? `${form.symbol} — ${form.name}` : 'Seleccionar cripto…'}
                <span>›</span>
              </button>
              {errors.crypto && <span style={{ color: 'var(--danger)', fontSize: '.78rem' }}>{errors.crypto}</span>}
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
          </>
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
