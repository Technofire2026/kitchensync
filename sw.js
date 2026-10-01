/* Kitchen Sync — Service Worker
   Objetivo: permitir a instalação na tela inicial e um funcionamento offline básico.
   NUNCA faz cache das chamadas ao Supabase (outra origem) — os dados são sempre buscados ao vivo. */
const CACHE = 'ks-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Só mexe no que é do próprio site. Supabase e fontes externas passam direto (sempre ao vivo).
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir o app): rede primeiro, cai pro cache se estiver offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // Demais arquivos do site (ícones, etc.): cache primeiro, atualiza em segundo plano.
  e.respondWith(
    caches.match(req).then((m) =>
      m || fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; }).catch(() => m)
    )
  );
});
