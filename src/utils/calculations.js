export const buildPortfolio = (transactions, prices) => {
  const map = {}

  for (const tx of transactions) {
    const { cryptoId, cgId, symbol, name, category, amount, totalUSD } = tx
    const key = cgId || symbol
    if (!map[key]) {
      map[key] = { cryptoId, cgId, symbol, name, amountHeld: 0, amountBought: 0, amountSold: 0, invested: 0, soldValue: 0 }
    }
    const e = map[key]
    if (category === 'BUY') {
      e.amountHeld += amount
      e.amountBought += amount
      e.invested += totalUSD
    } else if (category === 'SELL') {
      e.amountHeld -= amount
      e.amountSold += amount
      e.soldValue += totalUSD
    }
  }

  return Object.values(map).map(e => {
    const priceData = (e.cgId && prices[e.cgId]) || {}
    const currentPrice = priceData.price || 0
    const currentValue = Math.max(e.amountHeld, 0) * currentPrice
    const avgBuy = e.amountBought > 0 ? e.invested / e.amountBought : 0
    const avgSell = e.amountSold > 0 ? e.soldValue / e.amountSold : 0
    // Total return: (valor actual + lo ya vendido) / total invertido - 1
    const profitability = e.invested > 0 ? ((currentValue + e.soldValue) / e.invested) - 1 : 0
    const profitabilityUSD = currentValue + e.soldValue - e.invested
    // Unrealized: precio actual vs precio medio de compra
    const unrealizedPct = avgBuy > 0 && currentPrice > 0 ? (currentPrice - avgBuy) / avgBuy : null
    return { ...e, currentPrice, currentValue, avgBuy, avgSell, profitability, profitabilityUSD, unrealizedPct, change24h: priceData.percent_change_24h || 0 }
  }).filter(e => e.invested > 0 || e.amountHeld > 0)
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
  const totalInvested = portfolio.reduce((s, e) => s + e.invested, 0)
  const totalCurrentValue = portfolio.reduce((s, e) => s + e.currentValue, 0)
  const totalSold = portfolio.reduce((s, e) => s + e.soldValue, 0)
  const totalNetInvested = totalInvested - totalSold

  const firstLiquidezDate = allTransactions
    .filter(t => t.category === 'LIQUIDEZ')
    .reduce((min, t) => (!min || t.date < min ? t.date : min), null)

  let totalLiquidezDeposits = 0
  let preLiquidezBuys = 0
  let preLiquidezSells = 0

  for (const t of allTransactions) {
    if (t.category !== 'BUY' && t.category !== 'SELL' && t.totalUSD > 0) {
      totalLiquidezDeposits += t.totalUSD
    }
    if (firstLiquidezDate && t.date < firstLiquidezDate) {
      if (t.category === 'BUY') preLiquidezBuys += t.totalUSD
      if (t.category === 'SELL') preLiquidezSells += t.totalUSD
    }
  }

  const { liquidez: totalLiquidez } = computeLiquidez(allTransactions)
  const totalPnL = totalCurrentValue + totalSold - totalInvested

  const base = firstLiquidezDate
    ? totalLiquidezDeposits + Math.max(preLiquidezBuys - preLiquidezSells, 0)
    : totalInvested
  const totalPct = base > 0 ? totalPnL / base : 0

  return { totalInvested, totalNetInvested, totalCurrentValue, totalSold, totalPnL, totalPct, totalLiquidez, totalLiquidezDeposits }
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

export const fmtAmount = (n) => Math.abs(n) >= 1 ? n.toFixed(4) : n.toFixed(8)

export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
