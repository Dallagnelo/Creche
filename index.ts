// Função do Supabase (Edge Function) que busca jogos no IGDB.
// O IGDB exige um segredo (Client Secret do Twitch) que não pode ficar no navegador, por isso a busca passa por aqui.
// Segredos necessários (Edge Functions > Secrets): IGDB_CLIENT_ID e IGDB_CLIENT_SECRET.
// Passo a passo para publicar: veja LEIA-ME.md nesta pasta.

const CLIENT_ID = Deno.env.get('IGDB_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('IGDB_CLIENT_SECRET') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

// O token do Twitch vale por semanas: guardamos em memória e só pedimos outro quando está perto de vencer.
let token: { value: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value
  const params = new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials' })
  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' })
  if (!response.ok) throw new Error('twitch-auth')
  const data = await response.json()
  token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return token.value
}

// Traduz a sinopse (o IGDB só tem em inglês) para português do Brasil.
// Usa o tradutor gratuito do Google; se ele falhar, tenta o MyMemory. Se os dois falharem, devolve null e o app mantém o texto original.
function chunks(text: string, max: number): string[] {
  const parts: string[] = []
  let current = ''
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (current && (current + ' ' + sentence).length > max) {
      parts.push(current)
      current = ''
    }
    current = current ? `${current} ${sentence}` : sentence
    while (current.length > max) {
      parts.push(current.slice(0, max))
      current = current.slice(max)
    }
  }
  if (current) parts.push(current)
  return parts
}

async function viaGoogle(text: string): Promise<string> {
  const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q: text }),
  })
  if (!response.ok) throw new Error('google')
  const data = await response.json()
  return (data[0] as any[]).map((piece) => piece[0]).join('')
}

async function viaMyMemory(text: string): Promise<string> {
  const response = await fetch(`https://api.mymemory.translated.net/get?langpair=en|pt-BR&q=${encodeURIComponent(text)}`)
  if (!response.ok) throw new Error('mymemory')
  const data = await response.json()
  const out = data?.responseData?.translatedText
  if (!out || data?.responseStatus !== 200) throw new Error('mymemory')
  return String(out)
}

async function translate(text: string): Promise<string | null> {
  try {
    const out: string[] = []
    for (const part of chunks(text.slice(0, 1500), 1200)) {
      try {
        out.push(await viaGoogle(part))
      } catch {
        const small = chunks(part, 450)
        const done: string[] = []
        for (const piece of small) done.push(await viaMyMemory(piece))
        out.push(done.join(' '))
      }
    }
    return out.join(' ').trim() || null
  } catch (error) {
    console.error(error)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405)

  // Só quem está logado no app pode buscar. A conferência é feita aqui (e não pelo "Verify JWT" do painel),
  // porque o painel recusa até o aviso prévio do navegador (CORS) em projetos com as chaves novas.
  const authorization = req.headers.get('authorization') ?? ''
  const apikey = Deno.env.get('SUPABASE_ANON_KEY') ?? req.headers.get('apikey') ?? ''
  const who = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey },
  }).catch(() => null)
  if (!who || !who.ok) return reply({ error: 'Sessão inválida. Saia e entre de novo no app.' }, 401)

  let query = ''
  try {
    const body = await req.json()
    // Pedido de tradução da sinopse (não precisa dos segredos do IGDB).
    if (typeof body?.translate === 'string') return reply({ text: await translate(body.translate) })
    query = String(body?.query ?? '')
  } catch {
    return reply({ error: 'Pedido inválido.' }, 400)
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return reply({ error: 'A busca de jogos ainda não foi configurada (faltam os segredos IGDB_CLIENT_ID e IGDB_CLIENT_SECRET).' }, 500)
  }
  // Aspas e barras quebrariam o texto da consulta do IGDB.
  query = query.replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  if (query.length < 2) return reply([])

  try {
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'text/plain' },
      body: `search "${query}"; fields name, first_release_date, platforms.name, cover.image_id, summary, genres.name, url; where version_parent = null; limit 8;`,
    })
    if (response.status === 429) return reply({ error: 'Muitas buscas seguidas. Espere um instante e tente de novo.' }, 429)
    if (!response.ok) return reply({ error: 'O IGDB não respondeu direito. Tente de novo em instantes.' }, 502)

    const games = await response.json()
    return reply(
      games.map((game: any) => ({
        id: game.id,
        name: game.name,
        year: game.first_release_date ? new Date(game.first_release_date * 1000).getUTCFullYear() : null,
        platforms: (game.platforms ?? []).map((platform: any) => platform.name),
        summary: game.summary ? String(game.summary).slice(0, 1500) : null,
        genres: (game.genres ?? []).map((genre: any) => genre.name),
        url: game.url ?? null,
        // t_cover_big: capa grande (264 x 374). A lista usa a versão pequena (t_cover_small) trocando o endereço.
        coverUrl: game.cover?.image_id
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
          : null,
      })),
    )
  } catch (error) {
    console.error(error)
    return reply({ error: 'Não foi possível buscar no IGDB agora. Confira os segredos da função.' }, 502)
  }
})
