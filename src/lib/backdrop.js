// Fechar janela (modal) clicando no fundo escuro.
// Só fecha se o clique COMEÇOU e TERMINOU no fundo. Assim, quem está selecionando texto dentro da janela
// e solta o mouse fora dela não perde o que escreveu.
export function backdropClose(onClose) {
  return {
    onPointerDown: (event) => {
      event.currentTarget.dataset.pressed = event.target === event.currentTarget ? '1' : ''
    },
    onClick: (event) => {
      const startedHere = event.currentTarget.dataset.pressed === '1'
      event.currentTarget.dataset.pressed = ''
      if (startedHere && event.target === event.currentTarget) onClose?.()
    },
  }
}
