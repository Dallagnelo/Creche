import { useEffect, useRef } from 'react'

// Botão "voltar" do celular fecha a janela aberta (em vez de sair da página).
// Cada janela aberta empilha uma entrada no histórico; voltar fecha a de cima.
// Quando a janela fecha por outro caminho (X, clicar fora, salvar), a entrada é desfeita.

const stack = [] // { id, onClose, pushed }
let nextId = 1
let ignore = 0 // popstates causados por nós mesmos (history.back) que devem ser ignorados
let listening = false

function flush() {
  stack.forEach((item) => {
    if (!item.pushed) {
      window.history.pushState({ ...(window.history.state || {}), __modal: item.id }, '')
      item.pushed = true
    }
  })
}

function onPop() {
  if (ignore > 0) {
    ignore -= 1
    if (ignore === 0) flush()
    return
  }
  if (stack.length) {
    const top = stack.pop()
    top.onClose()
    return
  }
  // Entrada de janela que ficou para trás (ex.: a pessoa navegou de dentro da janela): pula.
  if (window.history.state && window.history.state.__modal) window.history.back()
}

function register(onClose) {
  if (!listening) {
    window.addEventListener('popstate', onPop)
    listening = true
  }
  const item = { id: nextId++, onClose, pushed: false }
  stack.push(item)
  if (ignore === 0) flush()
  return item
}

function unregister(item) {
  const i = stack.indexOf(item)
  if (i === -1) return // já foi fechada pelo botão voltar
  stack.splice(i, 1)
  if (!item.pushed) return
  if (window.history.state && window.history.state.__modal === item.id) {
    ignore += 1
    window.history.back()
  }
}

export function useBackClose(onClose) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    const item = register(() => ref.current())
    return () => unregister(item)
  }, [])
}
