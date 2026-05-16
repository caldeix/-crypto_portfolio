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

export const fetchMarketChart = async (cgId, days, cgApiKey = '') => {
  const json = await get(
    `/coins/${cgId}/market_chart?vs_currency=usd&days=${days}`,
    cgApiKey,
  )
  return json.prices // [[timestamp, price], ...]
}

export const fetchCoinDetail = async (cgId, cgApiKey = '') => {
  const json = await get(
    `/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
    cgApiKey,
  )
  const md = json.market_data || {}
  const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return {
    rank:         json.market_cap_rank,
    currentPrice: md.current_price?.usd || 0,
    change24h:    md.price_change_percentage_24h ?? 0,
    marketCap:    md.market_cap?.usd,
    volume24h:    md.total_volume?.usd,
    high24h:      md.high_24h?.usd,
    low24h:       md.low_24h?.usd,
    change7d:   (md.price_change_percentage_7d ?? null) !== null ? md.price_change_percentage_7d / 100 : null,
    change30d:  (md.price_change_percentage_30d ?? null) !== null ? md.price_change_percentage_30d / 100 : null,
    ath:        md.ath?.usd,
    athChange:  (md.ath_change_percentage?.usd ?? null) !== null ? md.ath_change_percentage.usd / 100 : null,
    atl:        md.atl?.usd,
    atlChange:  (md.atl_change_percentage?.usd ?? null) !== null ? md.atl_change_percentage.usd / 100 : null,
    description: stripHtml(json.description?.en),
    homepage:   (json.links?.homepage || [])[0] || null,
  }
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
