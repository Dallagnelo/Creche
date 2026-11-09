import { useCallback, useEffect, useRef, useState } from 'react'
import { FRESH_MS, fetchCached, peekCache, subscribeCache } from '../lib/dataCache'

/**
 * Hook para carregar dados assíncronos (ex.: buscar posts no banco).
 * Cuida dos três estados que toda tela precisa: carregando, erro e sucesso.
 *
 *   const { data, loading, error, reload } = useAsyncData(listPosts, 'posts')
 *
 * Com `key`, os dados ficam guardados num cache compartilhado: a tela abre
 * na hora com o que já foi buscado e o hook confere o banco em segundo plano
 * (`loading` só fica true quando não há nada para mostrar ainda).
 * Sem `key`, funciona como antes, sem cache.
 *
 * `reload()` busca de novo, útil depois de criar ou apagar algo.
 */
export function useAsyncData(fetcher, key) {
  const [state, setState] = useState(() => {
    const cached = peekCache(key)
    return cached
      ? { data: cached.data, loading: false, error: null }
      : { data: null, loading: true, error: null }
  })
  const hasData = useRef(state.data !== null)
  hasData.current = state.data !== null

  const load = useCallback(
    async ({ force = true } = {}) => {
      if (!hasData.current) setState((previous) => ({ ...previous, loading: true, error: null }))
      try {
        const data = key ? await fetchCached(key, fetcher, { force }) : await fetcher()
        setState({ data, loading: false, error: null })
      } catch (error) {
        console.error(error)
        // Se já havia dados na tela, mantém eles em vez de apagar tudo.
        setState((previous) =>
          previous.data !== null ? { ...previous, loading: false } : { data: null, loading: false, error },
        )
      }
    },
    [fetcher, key],
  )

  // Ao abrir: se o cache é recente, não busca; senão confere o banco.
  useEffect(() => {
    const cached = peekCache(key)
    if (cached && Date.now() - cached.at < FRESH_MS) return
    load({ force: false })
  }, [load, key])

  // Recebe dados novos quando outra tela (ou a busca antecipada) atualiza a chave.
  useEffect(() => {
    if (!key) return undefined
    return subscribeCache(key, (entry) => {
      if (entry) setState({ data: entry.data, loading: false, error: null })
      else setState({ data: null, loading: true, error: null }) // trocou de conta
    })
  }, [key])

  const reload = useCallback(() => load({ force: true }), [load])
  return { ...state, reload }
}
