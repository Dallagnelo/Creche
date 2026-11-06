/**
 * Conta quantos itens existem para cada "chave" e devolve do maior para o menor.
 *
 *   countBy(posts, (post) => post.author.display_name)
 *   // -> [{ label: 'Ana', count: 5, sample: <1º post da Ana> }, ...]
 *
 * `sample` é o primeiro item do grupo; útil para pegar, por exemplo, a foto de perfil.
 */
export function countBy(list, getKey) {
  const groups = new Map()
  for (const item of list) {
    const key = getKey(item)
    const group = groups.get(key) ?? { label: key, count: 0, sample: item }
    group.count += 1
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => b.count - a.count)
}
