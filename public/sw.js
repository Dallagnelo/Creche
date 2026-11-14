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

// ---------- Notificações (push): chegam mesmo com o site fechado
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Memórias da Turma', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      renotify: !!data.tag,
      data: { link: data.link || '/' },
    }),
  )
})

// Tocar na notificação: abre o site na página certa (reaproveita a aba/app se já estiver aberto)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.link || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const mine = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (mine) {
        await mine.focus()
        if ('navigate' in mine) return mine.navigate(target).catch(() => mine.postMessage({ type: 'open', link: event.notification.data?.link }))
        return undefined
      }
      return self.clients.openWindow(target)
    })(),
  )
})
