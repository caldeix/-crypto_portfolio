// A position "cycle" is a run of BUY/SELL transactions for one coin that starts
// from zero holdings and ends when holdings return to zero. Everything before a
// close is history: a later re-buy starts a fresh cost basis instead of
// inheriting the old average and the old realized gain.
//
// Closing is tested against a RELATIVE dust threshold — 0.01% of the quantity
// bought during the cycle — because real positions rarely land on exactly zero.
// Validated against a 229-transaction export: a strict `=== 0` (or a 1e-9
// absolute epsilon) misses ASTER with 0.002 left of 933.80 bought, NMT with
// 0.0016 of 5460, and MINI with 0.01 of 79655. Any value in [1e-4, 5e-3] gives
// identical results on that data.
export const CYCLE_DUST_REL_EPS = 1e-4

// The same grouping key buildPortfolio uses, so cycles and portfolio entries
// always line up (reassignCgId rewrites cgId across every tx of a symbol).
export const coinKey = (tx) => tx.cgId || tx.symbol

const emptyCycle = (index) => ({
  index,
  txIds: [],
  start: null,
  end: null,
  amountBought: 0,
  amountSold: 0,
  invested: 0,
  soldValue: 0,
  closed: false,
  residual: 0,
  avgBuy: 0,
  avgSell: 0,
  realizedPnL: null,
  realizedPct: null,
})

const sealCycle = (c, closed, residual) => {
  c.closed   = closed
  c.residual = residual
  c.avgBuy   = c.amountBought > 0 ? c.invested  / c.amountBought : 0
  c.avgSell  = c.amountSold   > 0 ? c.soldValue / c.amountSold   : 0
  if (closed) {
    c.realizedPnL = c.soldValue - c.invested
    c.realizedPct = c.invested > 0 ? (c.soldValue / c.invested) - 1 : 0
  }
  return c
}

export const buildCycles = (transactions) => {
  const groups = {}
  transactions.forEach((tx, i) => {
    if (tx.category !== 'BUY' && tx.category !== 'SELL') return
    const key = coinKey(tx)
    if (!groups[key]) groups[key] = []
    groups[key].push({ tx, i })
  })

  const byKey       = {}
  const cycleByTxId = new Map()

  for (const key of Object.keys(groups)) {
    // Cycles need chronological order and transactions are not stored sorted.
    // ISO-Z strings compare lexicographically, so no Date allocation; ties fall
    // back to insertion order, preserving the existing sequence for
    // same-timestamp BUY/SELL pairs.
    const rows = groups[key].sort((a, b) =>
      a.tx.date < b.tx.date ? -1 : a.tx.date > b.tx.date ? 1 : a.i - b.i)

    const closedCycles = []
    let cycle         = emptyCycle(0)
    let held          = 0   // running quantity inside the current cycle
    let boughtInCycle = 0   // dust reference for the current cycle

    for (const { tx } of rows) {
      const amount   = Number(tx.amount)   || 0
      const totalUSD = Number(tx.totalUSD) || 0

      cycle.txIds.push(tx.id)
      if (cycle.start === null) cycle.start = tx.date
      cycle.end = tx.date

      if (tx.category === 'BUY') {
        held               += amount
        boughtInCycle      += amount
        cycle.amountBought += amount
        cycle.invested     += totalUSD
      } else {
        held             -= amount
        cycle.amountSold += amount
        cycle.soldValue  += totalUSD
      }

      // The boughtInCycle guard keeps a sell-only run (an airdrop sold without
      // ever being bought) from "closing": it has no cost basis to close.
      // Overselling past the dust band leaves `held` negative and the cycle
      // open, which is the honest reading of an inconsistent history.
      if (boughtInCycle > 0 && Math.abs(held) <= boughtInCycle * CYCLE_DUST_REL_EPS) {
        const done = sealCycle(cycle, true, held)
        done.txIds.forEach(id => cycleByTxId.set(id, { key, cycleIndex: done.index, closed: true }))
        closedCycles.push(done)
        cycle         = emptyCycle(closedCycles.length)
        held          = 0
        boughtInCycle = 0
      }
    }

    const openCycle = cycle.txIds.length > 0 ? sealCycle(cycle, false, held) : null
    if (openCycle) {
      openCycle.txIds.forEach(id => cycleByTxId.set(id, { key, cycleIndex: openCycle.index, closed: false }))
    }

    const realizedPnL      = closedCycles.reduce((s, c) => s + c.realizedPnL, 0)
    const realizedInvested = closedCycles.reduce((s, c) => s + c.invested, 0)
    byKey[key] = {
      key,
      closedCycles,
      openCycle,
      status: openCycle ? 'open' : 'closed',
      realizedPnL,
      realizedInvested,
      realizedPct: realizedInvested > 0 ? realizedPnL / realizedInvested : 0,
    }
  }

  return { byKey, cycleByTxId }
}

// Read-only view carrying the `realized` flag the UI and the export show.
// Derived rather than stored on purpose: EDIT_TX replaces a transaction
// wholesale and buildTx rebuilds it from a fresh literal, so a persisted flag
// would be dropped on any edit — and would go stale the moment a date or an
// amount moved a transaction across a cycle boundary.
export const annotateTransactions = (transactions, cycles = null) => {
  const cyc = cycles || buildCycles(transactions)
  return transactions.map(tx => {
    const info = cyc.cycleByTxId.get(tx.id)
    return { ...tx, realized: !!(info && info.closed), cycleIndex: info ? info.cycleIndex : null }
  })
}

export const buildPortfolio = (transactions, prices, cycles = null) => {
  const cyc = cycles || buildCycles(transactions)
  const map = {}

  for (const tx of transactions) {
    // Only BUY/SELL open a position. LIQUIDEZ and custom categories used to
    // create a pseudo-entry that the trailing `invested > 0 || amountHeld > 0`
    // filter removed; that filter now has to let closed positions through, so
    // the guard moved up here.
    if (tx.category !== 'BUY' && tx.category !== 'SELL') continue
    const { cryptoId, cgId, symbol, name, category, amount } = tx
    const key = coinKey(tx)
    if (!map[key]) {
      map[key] = { cryptoId, cgId, symbol, name, key, amountHeld: 0, amountBoughtTotal: 0 }
    }
    const e = map[key]
    if (category === 'BUY') {
      e.amountHeld        += amount
      e.amountBoughtTotal += amount
    } else {
      e.amountHeld -= amount
    }
  }

  return Object.values(map).map(e => {
    const c    = cyc.byKey[e.key]
    const open = c ? c.openCycle : null

    // Cost basis is open-cycle only. Holdings are not: amountHeld stays the
    // physical sum across every cycle, so dust left behind by a closed position
    // still shows up (and is still worth about nothing).
    const invested     = open ? open.invested     : 0
    const amountBought = open ? open.amountBought : 0
    const soldValue    = open ? open.soldValue    : 0
    const amountSold   = open ? open.amountSold   : 0

    const priceData = (e.cgId && prices[e.cgId]) || {}
    const currentPrice = priceData.price || 0
    const currentValue = Math.max(e.amountHeld, 0) * currentPrice
    const avgBuy = amountBought > 0 ? invested / amountBought : 0
    const avgSell = amountSold > 0 ? soldValue / amountSold : 0
    // Total return: (valor actual + lo ya vendido) / total invertido - 1
    const profitability = invested > 0 ? ((currentValue + soldValue) / invested) - 1 : 0
    const profitabilityUSD = currentValue + soldValue - invested
    // Unrealized: precio actual vs precio medio de compra (solo sobre lo que aún se tiene)
    const unrealizedPct = avgBuy > 0 && currentPrice > 0 ? (currentPrice - avgBuy) / avgBuy : null
    const unrealizedUSD = avgBuy > 0 && currentPrice > 0 ? (currentPrice - avgBuy) * Math.max(e.amountHeld, 0) : 0

    // No double counting: profitabilityUSD already carries the partial sells
    // inside the open cycle; realizedPnL only aggregates fully closed cycles.
    const realizedPnL = c ? c.realizedPnL : 0

    return {
      ...e,
      invested, amountBought, soldValue, amountSold,
      currentPrice, currentValue, avgBuy, avgSell,
      profitability, profitabilityUSD, unrealizedPct, unrealizedUSD,
      change24h: priceData.percent_change_24h || 0,
      status:           c ? c.status           : 'open',
      closedCycles:     c ? c.closedCycles     : [],
      openCycle:        open,
      realizedPnL,
      realizedInvested: c ? c.realizedInvested : 0,
      realizedPct:      c ? c.realizedPct      : 0,
      lifetimePnL:      realizedPnL + profitabilityUSD,
    }
  }).filter(e => e.amountBoughtTotal > 0 || e.amountHeld > 0)
}

// Todas las transacciones que no son BUY ni SELL afectan al saldo de liquidez (LIQUIDEZ + categorías custom)
export const computeLiquidez = (transactions) => {
  const firstDate = transactions
    .filter(t => t.category === 'LIQUIDEZ')
    .reduce((min, t) => (!min || t.date < min ? t.date : min), null)
  if (!firstDate) return { liquidez: 0, hasLiquidez: false }

  let balance = 0
  for (const t of transactions) {
    if (t.category === 'BUY') {
      if (t.date >= firstDate) balance -= t.totalUSD
    } else if (t.category === 'SELL') {
      if (t.date >= firstDate) balance += t.totalUSD
    } else {
      // LIQUIDEZ y categorías custom: el importe ya viene firmado (+deposito / -retirada)
      balance += t.totalUSD
    }
  }
  return { liquidez: balance, hasLiquidez: true }
}

export const buildTotals = (portfolio, allTransactions = []) => {
  // OPEN book — the capital actually at risk right now. These are the numbers
  // the dashboard header shows, and they no longer carry closed positions.
  const totalInvested = portfolio.reduce((s, e) => s + e.invested, 0)
  const totalCurrentValue = portfolio.reduce((s, e) => s + e.currentValue, 0)
  const totalSold = portfolio.reduce((s, e) => s + e.soldValue, 0)
  const totalNetInvested = totalInvested - totalSold

  const { liquidez: totalLiquidez } = computeLiquidez(allTransactions)
  const totalPnL = totalCurrentValue + totalSold - totalInvested
  const totalPct = totalNetInvested > 0 ? totalPnL / totalNetInvested : 0

  // CLOSED book — positions that went back to zero. Without this the profit
  // from every closed position would silently vanish from the totals.
  const realizedPnL = portfolio.reduce((s, e) => s + e.realizedPnL, 0)
  const realizedInvested = portfolio.reduce((s, e) => s + e.realizedInvested, 0)
  const closedCount = portfolio.filter(e => e.status === 'closed').length

  // LIFETIME — open + closed. lifetimePnL must equal, to the cent, what the
  // pre-cycle code reported as totalPnL; that identity is the regression test.
  const lifetimePnL = totalPnL + realizedPnL
  const lifetimeInvested = totalInvested + realizedInvested
  const lifetimePct = lifetimeInvested > 0 ? lifetimePnL / lifetimeInvested : 0

  return {
    totalInvested, totalNetInvested, totalCurrentValue, totalSold, totalPnL, totalPct, totalLiquidez,
    realizedPnL, realizedInvested,
    realizedPct: realizedInvested > 0 ? realizedPnL / realizedInvested : 0,
    closedCount, lifetimePnL, lifetimeInvested, lifetimePct,
  }
}

export const fmt = (n, decimals = 2) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)

const SUBS = '₀₁₂₃₄₅₆₇₈₉'
const toSub = (n) => String(n).split('').map(c => SUBS[+c]).join('')

export const fmtPrice = (price) => {
  if (price === null || price === undefined) return '—'
  if (price === 0) return '$0.00'
  const abs = Math.abs(price)
  const sign = price < 0 ? '-' : ''
  if (abs >= 1)      return fmt(price, 2)
  if (abs >= 0.01)   return fmt(price, 4)
  if (abs >= 0.0001) return fmt(price, 6)
  // subscript compact: $0.0₈436 style
  const exp = Math.floor(Math.log10(abs))
  const leading = -exp - 1
  const mantissa = (abs / Math.pow(10, exp)).toPrecision(4).replace(/\.?0+$/, '').replace('.', '')
  return `${sign}$0.0${toSub(leading)}${mantissa}`
}

export const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`

export const fmtCompact = (n) => {
  if (!n || n === 0) return '$0'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return fmt(n)
}

export const fmtAmount = (n) => Math.abs(n) >= 1 ? n.toFixed(4) : n.toFixed(8)

export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
