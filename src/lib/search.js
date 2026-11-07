/** Deixa o texto sem acento e em minúsculas, para "acao" achar "Ação". */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Todas as palavras digitadas precisam aparecer em algum dos campos (ordem não importa). */
export function matchesQuery(query, ...fields) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalize(fields.filter(Boolean).join(' '))
  return words.every((word) => haystack.includes(word))
}
