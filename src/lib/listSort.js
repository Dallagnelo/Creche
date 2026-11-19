// Ordenação das listas de filmes e jogos (feita na tela, sem ir ao servidor).

const nameOf = (item) => item.title ?? item.name ?? ''
const time = (value) => (value ? new Date(value).getTime() : 0)
const byName = (a, b) => nameOf(a).localeCompare(nameOf(b), 'pt-BR', { sensitivity: 'base', numeric: true })
const myScore = (item, userId) => item.ratings?.find((rating) => rating.user_id === userId)?.score ?? null

// Itens sem valor (sem nota, sem ano...) sempre vão para o fim, nos dois sentidos.
function byValue(get, dir) {
  return (a, b) => {
    const va = get(a)
    const vb = get(b)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return (va - vb) * dir
  }
}

/*
 * Ranking por nota com peso para a quantidade de votos (média bayesiana, como o ranking do IMDb):
 *   nota do ranking = (votos × média do item + m × média geral) / (votos + m)
 * Cada item "ganha" m votos imaginários na média geral da lista. Com poucos votos a nota fica
 * puxada para a média; com muitos, vale a nota real. Ex. (média geral 3,5): 5★ com 2 votos = 4,1;
 * 4,5★ com 7 votos = 4,2 (fica na frente). A tela continua mostrando a média real; isto só decide a ordem.
 * m maior = votos pesam mais; m menor = a nota pesa mais. A média geral usada tem teto de 3,5.
 */
export const RANK_PRIOR_VOTES = 3
export const RANK_PRIOR_MAX = 3.5

/** Devolve uma função item -> nota do ranking (null se não tem nota), usando a média geral da lista. */
export function rankScorer(list) {
  let sum = 0
  let count = 0
  for (const item of list) {
    for (const rating of item.ratings ?? []) {
      if (Number.isFinite(rating.score)) {
        sum += rating.score
        count += 1
      }
    }
  }
  // a média geral tem teto de 3,5: numa turma que dá nota alta para tudo (média 4,5+), um 5★ com
  // 2 votos ganharia de um 4,5★ com 7 votos de qualquer jeito; com o teto, os votos voltam a pesar
  const mean = Math.min(count ? sum / count : RANK_PRIOR_MAX, RANK_PRIOR_MAX)
  return (item) => {
    const votes = item.ratings?.length ?? 0
    if (!votes || item.average == null) return null
    return (votes * item.average + RANK_PRIOR_VOTES * mean) / (votes + RANK_PRIOR_VOTES)
  }
}

const byVotes = byValue((item) => item.ratings?.length || null, -1)
// empate na nota do ranking: quem tem mais votos primeiro
const byRank = (dir) => (list) => {
  const rank = byValue(rankScorer(list), dir)
  return (a, b) => rank(a, b) || byVotes(a, b)
}

export const SORTS = [
  { id: 'recent', label: 'Adicionados recentemente', compare: byValue((item) => time(item.created_at), -1) },
  { id: 'oldest', label: 'Adicionados há mais tempo', compare: byValue((item) => time(item.created_at), 1) },
  { id: 'best', label: 'Maior nota da turma', compare: byRank(-1), withList: true },
  { id: 'worst', label: 'Menor nota da turma', compare: byRank(1), withList: true },
  { id: 'mine', label: 'Minha nota', compare: (userId) => byValue((item) => myScore(item, userId), -1), withUser: true },
  { id: 'most', label: 'Mais avaliados', compare: byValue((item) => item.ratings?.length || null, -1) },
  { id: 'newest', label: 'Lançamento mais novo', compare: byValue((item) => item.release_year, -1) },
  { id: 'classic', label: 'Lançamento mais antigo', compare: byValue((item) => item.release_year, 1) },
  { id: 'az', label: 'Nome (A–Z)', compare: byName },
  { id: 'za', label: 'Nome (Z–A)', compare: (a, b) => byName(b, a) },
]

export const DEFAULT_SORT = 'recent'

/** Devolve uma cópia da lista na ordem escolhida (empates: mais recente primeiro, depois nome). */
export function sortList(list, sortId, userId) {
  const sort = SORTS.find((item) => item.id === sortId) ?? SORTS[0]
  const compare = sort.withUser ? sort.compare(userId) : sort.withList ? sort.compare(list) : sort.compare
  const tie = byValue((item) => time(item.created_at), -1)
  return [...list].sort((a, b) => compare(a, b) || tie(a, b) || byName(a, b))
}

/** Lembra a ordem escolhida em cada lista (neste aparelho). */
export function savedSort(key) {
  try {
    const value = localStorage.getItem(`ordem:${key}`)
    return SORTS.some((item) => item.id === value) ? value : DEFAULT_SORT
  } catch {
    return DEFAULT_SORT
  }
}

export function saveSort(key, value) {
  try {
    localStorage.setItem(`ordem:${key}`, value)
  } catch {
    // sem armazenamento: só não lembra da próxima vez
  }
}
