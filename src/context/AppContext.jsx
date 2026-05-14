import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { save, load, encodeKey, decodeKey } from '../utils/storage'
import { fetchPricesByCgId } from '../services/coinGeckoApi'
import { genId } from '../utils/calculations'

const Ctx = createContext(null)
const REFRESH_MS = 5 * 60 * 1000

const initialState = {
  cgApiKeyEncoded: load('cgApiKey', ''),
  customCategories: load('categories', []),
  transactions: load('transactions', []),
  archivedSymbols: load('archived', []),
  prices: {},
  lastUpdated: null,
  isLoading: false,
  priceError: null,
  hideValues: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CG_KEY':      return { ...state, cgApiKeyEncoded: action.payload }
    case 'SET_CATEGORIES':  return { ...state, customCategories: action.payload }
    case 'SET_ARCHIVED':    return { ...state, archivedSymbols: action.payload }
    case 'TOGGLE_HIDE':     return { ...state, hideValues: !state.hideValues }
    case 'ADD_TX':          return { ...state, transactions: [...state.transactions, action.payload] }
    case 'EDIT_TX':         return { ...state, transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t) }
    case 'DELETE_TX':       return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) }
    case 'SET_TXS':         return { ...state, transactions: action.payload }
    case 'SET_PRICES':      return { ...state, prices: { ...state.prices, ...action.payload }, lastUpdated: Date.now(), isLoading: false, priceError: null }
    case 'LOADING':         return { ...state, isLoading: true, priceError: null }
    case 'PRICE_ERROR':     return { ...state, isLoading: false, priceError: action.payload }
    case 'IMPORT':          return { ...state, ...action.payload, prices: {}, archivedSymbols: action.payload.archivedSymbols || [] }
    default:                return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const timerRef = useRef(null)

  const cgApiKey = decodeKey(state.cgApiKeyEncoded)

  // Migración única: eliminar transacciones y categorías custom antiguas (gastos)
  useEffect(() => {
    const oldExpenseCats = load('expenseCategories', [])
    const oldCustomCats  = load('categories', [])
    const toRemove = [...new Set([...oldExpenseCats, ...oldCustomCats])]
    if (toRemove.length > 0) {
      const cleaned = state.transactions.filter(t => !toRemove.includes(t.category))
      dispatch({ type: 'SET_TXS', payload: cleaned })
      dispatch({ type: 'SET_CATEGORIES', payload: [] })
      localStorage.removeItem('cp_expenseCategories')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getCgIds = useCallback(() => {
    const ids = new Set()
    state.transactions.forEach(t => {
      if (t.cgId && !state.archivedSymbols.includes(t.symbol)) ids.add(t.cgId)
    })
    return [...ids]
  }, [state.transactions, state.archivedSymbols])

  const refreshPrices = useCallback(async () => {
    const ids = getCgIds()
    if (!ids.length) return
    dispatch({ type: 'LOADING' })
    try {
      const prices = await fetchPricesByCgId(ids, cgApiKey)
      dispatch({ type: 'SET_PRICES', payload: prices })
    } catch (e) {
      dispatch({ type: 'PRICE_ERROR', payload: e.message })
    }
  }, [getCgIds, cgApiKey])

  useEffect(() => {
    refreshPrices()
    timerRef.current = setInterval(refreshPrices, REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [refreshPrices])

  useEffect(() => { save('cgApiKey', state.cgApiKeyEncoded) }, [state.cgApiKeyEncoded])
  useEffect(() => { save('categories', state.customCategories) }, [state.customCategories])
  useEffect(() => { save('transactions', state.transactions) }, [state.transactions])
  useEffect(() => { save('archived', state.archivedSymbols) }, [state.archivedSymbols])

  const setCgApiKey = (raw) => dispatch({ type: 'SET_CG_KEY', payload: raw ? encodeKey(raw) : '' })

  const allCategories = ['BUY', 'SELL', 'LIQUIDEZ', ...state.customCategories]

  const addCategory = (name) => {
    const t = name.trim()
    if (!t || allCategories.includes(t)) return
    dispatch({ type: 'SET_CATEGORIES', payload: [...state.customCategories, t] })
  }

  const renameCategory = (oldName, newName) => {
    const t = newName.trim()
    if (!t || allCategories.includes(t)) return
    dispatch({ type: 'SET_CATEGORIES', payload: state.customCategories.map(c => c === oldName ? t : c) })
    state.transactions
      .filter(tx => tx.category === oldName)
      .forEach(tx => dispatch({ type: 'EDIT_TX', payload: { ...tx, category: t } }))
  }

  const deleteCategory = (name) =>
    dispatch({ type: 'SET_CATEGORIES', payload: state.customCategories.filter(c => c !== name) })

  const addTransaction = (tx) => dispatch({ type: 'ADD_TX', payload: { ...tx, id: genId() } })
  const editTransaction = (tx) => dispatch({ type: 'EDIT_TX', payload: tx })
  const deleteTransaction = (id) => dispatch({ type: 'DELETE_TX', payload: id })

  const toggleHideValues = () => dispatch({ type: 'TOGGLE_HIDE' })

  const archiveSymbol = (symbol) =>
    dispatch({ type: 'SET_ARCHIVED', payload: [...new Set([...state.archivedSymbols, symbol])] })

  const unarchiveSymbol = (symbol) =>
    dispatch({ type: 'SET_ARCHIVED', payload: state.archivedSymbols.filter(s => s !== symbol) })

  const reassignCgId = (symbol, newCgId, newName) => {
    state.transactions
      .filter(tx => tx.symbol === symbol)
      .forEach(tx => dispatch({ type: 'EDIT_TX', payload: { ...tx, cgId: newCgId, name: newName } }))
  }

  const exportData = (includeKey = false) => {
    const data = { version: 3, exportedAt: new Date().toISOString(), transactions: state.transactions, customCategories: state.customCategories, archivedSymbols: state.archivedSymbols }
    if (includeKey && state.cgApiKeyEncoded) data.cgApiKeyEncoded = state.cgApiKeyEncoded
    return data
  }

  const importData = (data) => {
    if (!data?.transactions) throw new Error('Formato inválido')
    dispatch({
      type: 'IMPORT',
      payload: {
        transactions: data.transactions || [],
        customCategories: data.customCategories || [],
        archivedSymbols: data.archivedSymbols || [],
        cgApiKeyEncoded: data.cgApiKeyEncoded || state.cgApiKeyEncoded,
      },
    })
  }

  return (
    <Ctx.Provider value={{
      ...state, cgApiKey, allCategories,
      setCgApiKey,
      addCategory, renameCategory, deleteCategory,
      addTransaction, editTransaction, deleteTransaction, reassignCgId,
      archivedSymbols: state.archivedSymbols, archiveSymbol, unarchiveSymbol,
      hideValues: state.hideValues, toggleHideValues,
      refreshPrices, exportData, importData,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
