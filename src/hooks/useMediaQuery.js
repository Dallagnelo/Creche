import { useEffect, useState } from 'react'

/** true enquanto a tela bate com a regra (ex.: '(max-width: 700px)'); atualiza se a tela mudar. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

export const usePhone = () => useMediaQuery('(max-width: 700px)')
