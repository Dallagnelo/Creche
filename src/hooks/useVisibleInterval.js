import { useEffect, useRef } from 'react'

/**
 * Repete `callback` a cada `ms` milissegundos, mas SÓ enquanto a aba está visível.
 * Aba em segundo plano não gasta requisições; ao voltar para ela, atualiza na hora e retoma o intervalo.
 */
export function useVisibleInterval(callback, ms) {
  const saved = useRef(callback)
  saved.current = callback

  useEffect(() => {
    let id = null
    const start = () => {
      if (id === null) id = setInterval(() => saved.current(), ms)
    }
    const stop = () => {
      if (id !== null) {
        clearInterval(id)
        id = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        saved.current()
        start()
      } else {
        stop()
      }
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [ms])
}
