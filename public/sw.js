/* Service worker do app instalável (PWA).
 * Só guarda os ARQUIVOS DO SITE (código e visual). Dados, fotos, chat e live nunca passam por aqui:
 * tudo que não é do próprio site (Supabase, TMDB, YouTube...) vai direto para a rede.
 * Para forçar uma atualização do service worker, mude o número de CACHE.
 */
const CACHE = 'memorias-v1'

self.addEventListener('install', () => {
  // não ativa sozinho: o app mostra "Nova versão disponível" e manda SKIP_WAITING
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Supabase, TMDB etc.: direto da rede
  if (url.pathname === '/sw.js') return

  // Arquivos com hash no nome (/assets/...) nunca mudam: pode servir do cache.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
    return
  }

  // Páginas: sempre tenta a rede primeiro (assim o deploy novo chega na hora); sem internet, usa a última cópia.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put('/index.html', response.clone()))
          return response
        })
        .catch(async () => (await caches.match('/index.html')) || Response.error()),
    )
  }
})
