# Prompt: Generar Vault Obsidian — Crypto Portfolio Tracker

> Copia este prompt completo y pégalo en una sesión de Claude.
> El resultado será un vault de Obsidian con documentación técnica 100% fiel al código real.

---

## PROMPT

Eres un ingeniero senior de documentación técnica. Tu tarea es generar un **vault de Obsidian completo** con documentación técnica exhaustiva de la aplicación **Crypto Portfolio Tracker**.

El vault debe:
- Usar **wikilinks** de Obsidian (`[[Nota]]`) para enlazar entre notas
- Incluir **callouts** de Obsidian (`> [!info]`, `> [!warning]`, `> [!tip]`) donde aporten valor
- Tener **frontmatter YAML** en cada nota con `tags`, `created` y `updated`
- Usar **Mermaid diagrams** para flujos, arquitectura y relaciones
- Ser 100% fiel al código real que se proporciona a continuación
- Estar escrito en **español**

---

## ESTRUCTURA DEL VAULT A GENERAR

Genera exactamente estos archivos (con el contenido especificado para cada uno):

```
docs/vault/
├── 00-MOC.md
├── arquitectura/
│   ├── vision-general.md
│   ├── stack-tecnologico.md
│   ├── estructura-carpetas.md
│   └── flujo-de-datos.md
├── estado/
│   ├── app-context.md
│   ├── reducer-y-acciones.md
│   └── persistencia-localstorage.md
├── componentes/
│   ├── App.md
│   ├── Dashboard.md
│   ├── CryptoCard.md
│   ├── CryptoDetail.md
│   ├── Stats.md
│   ├── TransactionHistory.md
│   ├── StatusBanner.md
│   ├── GlobalSearchScreen.md
│   └── modals/
│       ├── AddTransactionModal.md
│       ├── ConfigModal.md
│       ├── ImportExportModal.md
│       └── SearchCryptoModal.md
├── servicios/
│   └── coinGeckoApi.md
├── utils/
│   ├── calculations.md
│   └── storage.md
├── diseno/
│   ├── sistema-colores.md
│   └── layout-y-responsive.md
└── decisiones/
    └── decisiones-tecnicas.md
```

---

## ESPECIFICACIÓN DE CADA NOTA

### `00-MOC.md`
Map of Content principal. Incluye:
- Descripción de la app en 3-4 líneas
- Tabla con los 4 módulos principales (Arquitectura, Estado, Componentes, Servicios/Utils) y sus notas enlazadas
- Diagrama Mermaid de alto nivel del grafo de dependencias entre módulos
- Links rápidos a las decisiones técnicas más importantes

### `arquitectura/vision-general.md`
- Qué es la app, para qué sirve
- Principio de autocustodia (sin servidor, localStorage)
- Diagrama Mermaid: flujo usuario → app → CoinGecko API → localStorage
- Cómo se despliega (Vite build → gh-pages → GitHub Pages)
- URL de producción: `https://caldeix.github.io/-crypto_portfolio/`

### `arquitectura/stack-tecnologico.md`
Tabla completa del stack con versión, rol y por qué se eligió:

| Tecnología | Versión | Rol |
|---|---|---|
| React | 18.3.1 | UI reactiva con hooks |
| Vite | 6.x | Bundler y dev server |
| gh-pages | — | Deploy a GitHub Pages |
| CoinGecko API | v3 | Precios y datos de mercado |

Sin librerías de routing (navegación por `useState`), sin librerías de gráficas (SVG custom), sin Redux (useReducer propio).

### `arquitectura/estructura-carpetas.md`
Árbol completo real del proyecto:
```
src/
├── App.jsx               ← Raíz: tabs, navegación, overlay de detalle
├── main.jsx              ← Entry point, AppProvider
├── index.css             ← Design system completo (variables CSS)
├── context/
│   └── AppContext.jsx    ← Estado global, reducer, API refresh
├── components/
│   ├── Dashboard.jsx
│   ├── CryptoCard.jsx
│   ├── CryptoDetail.jsx
│   ├── Stats.jsx
│   ├── TransactionHistory.jsx
│   ├── StatusBanner.jsx
│   ├── GlobalSearchScreen.jsx
│   └── modals/
│       ├── AddTransactionModal.jsx
│       ├── ConfigModal.jsx
│       ├── ImportExportModal.jsx
│       └── SearchCryptoModal.jsx
├── services/
│   └── coinGeckoApi.js
└── utils/
    ├── calculations.js
    └── storage.js
```
Explica el rol de cada carpeta y por qué tiene esa estructura.

### `arquitectura/flujo-de-datos.md`
Diagrama Mermaid detallado del flujo completo:
- Usuario añade transacción → dispatch ADD_TX → reducer → localStorage
- App monta → refreshPrices → fetchPricesByCgId → SET_PRICES → buildPortfolio (useMemo) → cards se renderizan
- Background fetch: refreshPrices completa → detecta coins sin cachedDetail → fetchCoinDetail × N (900ms delay) → MERGE_CG_META → cgMeta persiste
- Usuario abre CryptoDetail → lee cgMeta.cachedDetail → si stale → fetchCoinDetail → actualiza cgMeta

### `estado/app-context.md`
Documentación completa de `AppContext.jsx`:
- `initialState`: cada campo con su tipo, valor por defecto y qué representa
- Tabla de valores del state:

| Campo | Tipo | Descripción |
|---|---|---|
| `cgApiKeyEncoded` | string | API key de CoinGecko codificada en base64 |
| `customCategories` | string[] | Categorías adicionales creadas por el usuario |
| `transactions` | Transaction[] | Historial completo de operaciones |
| `archivedSymbols` | string[] | Symbols archivados por el usuario |
| `cgMeta` | Record<cgId, CoinMeta> | Cache de metadatos de CoinGecko |
| `customBars` | CustomBar[] | Configuración de barras en Stats |
| `prices` | Record<cgId, PriceData> | Precios en tiempo real |
| `lastUpdated` | number\|null | Timestamp del último refresh |
| `isLoading` | boolean | Indica refresh de precios en curso |
| `priceError` | string\|null | Error del último fetch |
| `hideValues` | boolean | Modo privado activo |

- Cómo se conectan los `useEffect` de persistencia (uno por campo de localStorage)
- `getCgIds`: qué hace y por qué excluye archivadas
- `refreshPrices`: flujo completo incluyendo el background fetch de `cachedDetail`
- `DETAIL_TTL = 24h`: por qué 24 horas
- Todos los métodos expuestos en el context value

### `estado/reducer-y-acciones.md`
Tabla de todas las acciones del reducer:

| Action type | Payload | Efecto |
|---|---|---|
| `SET_CG_KEY` | string | Actualiza API key codificada |
| `SET_CATEGORIES` | string[] | Reemplaza categorías custom |
| `SET_ARCHIVED` | string[] | Reemplaza lista de archivadas |
| `TOGGLE_HIDE` | — | Alterna hideValues |
| `ADD_TX` | Transaction | Añade transacción al array |
| `EDIT_TX` | Transaction | Reemplaza tx por id |
| `DELETE_TX` | string (id) | Elimina tx por id |
| `SET_TXS` | Transaction[] | Reemplaza array completo |
| `SET_PRICES` | Record | Merge de precios, resetea error/loading |
| `LOADING` | — | isLoading=true, priceError=null |
| `PRICE_ERROR` | string | isLoading=false, priceError=msg |
| `SET_CG_META` | Record | Merge shallow de cgMeta |
| `MERGE_CG_META` | {cgId, meta} | Deep merge de un solo coin en cgMeta |
| `SET_CUSTOM_BARS` | CustomBar[] | Reemplaza barras custom |
| `IMPORT` | Partial<State> | Restaura datos importados |

Explica la diferencia entre `SET_CG_META` (merge shallow) y `MERGE_CG_META` (deep merge por coin) y por qué existe esa distinción.

### `estado/persistencia-localstorage.md`
- Prefijo de keys: `cp_`
- Tabla de todas las keys:

| Key localStorage | Contenido | Cuándo se escribe |
|---|---|---|
| `cp_cgApiKey` | API key codificada | Al cambiar la key |
| `cp_categories` | string[] | Al añadir/borrar categorías |
| `cp_transactions` | Transaction[] | En cada add/edit/delete |
| `cp_archived` | string[] | Al archivar/desarchivar |
| `cp_cgMeta` | CoinMeta record | En cada MERGE_CG_META / SET_CG_META |
| `cp_customBars` | CustomBar[] | Al editar barras en Stats |

- `encodeKey` / `decodeKey`: base64, por qué (ofuscación mínima, no seguridad real)
- `load(key, default)`: JSON.parse con fallback
- `save(key, value)`: JSON.stringify
- Diagrama de ciclo de vida: React state ↔ useEffect ↔ localStorage

### `componentes/App.md`
- Responsabilidad: shell de la aplicación
- Navegación por tabs con `useState` (sin React Router): `tab` puede ser `'dashboard'|'history'|'stats'`
- Overlay de `CryptoDetail`: se monta encima del contenido (`selectedEntry` state), no es una ruta
- `StatusBanner` siempre visible arriba
- Bottom nav fijo con FAB (+) flotante (overflow visible)
- SVG icons inline para Home, List, BarChart, Settings
- Diagrama del layout general (header/banner + content + bottom-nav/FAB)

### `componentes/Dashboard.md`
- Props: `{ onOpenDetail }`
- State local: `reassignTarget`, `showArchived`, `sortBy`, `showGlobalSearch`, `hiddenChips`
- `portfolio = buildPortfolio(transactions, prices)` — useMemo
- `active` = portfolio filtrado sin archivadas
- `archived` = portfolio con archivadas
- `totals = buildTotals(active, transactions)` — useMemo
- `total24hUSD`: reducción de `active` usando `currentValue * (change24h / 100)`
- `mv(v)`: oculta valores si `hideValues`
- `mvChip(v, key)`: oculta si `hideValues` OR si la chip está en `hiddenChips`
- Toggle de Liquidez: `hiddenChips` Set con key `'LIQUIDEZ'`
- Sort keys: `value`, `pct`, `pnl` — cada uno con `-desc` y `-asc`
- `sortFn(key)`: switch que devuelve comparador
- Sección archivadas: colapsable, botón toggle
- `SearchCryptoModal` para reasignar
- `GlobalSearchScreen` abre con lupa
- Cuando `GlobalSearchScreen` selecciona una crypto sin portfolio: construye un entry sintético con zeros y llama `onOpenDetail`

### `componentes/CryptoCard.md`
- Props: `{ entry, onClick, onReassign, onArchive, archived }`
- Datos leídos de `entry`: todos los campos de `buildPortfolio`
- `meta = cgMeta[entry.cgId]`: thumb, homepage, contractAddress
- `mv(v)`: enmascara con `••••` si `hideValues`
- Grid 3×4: documentar exactamente qué va en cada celda
- Fila 4: solo `Rent.` en `gridColumn: 3`
- Botón 🔗: `e.stopPropagation()` para no abrir el detalle
- Botón 🗄️/📤: archivo / desarchivo
- Colores pos/neg: clases CSS `.pos` y `.neg`

### `componentes/CryptoDetail.md`
- Props: `{ entry, onClose }`
- `DETAIL_TTL = 24 * 60 * 60 * 1000` — constante de módulo
- Init desde caché: `useState(cgMeta[cgId]?.cachedDetail ?? null)`
- `loadingInfo` init: `cachedDetail === null` — sin spinner si hay cache
- `retryKey` state: incrementarlo fuerza re-fetch ignorando cache
- `useEffect` de detail: si `retryKey===0` y cache fresco → no fetch
- Retry automático: `attempt < 1` → espera 3s → reintenta
- Al éxito: `saveCgMeta(cgId, { cachedDetail, detailFetchedAt, homepage?, contractAddress? })`
- `displayPrice`: `currentPrice || coinInfo?.currentPrice || 0`
- Sección "Tu posición": solo si `entry.amountHeld > 0`
- Sección "Info": `homepage = coinInfo?.homepage || cgMeta[cgId]?.homepage`
- Copy al portapapeles: `navigator.clipboard.writeText(contractAddress)` + feedback `copied` 2s
- `PriceChart`: componente interno, SVG puro, interacción mouse+touch
- Rangos: 1D, 7D, 1M, 3M → `fetchMarketChart(cgId, days)`

### `componentes/Stats.md`
- `CustomBarEditor`: `leftCgIds` es array (multiselect), `rightCgId` es string
- `toggleLeft(cgId)`: si el nuevo left incluye rightCgId → resetea right a `'REST'`
- Filtro inline: `filterRef` + `useEffect` para cerrar al click fuera (patrón outside-click)
- Dropdown de filtro: `position: absolute; top: calc(100%+6px); right:0`
- `customBars` guardadas en AppContext

### `componentes/TransactionHistory.md`
- Lista de todas las transacciones ordenada por fecha desc
- Edición y borrado con confirmación
- Agrupa o filtra por moneda/tipo

### `componentes/StatusBanner.md`
- Lee `isLoading`, `lastUpdated`, `priceError` del context
- Botón ↻ icon-only, `disabled` cuando `isLoading`
- `lastUpdated`: formatea como "Actualizado hace X min"

### `componentes/GlobalSearchScreen.md`
- Overlay fullscreen sobre toda la app
- Debounce 350ms en el input de búsqueda
- Llama `searchCG(query)` de coinGeckoApi
- Resultados: thumb (o avatar de letras), symbol, name, rank
- Al seleccionar: `onSelect(crypto)` con `{ cgId, symbol, name, thumb, rank }`
- Auto-focus al montar

### `componentes/modals/AddTransactionModal.md`
- `prefill`: objeto opcional para prellenar campos (cgId, symbol, name)
- Modo creación vs edición (si se pasa `tx` existente)
- Cálculo automático total ↔ precio: si escribes el total calcula precio, y viceversa
- Búsqueda de moneda: abre `SearchCryptoModal`
- Categorías disponibles: `allCategories` del context
- Validación antes de submit

### `componentes/modals/ConfigModal.md`
- API Key: input + guardar (llama `setCgApiKey`)
- Categorías custom: añadir, renombrar, eliminar
- Gestión de categorías: no puede renombrar a un nombre existente

### `componentes/modals/ImportExportModal.md`
- Exportar: llama `exportData(includeKey?)` → `JSON.stringify` → `Blob` → `URL.createObjectURL` → `<a download>`
- Importar: `FileReader` → `JSON.parse` → `importData(data)` → dispatch `IMPORT`
- `version: 3` del formato de exportación
- Warning: importar reemplaza todo

### `componentes/modals/SearchCryptoModal.md`
- Input de búsqueda → `searchCG(query)` → lista resultados
- Resultado: `{ cgId, symbol, name, rank, thumb }`
- Usada desde: `AddTransactionModal` (asignar moneda) y `Dashboard` (reasignar coin)

### `servicios/coinGeckoApi.md`
- `BASE = 'https://api.coingecko.com/api/v3'`
- `get(path, cgApiKey, timeoutMs=12000)`: función base con `AbortController` de 12s
- Header: `x-cg-demo-api-key` si hay key
- Tabla de endpoints usados:

| Función | Endpoint | Parámetros | Retorna |
|---|---|---|---|
| `searchCG` | `/search` | query | `{cgId, symbol, name, rank, thumb}[]` |
| `fetchMarketChart` | `/coins/{id}/market_chart` | days, currency=usd | `[[timestamp, price]]` |
| `fetchCoinDetail` | `/coins/{id}` | localization=false, etc | CoinDetail completo |
| `fetchPricesByCgId` | `/coins/markets` | ids[], per_page=250 | `{prices, meta}` |

- `fetchCoinDetail` retorna: rank, currentPrice, change24h, marketCap, volume24h, high24h, low24h, change7d, change30d, ath, athChange, atl, atlChange, description (sin HTML), homepage, contractAddress
- `contractAddress`: prioridad `platforms.solana` → `platforms.ethereum` → primer valor disponible
- `fetchPricesByCgId`: retorna `{prices: {[cgId]: {price, percent_change_24h}}, meta: {[cgId]: {thumb}}}`

### `utils/calculations.md`
Documenta cada función exportada:

**`genId()`**: `Date.now().toString(36) + Math.random().toString(36).slice(2)`

**`fmt(n)`**: Formatea USD. Usa `Intl.NumberFormat` con locale `es-ES`, currency USD, 2 decimales. Para valores < 0.01 usa hasta 6 decimales.

**`fmtPrice(n)`**: Similar a fmt pero para precios unitarios (más decimales para tokens pequeños).

**`fmtPct(n)`**: Formatea como porcentaje con signo `+/-`.

**`fmtAmount(n)`**: Formatea cantidad de tokens (sin símbolo de moneda).

**`fmtCompact(n)`**: Formatea con sufijos K/M/B para números grandes (market cap, volume).

**`buildPortfolio(transactions, prices)`**:
- Agrupa transacciones por `symbol`
- Por cada grupo calcula:
  - `amountHeld`: sum(BUY.amount) - sum(SELL.amount)
  - `totalCostBasis`: sum(BUY.total)
  - `totalSaleProceeds`: sum(SELL.total)  
  - `avgBuy`: totalCostBasis / sum(BUY.amount)
  - `avgSell`: totalSaleProceeds / sum(SELL.amount)
  - `currentPrice`: de `prices[cgId]?.price || 0`
  - `currentValue`: amountHeld × currentPrice
  - `invested`: totalCostBasis - totalSaleProceeds (capital neto en riesgo)
  - `soldValue`: totalSaleProceeds
  - `profitabilityUSD`: currentValue + soldValue - totalCostBasis (P&L total)
  - `profitability`: profitabilityUSD / totalCostBasis (rentabilidad %)
  - `unrealizedUSD`: (currentPrice - avgBuy) × amountHeld (P&L posición)
  - `unrealizedPct`: unrealizedUSD / (avgBuy × amountHeld)
  - `change24h`: de `prices[cgId]?.percent_change_24h || 0`
- Retorna array de entries

**`buildTotals(activeEntries, transactions)`**:
- `totalCurrentValue`: sum(entry.currentValue)
- `totalNetInvested`: sum(entry.invested)  
- `totalPnL`: sum(entry.profitabilityUSD)
- `totalPct`: totalPnL / sum(entry.totalCostBasis)
- `totalLiquidez`: sum de transacciones con category === 'LIQUIDEZ'

Incluye diagrama Mermaid del flujo de cálculo.

### `utils/storage.md`
- `save(key, value)`: `localStorage.setItem('cp_' + key, JSON.stringify(value))`
- `load(key, default)`: `JSON.parse(localStorage.getItem('cp_' + key)) ?? default` con try/catch
- `encodeKey(raw)`: `btoa(raw)` — base64
- `decodeKey(encoded)`: `atob(encoded)` con try/catch → `''` si falla

### `diseno/sistema-colores.md`
Variables CSS completas y su significado:

```css
/* Fondos */
--bg: #090A0F           /* fondo de pantalla */
--surface: #0D0F1A      /* superficies elevadas (modals, banners) */
--card: #16192B         /* tarjetas */
--card-hover: #1E2238   /* tarjetas al hover */

/* Bordes */
--border: rgba(255,255,255,0.06)

/* Marca */
--primary: #D4AF37      /* Beskar Gold — acción principal */
--primary-dim: rgba(212,175,55,.15)
--secondary: #8A2BE2    /* Lila Yifu — acento secundario */

/* Semánticos */
--success: #00FF66      /* positivo, ganancia */
--danger: #FF3333       /* negativo, pérdida */

/* Texto */
--text: #FFFFFF
--text-muted: #A0AEC0
--text-dim: rgba(255,255,255,0.35)

/* Layout */
--radius: 14px
--nav-h: 50px           /* altura del bottom nav */
--banner-h: 34px        /* altura del StatusBanner */

/* Sombras de luz */
--glow-gold: 0 0 16px rgba(212,175,55,.35)
--glow-purple: 0 0 16px rgba(138,43,226,.35)
```

Explica la filosofía: tema oscuro futurista "cripto-nativo", dorado como primario (confianza, valor), verde/rojo saturados para ganancia/pérdida, sin grises planos.

### `diseno/layout-y-responsive.md`
- Mobile-first, breakpoint desktop en `768px`
- `.bottom-nav`: `position: fixed; bottom: 0; height: var(--nav-h); overflow: visible`
- FAB (+): `margin-top: -26px` sobre el nav para efecto "half-out"
- `.main-content`: `padding-bottom: calc(var(--nav-h) + 32px)` para no quedar tapado
- StatusBanner: `position: sticky; top: 0; height: var(--banner-h)`
- Modals: `height: 100dvh; max-height: 100dvh` en mobile / tamaño fijo en desktop
- Grid de cards: CSS Grid, 1 col mobile / 2 col desktop
- Stats grid: 3 columnas, `grid-column: 3` para Rent en fila 4

### `decisiones/decisiones-tecnicas.md`
Documenta cada decisión de arquitectura con su razonamiento:

1. **Sin React Router**: navegación por `useState` + overlay. La app es single-view sin URLs que compartir, el overhead de un router no aporta.

2. **Sin Redux / Zustand**: `useReducer + useContext` es suficiente para este dominio. Evita dependencias y mantiene el state colocado.

3. **Sin librería de gráficas**: SVG custom para la gráfica de precios. Evita 200KB+ de bundle (Chart.js, Recharts). La gráfica es simple (línea + área + hover).

4. **localStorage como única persistencia**: filosofía de autocustodia. Sin servidor = sin cuenta = sin brecha de datos. El JSON de exportación es el "backup".

5. **CoinGecko v3 (free tier)**: suficiente para portfolios personales. Rate limit gestionado con delays de 900ms entre calls en el background fetch.

6. **cachedDetail en cgMeta (TTL 24h)**: los datos de detalle (ATH, descripción, contrato) son semi-estáticos. Cachear 24h elimina latencia en UX sin sacrificar precisión.

7. **MERGE_CG_META vs SET_CG_META**: `SET_CG_META` hace merge shallow de todo cgMeta (para el bulk de precios). `MERGE_CG_META` hace deep merge de un coin específico para no perder campos existentes (thumb, homepage, etc.) al actualizar solo contractAddress.

8. **AbortController con 12s timeout**: CoinGecko free puede ser lento. Sin timeout, `fetch` espera indefinidamente. 12s es suficiente para conexiones lentas y no congela la UI.

9. **retryKey en CryptoDetail**: permite forzar re-fetch sin desmontar el componente, conservando el state del chart y la UI.

10. **gh-pages para deploy**: `npm run deploy` publica directamente a GitHub Pages. Zero config, zero coste.

---

## CÓDIGO FUENTE COMPLETO

A continuación se proporciona el código real de cada archivo para que la documentación sea 100% fiel.

### `src/context/AppContext.jsx`
```jsx
import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { save, load, encodeKey, decodeKey } from '../utils/storage'
import { fetchPricesByCgId, fetchCoinDetail } from '../services/coinGeckoApi'
import { genId } from '../utils/calculations'

const Ctx = createContext(null)

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
    case 'SET_CG_META':     return { ...state, cgMeta: { ...state.cgMeta, ...action.payload } }
    case 'MERGE_CG_META': {
      const { cgId, meta } = action.payload
      return { ...state, cgMeta: { ...state.cgMeta, [cgId]: { ...state.cgMeta[cgId], ...meta } } }
    }
    case 'SET_CUSTOM_BARS': return { ...state, customBars: action.payload }
    case 'IMPORT':          return { ...state, ...action.payload, prices: {}, archivedSymbols: action.payload.archivedSymbols || [], cgMeta: action.payload.cgMeta || state.cgMeta }
    default:                return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const timerRef       = useRef(null)
  const cgMetaRef      = useRef(state.cgMeta)
  const metaFetchedRef = useRef(new Set())

  useEffect(() => { cgMetaRef.current = state.cgMeta }, [state.cgMeta])

  const cgApiKey = decodeKey(state.cgApiKeyEncoded)
  const REFRESH_MS = cgApiKey ? 2 * 60 * 1000 : 5 * 60 * 1000
  const DETAIL_TTL = 24 * 60 * 60 * 1000

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
  }, [])

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
      const { prices, meta } = await fetchPricesByCgId(ids, cgApiKey)
      dispatch({ type: 'SET_PRICES', payload: prices })
      if (Object.keys(meta).length) dispatch({ type: 'SET_CG_META', payload: meta })

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
  const addCategory = (name) => { const t = name.trim(); if (!t || allCategories.includes(t)) return; dispatch({ type: 'SET_CATEGORIES', payload: [...state.customCategories, t] }) }
  const renameCategory = (oldName, newName) => { const t = newName.trim(); if (!t || allCategories.includes(t)) return; dispatch({ type: 'SET_CATEGORIES', payload: state.customCategories.map(c => c === oldName ? t : c) }); state.transactions.filter(tx => tx.category === oldName).forEach(tx => dispatch({ type: 'EDIT_TX', payload: { ...tx, category: t } })) }
  const deleteCategory = (name) => dispatch({ type: 'SET_CATEGORIES', payload: state.customCategories.filter(c => c !== name) })
  const addTransaction = (tx) => dispatch({ type: 'ADD_TX', payload: { ...tx, id: genId() } })
  const editTransaction = (tx) => dispatch({ type: 'EDIT_TX', payload: tx })
  const deleteTransaction = (id) => dispatch({ type: 'DELETE_TX', payload: id })
  const toggleHideValues = () => dispatch({ type: 'TOGGLE_HIDE' })
  const archiveSymbol = (symbol) => dispatch({ type: 'SET_ARCHIVED', payload: [...new Set([...state.archivedSymbols, symbol])] })
  const unarchiveSymbol = (symbol) => dispatch({ type: 'SET_ARCHIVED', payload: state.archivedSymbols.filter(s => s !== symbol) })
  const saveCgMeta = (cgId, meta) => { if (!cgId) return; dispatch({ type: 'MERGE_CG_META', payload: { cgId, meta } }) }
  const addCustomBar = (bar) => dispatch({ type: 'SET_CUSTOM_BARS', payload: [...state.customBars, { ...bar, id: genId() }] })
  const deleteCustomBar = (id) => dispatch({ type: 'SET_CUSTOM_BARS', payload: state.customBars.filter(b => b.id !== id) })
  const reassignCgId = (symbol, newCgId, newName, thumb) => { state.transactions.filter(tx => tx.symbol === symbol).forEach(tx => dispatch({ type: 'EDIT_TX', payload: { ...tx, cgId: newCgId, name: newName } })); if (thumb) saveCgMeta(newCgId, { thumb }) }
  const exportData = (includeKey = false) => { const data = { version: 3, exportedAt: new Date().toISOString(), transactions: state.transactions, customCategories: state.customCategories, archivedSymbols: state.archivedSymbols }; if (includeKey && state.cgApiKeyEncoded) data.cgApiKeyEncoded = state.cgApiKeyEncoded; return data }
  const importData = (data) => { if (!data?.transactions) throw new Error('Formato inválido'); dispatch({ type: 'IMPORT', payload: { transactions: data.transactions || [], customCategories: data.customCategories || [], archivedSymbols: data.archivedSymbols || [], cgApiKeyEncoded: data.cgApiKeyEncoded || state.cgApiKeyEncoded } }) }

  return (
    <Ctx.Provider value={{
      ...state, cgApiKey, allCategories,
      setCgApiKey, addCategory, renameCategory, deleteCategory,
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
```

### `src/utils/calculations.js`
```js
export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '$0.00'
  const abs = Math.abs(n)
  const opts = abs < 0.01 && abs > 0
    ? { minimumFractionDigits: 2, maximumFractionDigits: 6 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', ...opts }).format(n)
}

export const fmtPrice = (n) => {
  if (!n && n !== 0) return '—'
  if (n >= 1) return fmt(n)
  if (n >= 0.0001) return '$' + n.toFixed(6)
  return '$' + n.toExponential(4)
}

export const fmtPct = (n) => {
  if (n === null || n === undefined) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(2)}%`
}

export const fmtAmount = (n) => {
  if (!n && n !== 0) return '—'
  if (n >= 1000) return n.toLocaleString('es-ES', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(8)
}

export const fmtCompact = (n) => {
  if (!n) return '—'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  return fmt(n)
}

export const buildPortfolio = (transactions, prices) => {
  const map = {}
  for (const tx of transactions) {
    if (tx.category === 'LIQUIDEZ') continue
    const key = tx.symbol
    if (!map[key]) map[key] = { symbol: tx.symbol, name: tx.name, cgId: tx.cgId, buys: [], sells: [] }
    if (tx.category === 'BUY' || (!['SELL','LIQUIDEZ'].includes(tx.category))) {
      if (tx.category === 'SELL') map[key].sells.push(tx)
      else map[key].buys.push(tx)
    }
    if (tx.category === 'SELL') map[key].sells.push(tx)
    else if (tx.category !== 'SELL') map[key].buys.push(tx)
  }
  // simplified: remap
  const grouped = {}
  for (const tx of transactions) {
    if (tx.category === 'LIQUIDEZ') continue
    const k = tx.symbol
    if (!grouped[k]) grouped[k] = { symbol: tx.symbol, name: tx.name, cgId: tx.cgId, buys: [], sells: [] }
    if (tx.category === 'BUY') grouped[k].buys.push(tx)
    else if (tx.category === 'SELL') grouped[k].sells.push(tx)
  }
  return Object.values(grouped).map(e => {
    const totalBought  = e.buys.reduce((s, t) => s + t.amount, 0)
    const totalSold    = e.sells.reduce((s, t) => s + t.amount, 0)
    const amountHeld   = Math.max(totalBought - totalSold, 0)
    const costBasis    = e.buys.reduce((s, t) => s + t.total, 0)
    const saleProceeds = e.sells.reduce((s, t) => s + t.total, 0)
    const avgBuy  = totalBought > 0 ? costBasis / totalBought : 0
    const avgSell = totalSold   > 0 ? saleProceeds / totalSold : 0
    const currentPrice    = prices[e.cgId]?.price || 0
    const currentValue    = amountHeld * currentPrice
    const invested        = Math.max(costBasis - saleProceeds, 0)
    const profitabilityUSD = currentValue + saleProceeds - costBasis
    const profitability   = costBasis > 0 ? profitabilityUSD / costBasis : 0
    const unrealizedUSD   = avgBuy > 0 && currentPrice > 0 ? (currentPrice - avgBuy) * amountHeld : 0
    const unrealizedPct   = avgBuy > 0 && amountHeld > 0 ? (currentPrice - avgBuy) / avgBuy : null
    const change24h       = prices[e.cgId]?.percent_change_24h || 0
    return { ...e, amountHeld, currentPrice, currentValue, avgBuy, avgSell,
      profitability, profitabilityUSD, unrealizedPct, unrealizedUSD,
      invested, soldValue: saleProceeds, change24h }
  })
}

export const buildTotals = (activeEntries, transactions) => {
  const totalCurrentValue  = activeEntries.reduce((s, e) => s + e.currentValue, 0)
  const totalNetInvested   = activeEntries.reduce((s, e) => s + e.invested, 0)
  const totalPnL           = activeEntries.reduce((s, e) => s + e.profitabilityUSD, 0)
  const totalCostBasis     = activeEntries.reduce((s, e) => s + (e.buys?.reduce((a, t) => a + t.total, 0) || 0), 0)
  const totalPct           = totalCostBasis > 0 ? totalPnL / totalCostBasis : 0
  const totalLiquidez      = transactions.filter(t => t.category === 'LIQUIDEZ').reduce((s, t) => s + t.total, 0)
  return { totalCurrentValue, totalNetInvested, totalPnL, totalPct, totalLiquidez }
}
```

### `src/utils/storage.js`
```js
const PREFIX = 'cp_'
export const save = (key, value) => {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch {}
}
export const load = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(PREFIX + key)
    return item !== null ? JSON.parse(item) : defaultValue
  } catch { return defaultValue }
}
export const encodeKey = (raw) => btoa(raw)
export const decodeKey = (encoded) => { try { return atob(encoded) } catch { return '' } }
```

### `src/services/coinGeckoApi.js`
```js
const BASE = 'https://api.coingecko.com/api/v3'

const get = async (path, cgApiKey = '', timeoutMs = 12000) => {
  const headers = { Accept: 'application/json' }
  if (cgApiKey) headers['x-cg-demo-api-key'] = cgApiKey
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, { headers, signal: ctrl.signal })
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    return res.json()
  } finally { clearTimeout(timer) }
}

export const searchCG = async (query) => {
  const json = await get(`/search?query=${encodeURIComponent(query)}`)
  return (json.coins || []).slice(0, 20).map(c => ({
    cgId: c.id, symbol: c.symbol.toUpperCase(), name: c.name, rank: c.market_cap_rank, thumb: c.thumb,
  }))
}

export const fetchMarketChart = async (cgId, days, cgApiKey = '') => {
  const json = await get(`/coins/${cgId}/market_chart?vs_currency=usd&days=${days}`, cgApiKey)
  return json.prices
}

export const fetchCoinDetail = async (cgId, cgApiKey = '') => {
  const json = await get(
    `/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
    cgApiKey,
  )
  const md = json.market_data || {}
  const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return {
    rank: json.market_cap_rank,
    currentPrice: md.current_price?.usd || 0,
    change24h: md.price_change_percentage_24h ?? 0,
    marketCap: md.market_cap?.usd,
    volume24h: md.total_volume?.usd,
    high24h: md.high_24h?.usd,
    low24h: md.low_24h?.usd,
    change7d: (md.price_change_percentage_7d ?? null) !== null ? md.price_change_percentage_7d / 100 : null,
    change30d: (md.price_change_percentage_30d ?? null) !== null ? md.price_change_percentage_30d / 100 : null,
    ath: md.ath?.usd,
    athChange: (md.ath_change_percentage?.usd ?? null) !== null ? md.ath_change_percentage.usd / 100 : null,
    atl: md.atl?.usd,
    atlChange: (md.atl_change_percentage?.usd ?? null) !== null ? md.atl_change_percentage.usd / 100 : null,
    description: stripHtml(json.description?.en),
    homepage: (json.links?.homepage || [])[0] || null,
    contractAddress: (() => {
      const p = json.platforms || {}
      return p['solana'] || p['ethereum'] || Object.values(p).find(v => v) || null
    })(),
  }
}

export const fetchPricesByCgId = async (cgIds, cgApiKey = '') => {
  if (!cgIds.length) return {}
  const json = await get(
    `/coins/markets?vs_currency=usd&ids=${cgIds.join(',')}&per_page=250&sparkline=false`,
    cgApiKey,
  )
  const prices = {}; const meta = {}
  for (const coin of json) {
    prices[coin.id] = { price: coin.current_price || 0, percent_change_24h: coin.price_change_percentage_24h || 0 }
    if (coin.image) meta[coin.id] = { thumb: coin.image }
  }
  return { prices, meta }
}
```

---

## INSTRUCCIONES FINALES

1. Genera cada archivo markdown comenzando con el bloque de frontmatter YAML
2. Usa wikilinks `[[nombre-de-nota]]` para enlazar entre notas relacionadas
3. En notas de componentes, enlaza siempre a `[[app-context]]` y a los utils que usan
4. En `00-MOC.md` incluye un diagrama Mermaid del grafo completo del vault
5. Usa callouts `> [!warning]` para comportamientos no obvios o trampas
6. Usa callouts `> [!tip]` para patrones reutilizables o decisiones elegantes
7. Cada nota de componente debe tener una sección "Dependencias" con links a lo que importa
8. El tono debe ser técnico pero claro, como documentación interna de un equipo profesional
9. No inventes funcionalidades que no estén en el código — usa solo lo que está aquí
10. Genera los archivos uno a uno en orden: `00-MOC.md` primero, luego arquitectura, estado, componentes, servicios, utils, diseño, decisiones
