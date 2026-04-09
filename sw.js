// Este é um Service Worker básico apenas para permitir a instalação do PWA.
// Ele passa todas as requisições direto para a rede (não faz cache agressivo para evitar bugs nas suas atualizações).

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
