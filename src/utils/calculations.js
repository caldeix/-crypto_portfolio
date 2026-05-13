export const buildPortfolio = (transactions, prices) => {
  const map = {}

  for (const tx of transactions) {
    const { cryptoId, cgId, symbol, name, category, amount, totalUSD } = tx
    const key = cgId || symbol   // group by cgId, fall back to symbol
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

export const buildTotals = (portfolio) => {
  const totalInvested = portfolio.reduce((s, e) => s + e.invested, 0)
  const totalCurrentValue = portfolio.reduce((s, e) => s + e.currentValue, 0)
  const totalSold = portfolio.reduce((s, e) => s + e.soldValue, 0)
  const totalPnL = totalCurrentValue + totalSold - totalInvested
  const totalPct = totalInvested > 0 ? ((totalCurrentValue + totalSold) / totalInvested) - 1 : 0
  return { totalInvested, totalCurrentValue, totalSold, totalPnL, totalPct }
}

export const fmt = (n, decimals = 2) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)

export const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`

export const fmtAmount = (n) => Math.abs(n) >= 1 ? n.toFixed(4) : n.toFixed(8)

export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
