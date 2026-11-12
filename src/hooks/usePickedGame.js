import { useCallback, useRef, useState } from 'react'
import { translateSummary } from '../services/igdb'

/**
 * Guarda o jogo escolhido na busca do IGDB e traduz a sinopse para português logo que ele é escolhido.
 * "translating" fica verdadeiro enquanto a tradução não chega (o botão de salvar espera por ela).
 */
export function usePickedGame() {
  const [picked, setPicked] = useState(null)
  const [translating, setTranslating] = useState(false)
  const token = useRef(0) // se a pessoa trocar de jogo no meio da tradução, a resposta antiga é descartada

  const pick = useCallback(async (game) => {
    const mine = ++token.current
    setPicked(game)
    if (!game.summary) {
      setTranslating(false)
      return
    }
    setTranslating(true)
    const text = await translateSummary(game.summary)
    if (token.current !== mine) return
    if (text) setPicked((current) => (current ? { ...current, summary: text } : current))
    setTranslating(false)
  }, [])

  const clear = useCallback(() => {
    token.current += 1
    setPicked(null)
    setTranslating(false)
  }, [])

  return { picked, translating, pick, clear }
}
