const BASE = 'https://pro-api.coinmarketcap.com'

// With a proxy: prepend proxy URL. Without proxy: use query param (avoids CORS preflight).
const buildUrl = (proxyUrl, path, apiKey) => {
  if (proxyUrl) {
    const base = `${proxyUrl.replace(/\/$/, '')}/${BASE.replace('https://', '')}`
    return { url: `${base}${path}`, headers: { 'X-CMC_PRO_API_KEY': apiKey, Accept: 'application/json' } }
  }
  const sep = path.includes('?') ? '&' : '?'
  return { url: `${BASE}${path}${sep}CMC_PRO_API_KEY=${apiKey}`, headers: { Accept: 'application/json' } }
}

export const fetchPrices = async (ids, apiKey, proxyUrl = '') => {
  if (!ids.length || !apiKey) return {}
  // Filter out placeholder IDs (99xxx) — they don't exist in CMC
  const validIds = ids.filter(id => id < 90000)
  if (!validIds.length) return {}
  const { url, headers } = buildUrl(proxyUrl, `/v1/cryptocurrency/quotes/latest?id=${validIds.join(',')}&convert=USD`, apiKey)
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`CMC ${res.status}`)
  const json = await res.json()
  const result = {}
  for (const [id, coin] of Object.entries(json.data || {})) {
    result[Number(id)] = {
      price: coin.quote?.USD?.price || 0,
      percent_change_24h: coin.quote?.USD?.percent_change_24h || 0,
      market_cap: coin.quote?.USD?.market_cap || 0,
    }
  }
  return result
}

export const searchCrypto = async (query, apiKey, proxyUrl = '') => {
  if (!apiKey) throw new Error('API key required')
  const { url, headers } = buildUrl(proxyUrl, `/v1/cryptocurrency/map?symbol=${encodeURIComponent(query.toUpperCase())}`, apiKey)
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`CMC ${res.status}`)
  const json = await res.json()
  return (json.data || []).slice(0, 20).map(c => ({
    id: c.id, name: c.name, symbol: c.symbol, slug: c.slug, rank: c.rank, is_active: c.is_active,
  }))
}

export const searchByName = async (query, apiKey, proxyUrl = '') => {
  if (!apiKey) throw new Error('API key required')
  const { url, headers } = buildUrl(proxyUrl, `/v1/cryptocurrency/map?listing_status=active&limit=50`, apiKey)
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`CMC ${res.status}`)
  const json = await res.json()
  const q = query.toLowerCase()
  return (json.data || [])
    .filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    .slice(0, 20)
    .map(c => ({ id: c.id, name: c.name, symbol: c.symbol, slug: c.slug, rank: c.rank }))
}
