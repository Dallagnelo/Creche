// Função do Supabase (Edge Function) que monta a lista de JOGOS GRÁTIS da aba "Jogos grátis".
// Fontes (públicas, sem chave):
//   GamerPower (https://www.gamerpower.com) – Steam, Epic, GOG, itch.io, consoles, celular...  (pede crédito com link: o site mostra)
//   Epic Games Store – o grátis da semana e o da semana que vem, com preço em reais e descrição em português
// A lista fica guardada na tabela free_games. Quem abre a aba chama esta função: se a lista tiver mais de 1 hora,
// ela busca de novo, salva, e avisa a turma dos jogos novos (notificação). Senão, só responde "está em dia".
// Não precisa de segredo novo: usa SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY, que já existem.
// Passo a passo para publicar: LEIA-ME.md nesta pasta.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const MAX_AGE = '60 minutes'
const MAX_ANNOUNCE = 4 // no máximo 4 avisos por atualização (evita enxurrada)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// ---------------------------------------------------------------- banco (REST com a chave de serviço)
async function db(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`banco ${response.status}: ${await response.text()}`)
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
const rpc = (name: string, args: Record<string, unknown>) => db(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) })

// ---------------------------------------------------------------- tradução (descrições do GamerPower vêm em inglês)
async function translate(text: string): Promise<string | null> {
  if (!text) return null
  try {
    const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ q: text.slice(0, 1800) }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return (data[0] as any[]).map((piece) => piece[0]).join('').trim() || null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- normalização
type Game = {
  key: string
  source: 'gamerpower' | 'epic'
  title: string
  description: string | null
  image: string | null
  stores: string[]
  kind: 'game' | 'dlc' | 'loot' | 'beta'
  worth: string | null
  url: string | null
  starts_at: string | null
  ends_at: string | null
  upcoming: boolean
}

const STORE_RULES: [RegExp, string][] = [
  [/epic/i, 'Epic'],
  [/steam/i, 'Steam'],
  [/\bgog\b/i, 'GOG'],
  [/itch/i, 'itch.io'],
  [/prime gaming|amazon|\bluna\b/i, 'Prime Gaming'],
  [/ubisoft|uplay/i, 'Ubisoft'],
  [/\bea app\b|origin/i, 'EA'],
  [/battle\.?net/i, 'Battle.net'],
  [/ps4|ps5|playstation/i, 'PlayStation'],
  [/xbox/i, 'Xbox'],
  [/switch|nintendo/i, 'Switch'],
  [/android/i, 'Android'],
  [/\bios\b|iphone/i, 'iOS'],
  [/indiegala/i, 'IndieGala'],
  [/humble/i, 'Humble'],
  [/fanatical/i, 'Fanatical'],
  [/drm-?free/i, 'DRM-free'],
]
export function storesOf(...texts: string[]): string[] {
  const all = texts.join(' | ')
  const found = STORE_RULES.filter(([re]) => re.test(all)).map(([, name]) => name)
  if (!found.length && /\bpc\b/i.test(all)) found.push('PC')
  return [...new Set(found)]
}

// GamerPower manda datas como "2026-11-20 23:59:00" (UTC) ou "N/A"
function gpDate(value: unknown): string | null {
  const text = String(value ?? '')
  const m = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/)
  if (!m) return null
  const date = new Date(`${m[1]}T${m[2]}Z`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s+giveaway\s*$/i, '')
    .replace(/\s*\((?:steam|epic(?: games(?: store)?)?|gog|itch\.?io|prime gaming|amazon|ubisoft|indiegala|humble(?: bundle)?|fanatical|pc|ps4|ps5|xbox[^)]*|switch|android|ios)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
export const sameTitle = (a: string) =>
  a
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

const GP_KIND: Record<string, Game['kind']> = { game: 'game', 'early access': 'game', dlc: 'dlc', loot: 'loot', beta: 'beta', other: 'loot' }

export function fromGamerPower(list: any[]): Game[] {
  if (!Array.isArray(list)) return []
  return list
    .filter((g) => g && g.id && g.title && String(g.status ?? 'Active').toLowerCase() === 'active')
    .map((g) => {
      const platforms = Array.isArray(g.platforms) ? g.platforms.join(', ') : String(g.platforms ?? '')
      const worth = String(g.worth ?? '').trim()
      return {
        key: `gp:${g.id}`,
        source: 'gamerpower',
        title: cleanTitle(String(g.title)).slice(0, 200),
        description: g.description ? String(g.description).slice(0, 1500) : null,
        image: g.image || g.thumbnail || null,
        stores: storesOf(platforms, String(g.title)),
        kind: GP_KIND[String(g.type ?? '').toLowerCase()] ?? 'game',
        worth: worth && worth !== 'N/A' && worth !== '$0.00' ? worth : null,
        url: g.open_giveaway_url || g.open_giveaway || g.gamerpower_url || null,
        starts_at: gpDate(g.published_date),
        ends_at: gpDate(g.end_date),
        upcoming: false,
      } satisfies Game
    })
}

// Epic: cada item tem promotions.promotionalOffers (valendo agora) e upcomingPromotionalOffers (próximos)
function epicWindow(groups: any[] | undefined) {
  for (const group of groups ?? []) {
    for (const offer of group?.promotionalOffers ?? []) {
      if (Number(offer?.discountSetting?.discountPercentage) === 0) return { start: offer.startDate ?? null, end: offer.endDate ?? null }
    }
  }
  return null
}
export function fromEpic(data: any, now = Date.now()): Game[] {
  const elements: any[] = data?.data?.Catalog?.searchStore?.elements ?? []
  const out: Game[] = []
  for (const el of elements) {
    const current = epicWindow(el?.promotions?.promotionalOffers)
    const next = epicWindow(el?.promotions?.upcomingPromotionalOffers)
    const freeNow = current && Date.parse(current.start) <= now && (!current.end || Date.parse(current.end) > now) && Number(el?.price?.totalPrice?.discountPrice ?? 0) === 0
    const win = freeNow ? current : next
    if (!win) continue
    const slug =
      el?.catalogNs?.mappings?.find((m: any) => m?.pageType === 'productHome')?.pageSlug ??
      el?.offerMappings?.find((m: any) => m?.pageType === 'productHome')?.pageSlug ??
      el?.productSlug?.replace(/\/home$/, '') ??
      el?.urlSlug ??
      null
    const images: any[] = el?.keyImages ?? []
    const image =
      images.find((i) => i?.type === 'OfferImageWide')?.url ??
      images.find((i) => i?.type === 'DieselStoreFrontWide')?.url ??
      images.find((i) => i?.type === 'Thumbnail')?.url ??
      images[0]?.url ??
      null
    const original = el?.price?.totalPrice?.fmtPrice?.originalPrice
    out.push({
      key: `epic:${slug ?? el?.id}`,
      source: 'epic',
      title: String(el?.title ?? 'Jogo da Epic').slice(0, 200),
      description: el?.description && el.description !== el.title ? String(el.description).slice(0, 1500) : null,
      image,
      stores: ['Epic'],
      kind: el?.offerType === 'ADD_ON' || el?.offerType === 'DLC' ? 'dlc' : 'game',
      worth: original && original !== '0' && !/^\D*0([.,]0+)?$/.test(original) ? String(original) : null,
      url: slug ? `https://store.epicgames.com/pt-BR/p/${slug}` : 'https://store.epicgames.com/pt-BR/free-games',
      starts_at: win.start ? new Date(win.start).toISOString() : null,
      ends_at: win.end ? new Date(win.end).toISOString() : null,
      upcoming: !freeNow,
    })
  }
  return out
}

/** Junta as fontes; um jogo da Epic que aparece nas duas fica com a versão da Epic (preço em reais, descrição em português). */
export function merge(gp: Game[], epic: Game[]): Game[] {
  const epicTitles = new Set(epic.filter((g) => !g.upcoming).map((g) => sameTitle(g.title)))
  const rest = gp.filter((g) => !(g.stores.includes('Epic') && epicTitles.has(sameTitle(g.title))))
  return [...epic, ...rest]
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { 'User-Agent': 'MemoriasDaTurma/1.0 (jogos gratis)' } })
  if (response.status === 201) return [] // GamerPower: "nenhuma promoção agora"
  if (!response.ok) throw new Error(`${new URL(url).host} ${response.status}`)
  return response.json()
}

async function refresh() {
  const [gpResult, epicResult] = await Promise.allSettled([
    fetchJson('https://www.gamerpower.com/api/giveaways?sort-by=date'),
    fetchJson('https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=pt-BR&country=BR&allowCountries=BR'),
  ])
  if (gpResult.status === 'rejected' && epicResult.status === 'rejected') throw new Error('As duas fontes falharam.')
  const gp = gpResult.status === 'fulfilled' ? fromGamerPower(gpResult.value) : []
  const epic = epicResult.status === 'fulfilled' ? fromEpic(epicResult.value) : []
  const games = merge(gp, epic)

  // o que já existe (para saber o que é novo e não traduzir de novo)
  const known: any[] = await db('free_games?select=key,description,source,active,upcoming')
  const byKey = new Map(known.map((g) => [g.key, g]))
  const firstRun = known.length === 0

  // traduz só as descrições novas do GamerPower (no máximo 12 por vez)
  let translated = 0
  for (const g of games) {
    const old = byKey.get(g.key)
    if (g.source !== 'gamerpower' || !g.description) continue
    if (old?.description && old.description !== g.description) {
      g.description = old.description // já traduzida antes (a guardada é diferente do original em inglês)
      continue
    }
    if (translated >= 12) continue
    translated += 1
    g.description = (await translate(g.description)) ?? g.description
  }

  const now = new Date().toISOString()
  if (games.length) {
    await db('free_games?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(games.map((g) => ({ ...g, active: true, last_seen: now }))),
    })
  }
  // o que sumiu das fontes que responderam: acabou
  const seen = new Set(games.map((g) => g.key))
  const okSources = [gpResult.status === 'fulfilled' ? 'gamerpower' : null, epicResult.status === 'fulfilled' ? 'epic' : null].filter(Boolean)
  const gone = known.filter((g) => g.active && okSources.includes(g.source) && !seen.has(g.key)).map((g) => g.key)
  for (let i = 0; i < gone.length; i += 50) {
    const keys = gone.slice(i, i + 50).map((k) => `"${k.replace(/"/g, '')}"`).join(',')
    await db(`free_games?key=in.(${keys})`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: false }) })
  }

  // avisa a turma: jogos completos que acabaram de ficar grátis (nada na primeira vez, para não lotar)
  let announced = 0
  if (!firstRun) {
    const fresh = games.filter((g) => {
      const old = byKey.get(g.key)
      return g.kind === 'game' && !g.upcoming && (!old || old.upcoming || !old.active)
    })
    for (const g of fresh.slice(0, MAX_ANNOUNCE)) {
      try {
        await rpc('free_games_announce', { p_key: g.key })
        announced += 1
      } catch {
        /* aviso nunca derruba a atualização */
      }
    }
  }

  await db('free_games_state?id=eq.1', {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ refreshed_at: now, refreshing: null }),
  })
  return { total: games.length, gone: gone.length, announced, sources: okSources }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405)

  // só quem está logado no app (conferido aqui; o Verify JWT do painel fica desligado, como na igdb-search)
  const authorization = req.headers.get('authorization') ?? ''
  const apikey = Deno.env.get('SUPABASE_ANON_KEY') ?? req.headers.get('apikey') ?? ''
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authorization, apikey } }).catch(() => null)
  if (!who || !who.ok) return reply({ error: 'Sessão inválida. Saia e entre de novo no app.' }, 401)
  if (!SERVICE_KEY) return reply({ error: 'A função não achou a chave de serviço do Supabase.' }, 500)

  try {
    const mine = await rpc('free_games_try_lock', { p_max_age: MAX_AGE })
    if (mine !== true) return reply({ refreshed: false })
    try {
      return reply({ refreshed: true, ...(await refresh()) })
    } catch (err) {
      // libera a trava para a próxima pessoa tentar
      await db('free_games_state?id=eq.1', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ refreshing: null }) }).catch(() => {})
      return reply({ refreshed: false, error: String((err as Error)?.message ?? err) }, 502)
    }
  } catch (err) {
    const msg = String((err as Error)?.message ?? err)
    if (/free_games/.test(msg)) return reply({ error: 'Falta rodar a migração "migracao-jogos-gratis.sql" no Supabase.' }, 500)
    return reply({ error: msg }, 500)
  }
})
