/* Socorro para tela em branco.
 * Se o site não desenhar nada em alguns segundos (ex.: o navegador guardou um arquivo velho de outra versão),
 * apaga o service worker e o cache do site e recarrega UMA vez. Fica fora do pacote do Vite de propósito:
 * precisa funcionar justamente quando o código principal não carrega.
 */
(function () {
  var KEY = 'boot-recover'
  function recover() {
    try {
      if (sessionStorage.getItem(KEY)) return // já tentou nesta aba: não fica recarregando sem parar
      sessionStorage.setItem(KEY, '1')
    } catch (e) {
      return
    }
    var jobs = []
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(
        navigator.serviceWorker.getRegistrations().then(function (list) {
          return Promise.all(list.map(function (r) { return r.unregister() }))
        }),
      )
    }
    if (window.caches && caches.keys) {
      jobs.push(
        caches.keys().then(function (names) {
          return Promise.all(names.map(function (name) { return caches.delete(name) }))
        }),
      )
    }
    Promise.all(jobs)
      .catch(function () {})
      .then(function () { location.reload() })
  }
  window.addEventListener('load', function () {
    setTimeout(function () {
      var root = document.getElementById('root')
      if (root && root.children.length) {
        try { sessionStorage.removeItem(KEY) } catch (e) { /* sem armazenamento */ }
        return
      }
      recover()
    }, 6000)
  })
})()
