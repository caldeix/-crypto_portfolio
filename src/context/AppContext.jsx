import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react'
import { save, load, encodeKey, decodeKey } from '../utils/storage'
import { fetchPricesByCgId, fetchCoinDetail } from '../services/coinGeckoApi'
import { genId, buildCycles, annotateTransactions } from '../utils/calculations'

const Ctx = createContext(null)

// Bumped to 4 when customBars and a pruned cgMeta joined the export payload.
// Files older than this are still imported: missing keys mean "keep what this
// device already has" (see importData).
const DATA_VERSION = 4

// Only the small, stable fields of cgMeta are worth syncing between devices.
// cachedDetail holds a whole coin description plus a market snapshot per coin
// (hundreds of KB over ~40 coins) and would ship stale prices that the
// receiving device keeps showing until the 24h TTL expires.
const pruneCgMeta = (cgMeta) => {
  const out = {}
  for (const [id, m] of Object.entries(cgMeta || {})) {
    if (!m) continue
    const kept = {}
    if (m.thumb)           kept.thumb           = m.thumb
    if (m.homepage)        kept.homepage        = m.homepage
    if (m.contractAddress) kept.contractAddress = m.contractAddress
    if (Object.keys(kept).length) out[id] = kept
  }
  return out
}

const initialState = {
  cgApiKeyEncoded: load('cgApiKey', ''),
  customCategories: load('categories', []),
  transactions: load('transactions', []),
  archivedSymbols: load('archived', []),
  cgMeta: load('cgMeta', {}),
  customBars: load('customBars', []),
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
    case 'SET_CG_META': {
      // Merge per coin, not per map. The payload from fetchPricesByCgId only
      // carries { thumb }, so a top-level spread replaced each coin's whole
      // entry and wiped homepage, contractAddress, cachedDetail and
      // detailFetchedAt on every price refresh — destroying the 24h detail
      // cache minutes after it was written.
      const merged = { ...state.cgMeta }
      for (const [cgId, meta] of Object.entries(action.payload)) {
        merged[cgId] = { ...merged[cgId], ...meta }
      }
      return { ...state, cgMeta: merged }
    }
    case 'MERGE_CG_META': {
      const { cgId, meta } = action.payload
      return { ...state, cgMeta: { ...state.cgMeta, [cgId]: { ...state.cgMeta[cgId], ...meta } } }
    }
    case 'SET_CUSTOM_BARS': return { ...state, customBars: action.payload }
    case 'IMPORT':          return {
      ...state, ...action.payload, prices: {},
      archivedSymbols: Array.isArray(action.payload.archivedSymbols) ? action.payload.archivedSymbols : [],
      customBars:      Array.isArray(action.payload.customBars)      ? action.payload.customBars      : state.customBars,
      cgMeta:          action.payload.cgMeta || state.cgMeta,
    }
    default:                return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const timerRef       = useRef(null)
  const cgMetaRef      = useRef(state.cgMeta)   // always-current cgMeta without dep issues
  const metaFetchedRef = useRef(new Set())       // which cgIds had detail fetched this session

  useEffect(() => { cgMetaRef.current = state.cgMeta }, [state.cgMeta])

  // Cycle segmentation depends only on transactions, so it survives the 2-5 min
  // price refreshes. Both buildPortfolio call sites share this one computation
  // instead of each recomputing it.
  const cycles = useMemo(() => buildCycles(state.transactions), [state.transactions])

  const cgApiKey = decodeKey(state.cgApiKeyEncoded)
  const REFRESH_MS = cgApiKey ? 2 * 60 * 1000 : 5 * 60 * 1000

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

  const DETAIL_TTL = 24 * 60 * 60 * 1000

  const refreshPrices = useCallback(async () => {
    const ids = getCgIds()
    if (!ids.length) return
    dispatch({ type: 'LOADING' })
    try {
      const { prices, meta } = await fetchPricesByCgId(ids, cgApiKey)
      dispatch({ type: 'SET_PRICES', payload: prices })
      if (Object.keys(meta).length) dispatch({ type: 'SET_CG_META', payload: meta })

      // Background-fetch full coin detail for coins with no cache or stale cache (>24h).
      // Uses cgMetaRef to read latest without adding it as a dep.
      const needsDetail = ids.filter(id => {
        if (metaFetchedRef.current.has(id)) return false
        const m = cgMetaRef.current[id]
        const age = m?.detailFetchedAt ? Date.now() - m.detailFetchedAt : Infinity
        return !m?.cachedDetail || age > DETAIL_TTL
      })
      if (needsDetail.length > 0) {
        needsDetail.forEach(id => metaFetchedRef.current.add(id));
        (async () => {
          for (const cgId of needsDetail) {
            try {
              await new Promise(r => setTimeout(r, 900))
              const detail = await fetchCoinDetail(cgId, cgApiKey)
              const patch = { cachedDetail: detail, detailFetchedAt: Date.now() }
              if (detail.homepage)        patch.homepage        = detail.homepage
              if (detail.contractAddress) patch.contractAddress = detail.contractAddress
              dispatch({ type: 'MERGE_CG_META', payload: { cgId, meta: patch } })
            } catch {
              metaFetchedRef.current.delete(cgId)
            }
          }
        })()
      }
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
  useEffect(() => { save('cgMeta', state.cgMeta) }, [state.cgMeta])
  useEffect(() => { save('customBars', state.customBars) }, [state.customBars])

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

  const saveCgMeta = (cgId, meta) => {
    if (!cgId) return
    dispatch({ type: 'MERGE_CG_META', payload: { cgId, meta } })
  }

  const addCustomBar = (bar) =>
    dispatch({ type: 'SET_CUSTOM_BARS', payload: [...state.customBars, { ...bar, id: genId() }] })
  const deleteCustomBar = (id) =>
    dispatch({ type: 'SET_CUSTOM_BARS', payload: state.customBars.filter(b => b.id !== id) })

  const reassignCgId = (symbol, newCgId, newName, thumb) => {
    state.transactions
      .filter(tx => tx.symbol === symbol)
      .forEach(tx => dispatch({ type: 'EDIT_TX', payload: { ...tx, cgId: newCgId, name: newName } }))
    if (thumb) saveCgMeta(newCgId, { thumb })
  }

  const exportData = (includeKey = false) => {
    const data = {
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      // realized is derived, never stored — dumped here so it is visible when
      // you open the JSON. It is ignored on import and recomputed.
      transactions: annotateTransactions(state.transactions, cycles),
      customCategories: state.customCategories,
      archivedSymbols: state.archivedSymbols,
      customBars: state.customBars,
      cgMeta: pruneCgMeta(state.cgMeta),
    }
    if (includeKey && state.cgApiKeyEncoded) data.cgApiKeyEncoded = state.cgApiKeyEncoded
    return data
  }

  const importData = (data) => {
    if (!data?.transactions) throw new Error('Formato inválido')

    const warnings = []
    if (typeof data.version === 'number' && data.version > DATA_VERSION) {
      warnings.push('El archivo viene de una versión más nueva de la app. Puede que se ignoren datos que este dispositivo aún no entiende.')
    }

    // An absent key means "keep whatever this device already has". A v3 file
    // carries no customBars, and the bars are hand-built with no undo, so
    // wiping them would be unrecoverable. Array.isArray rather than a
    // truthiness check is deliberate: an explicit [] from a newer file means
    // the other device deleted its bars, and that deletion must sync.
    const customBars = Array.isArray(data.customBars) ? data.customBars : state.customBars

    // cgMeta merges per coin instead of replacing, so thumbnails this device
    // already fetched survive an import from a device that had fewer of them.
    const incomingMeta = data.cgMeta && typeof data.cgMeta === 'object' ? data.cgMeta : null
    const cgMeta = incomingMeta
      ? Object.keys(incomingMeta).reduce(
          (acc, id) => { acc[id] = { ...state.cgMeta[id], ...incomingMeta[id] }; return acc },
          { ...state.cgMeta },
        )
      : state.cgMeta

    dispatch({
      type: 'IMPORT',
      payload: {
        transactions: data.transactions || [],
        customCategories: data.customCategories || [],
        archivedSymbols: data.archivedSymbols || [],
        customBars,
        cgMeta,
        cgApiKeyEncoded: data.cgApiKeyEncoded || state.cgApiKeyEncoded,
      },
    })

    return {
      version:  typeof data.version === 'number' ? data.version : null,
      txCount:  (data.transactions || []).length,
      barCount: Array.isArray(data.customBars) ? data.customBars.length : null,
      metaCount: incomingMeta ? Object.keys(incomingMeta).length : 0,
      warnings,
    }
  }

  return (
    <Ctx.Provider value={{
      ...state, cgApiKey, allCategories, cycles,
      setCgApiKey,
      addCategory, renameCategory, deleteCategory,
      addTransaction, editTransaction, deleteTransaction, reassignCgId,
      cgMeta: state.cgMeta, saveCgMeta,
      archivedSymbols: state.archivedSymbols, archiveSymbol, unarchiveSymbol,
      hideValues: state.hideValues, toggleHideValues,
      customBars: state.customBars, addCustomBar, deleteCustomBar,
      refreshPrices, exportData, importData,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
