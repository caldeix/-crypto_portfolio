const BASE = 'https://api.coingecko.com/api/v3'

const get = async (path, cgApiKey = '') => {
  const headers = { Accept: 'application/json' }
  if (cgApiKey) headers['x-cg-demo-api-key'] = cgApiKey
  const res = await fetch(`${BASE}${path}`, { headers })
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  return res.json()
}

export const searchCG = async (query) => {
  const json = await get(`/search?query=${encodeURIComponent(query)}`)
  return (json.coins || []).slice(0, 20).map(c => ({
    cgId: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    rank: c.market_cap_rank,
    thumb: c.thumb,
  }))
}

export const fetchPricesByCgId = async (cgIds, cgApiKey = '') => {
  if (!cgIds.length) return {}
  const json = await get(
    `/coins/markets?vs_currency=usd&ids=${cgIds.join(',')}&per_page=250&sparkline=false`,
    cgApiKey,
  )
  const prices = {}
  const meta   = {}
  for (const coin of json) {
    prices[coin.id] = {
      price: coin.current_price || 0,
      percent_change_24h: coin.price_change_percentage_24h || 0,
    }
    if (coin.image) meta[coin.id] = { thumb: coin.image }
  }
  return { prices, meta }
}
