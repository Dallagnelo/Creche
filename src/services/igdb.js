import { supabase } from '../lib/supabase'

// A busca de jogos passa por uma "Edge Function" do Supabase (igdb-search),
// porque o IGDB exige um segredo que não pode ficar no navegador.

/** "PC (Microsoft Windows)" -> "PC", "Nintendo Switch" -> "Switch" */
export function shortPlatform(name) {
  if (/^PC/i.test(name)) return 'PC'
  return name.replace(/^Nintendo /, '')
}

// Tamanhos de capa do IGDB (o endereço guardado no banco usa o "t_cover_big"; trocamos só o trecho do tamanho).
//   thumb -> miniatura da lista de busca    (90 x 128)
//   pick  -> resumo do jogo escolhido       (264 x 374)
//   card  -> capa do cartão da página       (528 x 748, nítida em telas de alta densidade)
//   hero  -> capa grande da janela do jogo  (~509 x 720)
const COVER_SIZES = { thumb: 't_cover_small', pick: 't_cover_big', card: 't_cover_big_2x', hero: 't_720p' }

/** Endereço da capa no tamanho pedido. Imagens que não são do IGDB (fotos enviadas) passam sem mudança. */
export function coverUrl(url, size = 'card') {
  if (!url || !url.includes('images.igdb.com')) return url ?? null
  return url.replace(/\/t_[^/]+\//, `/${COVER_SIZES[size]}/`)
}

// Gêneros do IGDB em português.
const GENRES_PT = {
  Adventure: 'Aventura',
  Arcade: 'Arcade',
  'Card & Board Game': 'Cartas e tabuleiro',
  Fighting: 'Luta',
  "Hack and slash/Beat 'em up": "Hack and slash",
  Indie: 'Indie',
  MOBA: 'MOBA',
  Music: 'Música',
  Pinball: 'Pinball',
  Platform: 'Plataforma',
  'Point-and-click': 'Point-and-click',
  Puzzle: 'Quebra-cabeça',
  Quiz: 'Quiz',
  'Quiz/Trivia': 'Quiz',
  Racing: 'Corrida',
  'Real Time Strategy (RTS)': 'Estratégia em tempo real',
  'Role-playing (RPG)': 'RPG',
  Shooter: 'Tiro',
  Simulator: 'Simulação',
  Sport: 'Esporte',
  Strategy: 'Estratégia',
  Tactical: 'Tático',
  'Turn-based strategy (TBS)': 'Estratégia por turnos',
  'Visual Novel': 'Visual novel',
}
const genrePt = (name) => GENRES_PT[name] ?? name

/** Traduz a sinopse (vem em inglês) para português. Se a tradução falhar, devolve null e fica o texto original. */
export async function translateSummary(text) {
  if (!text) return null
  try {
    const { data, error } = await supabase.functions.invoke('igdb-search', { body: { translate: text } })
    if (error) return null
    return data?.text || null
  } catch {
    return null
  }
}

async function readError(error) {
  const response = error?.context
  // Quando o navegador bloqueia a chamada (CORS) ou a função não existe/não responde, não há resposta HTTP para ler.
  if (error?.name === 'FunctionsFetchError' || !response) {
    return 'Não consegui falar com a função "igdb-search". Confira se ela foi publicada (Edge Functions) e se o "Verify JWT" está desligado.'
  }
  if (response?.status === 404) {
    return 'A função "igdb-search" ainda não foi criada no Supabase. Veja supabase/functions/igdb-search/LEIA-ME.md.'
  }
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json()
      if (body?.error) return body.error
    } catch {
      /* resposta sem JSON: cai na mensagem padrão abaixo */
    }
  }
  return 'Não foi possível buscar no IGDB agora. Tente de novo em instantes.'
}

/** Busca jogos pelo nome. Devolve até 8: { id, name, year, platforms, coverUrl }. */
export async function searchIgdbGames(text) {
  const term = text.trim()
  if (!term) return []

  const { data, error } = await supabase.functions.invoke('igdb-search', { body: { query: term } })
  if (error) throw new Error(await readError(error))
  return data.map((game) => ({ ...game, genres: (game.genres ?? []).map(genrePt) }))
}
