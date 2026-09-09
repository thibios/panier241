// Fonction serverless Vercel — proxy vers l'API Pexels pour ne jamais exposer
// la clé au navigateur. GET /api/pexels?query=<mot-clé> -> { url: string | null }
export default async function handler(req: any, res: any) {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'PEXELS_API_KEY manquante côté serveur.' })
    return
  }

  const query = typeof req.query?.query === 'string' ? req.query.query : ''
  if (!query.trim()) {
    res.status(400).json({ error: 'Paramètre "query" requis.' })
    return
  }

  try {
    const pexelsRes = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`,
      { headers: { Authorization: apiKey } },
    )

    if (!pexelsRes.ok) {
      res.status(502).json({ error: `Pexels a répondu ${pexelsRes.status}` })
      return
    }

    const data = await pexelsRes.json()
    const url: string | null = data?.photos?.[0]?.src?.medium ?? null

    res.setHeader('Cache-Control', 's-maxage=2592000, stale-while-revalidate')
    res.status(200).json({ url })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
  }
}
