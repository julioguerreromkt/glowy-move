/*
 * Service worker do Glowy Move.
 *
 * Estratégia offline-first sem depender dos nomes com hash do build:
 * - navegações: rede primeiro, com queda para a página em cache e, por fim,
 *   para a home já visitada;
 * - demais arquivos do próprio domínio (JS, CSS, fontes, wasm, modelos,
 *   ícones): cache primeiro, buscando na rede e guardando quando faltar.
 *
 * Assim, depois da primeira visita online, o app abre e funciona sem rede.
 * Requisições para outros domínios (miniaturas do YouTube) não são tocadas.
 */

const CACHE = 'glowy-move-v1';
const CORE = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return;
  caches.open(CACHE).then((cache) => cache.put(request, response)).catch(() => undefined);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putInCache(request, response.clone());
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          putInCache(request, response.clone());
          return response;
        })
        .catch(() => cached);
    }),
  );
});
