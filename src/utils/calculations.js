export const buildPortfolio = (transactions, prices) => {
  const map = {}

  for (const tx of transactions) {
    const { cryptoId, cgId, symbol, name, category, amount, totalUSD } = tx
    const key = cgId || symbol
    if (!map[key]) {
      map[key] = { cryptoId, cgId, symbol, name, amountHeld: 0, invested: 0, soldValue: 0 }
    }
    const e = map[key]
    if (category === 'BUY') {
      e.amountHeld += amount
      e.invested += totalUSD
    } else if (category === 'SELL') {
      e.amountHeld -= amount
      e.soldValue += totalUSD
    }
  }

  return Object.values(map).map(e => {
    const priceData = (e.cgId && prices[e.cgId]) || {}
    const currentPrice = priceData.price || 0
    const currentValue = Math.max(e.amountHeld, 0) * currentPrice
    const profitability = e.invested > 0 ? ((currentValue + e.soldValue) / e.invested) - 1 : 0
    const profitabilityUSD = currentValue + e.soldValue - e.invested
    return { ...e, currentPrice, currentValue, profitability, profitabilityUSD, change24h: priceData.percent_change_24h || 0 }
  }).filter(e => e.invested > 0 || e.amountHeld > 0)
}

// Calcula el saldo de liquidez disponible y si el sistema está activo.
// Solo cuenta BUY/SELL/gastos a partir de la primera transacción de LIQUIDEZ.
export const computeLiquidez = (transactions, expenseCategories = []) => {
  const firstDate = transactions
    .filter(t => t.category === 'LIQUIDEZ')
    .reduce((min, t) => (!min || t.date < min ? t.date : min), null)
  if (!firstDate) return { liquidez: 0, hasLiquidez: false }

  let deposits = 0, buys = 0, sells = 0, gastos = 0
  for (const t of transactions) {
    if (t.category === 'LIQUIDEZ') { deposits += t.totalUSD; continue }
    if (t.date < firstDate) continue
    if (t.category === 'BUY') buys += t.totalUSD
    else if (t.category === 'SELL') sells += t.totalUSD
    else if (expenseCategories.includes(t.category)) gastos += t.totalUSD
  }
  return { liquidez: deposits - buys + sells - gastos, hasLiquidez: true }
}

export const buildTotals = (portfolio, allTransactions = [], expenseCategories = []) => {
  const totalInvested = portfolio.reduce((s, e) => s + e.invested, 0)
  const totalCurrentValue = portfolio.reduce((s, e) => s + e.currentValue, 0)
  const totalSold = portfolio.reduce((s, e) => s + e.soldValue, 0)
  const totalNetInvested = totalInvested - totalSold

  const gastosByCategory = {}
  let totalGastos = 0
  let totalLiquidezDeposits = 0
  let preLiquidezBuys = 0
  let preLiquidezSells = 0

  const firstLiquidezDate = allTransactions
    .filter(t => t.category === 'LIQUIDEZ')
    .reduce((min, t) => (!min || t.date < min ? t.date : min), null)

  for (const t of allTransactions) {
    if (expenseCategories.includes(t.category)) {
      gastosByCategory[t.category] = (gastosByCategory[t.category] || 0) + t.totalUSD
      totalGastos += t.totalUSD
    }
    if (t.category === 'LIQUIDEZ') { totalLiquidezDeposits += t.totalUSD; continue }
    if (firstLiquidezDate && t.date < firstLiquidezDate) {
      if (t.category === 'BUY') preLiquidezBuys += t.totalUSD
      if (t.category === 'SELL') preLiquidezSells += t.totalUSD
    }
  }

  const { liquidez: totalLiquidez } = computeLiquidez(allTransactions, expenseCategories)

  const totalPnL = totalCurrentValue + totalSold - totalInvested

  // Base = lo que entró al sistema antes del LIQUIDEZ (neto) + los depósitos de LIQUIDEZ
  // Si no hay LIQUIDEZ trackado, usa totalInvested como fallback
  const preBase = preLiquidezBuys - preLiquidezSells
  const base = firstLiquidezDate
    ? totalLiquidezDeposits + Math.max(preBase, 0)
    : totalInvested
  const totalPct = base > 0 ? totalPnL / base : 0

  return { totalInvested, totalNetInvested, totalCurrentValue, totalSold, totalGastos, gastosByCategory, totalPnL, totalPct, totalLiquidez, totalLiquidezDeposits }
}

export const fmt = (n, decimals = 2) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)

export const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`

export const fmtAmount = (n) => Math.abs(n) >= 1 ? n.toFixed(4) : n.toFixed(8)

export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
