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
    `/simple/price?ids=${cgIds.join(',')}&vs_currencies=usd&include_24hr_change=true`,
    cgApiKey,
  )
  const result = {}
  for (const [id, data] of Object.entries(json)) {
    result[id] = {
      price: data.usd || 0,
      percent_change_24h: data.usd_24h_change || 0,
    }
  }
  return result
}
