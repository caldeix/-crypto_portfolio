/**
 * Cloudflare Worker — CORS proxy para CoinMarketCap API
 *
 * Deploy:
 *   1. Ve a https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Pega este código, Deploy
 *   3. Copia la URL del worker (ej. https://cmc-proxy.TU-USUARIO.workers.dev)
 *   4. Pégala en la app → Ajustes → Proxy CORS
 */

const CMC_BASE = 'https://pro-api.coinmarketcap.com'
const ALLOWED_PATHS = ['/v1/cryptocurrency/quotes/latest', '/v1/cryptocurrency/map', '/v2/cryptocurrency/quotes/latest']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-CMC_PRO_API_KEY',
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const search = url.search

    // Only proxy allowed CMC endpoints
    if (!ALLOWED_PATHS.some(p => path.startsWith(p))) {
      return new Response('Not allowed', { status: 403, headers: corsHeaders })
    }

    // Extract API key: prefer header, fallback to query param
    const apiKey = request.headers.get('X-CMC_PRO_API_KEY')
      || url.searchParams.get('CMC_PRO_API_KEY')

    if (!apiKey) {
      return new Response('Missing API key', { status: 401, headers: corsHeaders })
    }

    // Strip key from query string (use header instead for cleanliness)
    url.searchParams.delete('CMC_PRO_API_KEY')

    const cmcUrl = `${CMC_BASE}${path}${url.searchParams.toString() ? '?' + url.searchParams.toString() : ''}`

    const cmcRes = await fetch(cmcUrl, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
      },
    })

    const body = await cmcRes.text()

    return new Response(body, {
      status: cmcRes.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  },
}
