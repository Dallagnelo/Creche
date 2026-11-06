import { useCallback, useEffect, useState } from 'react'

/**
 * Hook para carregar dados assíncronos (ex.: buscar posts no banco).
 * Cuida dos três estados que toda tela precisa: carregando, erro e sucesso.
 *
 *   const { data, loading, error, reload } = useAsyncData(listPosts)
 *
 * `reload()` busca de novo, útil depois de criar ou apagar algo.
 */
export function useAsyncData(fetcher) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: null }))
    try {
      const data = await fetcher()
      setState({ data, loading: false, error: null })
    } catch (error) {
      console.error(error)
      setState({ data: null, loading: false, error })
    }
  }, [fetcher])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}
