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

export const SORTS = [
  { id: 'recent', label: 'Adicionados recentemente', compare: byValue((item) => time(item.created_at), -1) },
  { id: 'oldest', label: 'Adicionados há mais tempo', compare: byValue((item) => time(item.created_at), 1) },
  { id: 'best', label: 'Maior nota da turma', compare: byValue((item) => item.average, -1) },
  { id: 'worst', label: 'Menor nota da turma', compare: byValue((item) => item.average, 1) },
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
  const compare = sort.withUser ? sort.compare(userId) : sort.compare
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
