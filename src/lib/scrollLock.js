// Trava a rolagem da página enquanto existir qualquer modal aberto
// (.modal-backdrop). Funciona para todas as janelas sem mexer em cada uma.
// Usa position:fixed no body porque só overflow:hidden não basta no celular (iOS).
export function initScrollLock() {
  let locked = false
  let scrollY = 0

  function lock() {
    scrollY = window.scrollY
    const body = document.body
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    locked = true
  }

  function unlock() {
    const body = document.body
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    body.style.width = ''
    body.style.overflow = ''
    window.scrollTo(0, scrollY)
    locked = false
  }

  function check() {
    const open = !!document.querySelector('.modal-backdrop')
    if (open && !locked) lock()
    else if (!open && locked) unlock()
  }

  new MutationObserver(check).observe(document.body, { childList: true, subtree: true })
  check()
}
