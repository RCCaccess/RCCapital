// RC Capital Service Worker v3.0
const CACHE = 'rccapital-v4';
const SHELL = [
  '/RCCapital/index.html',
  '/RCCapital/logo.png',
  '/RCCapital/manifest.json',
  '/RCCapital/icons/icon-192.png',
  '/RCCapital/icons/icon-512.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(SHELL.map(url => cache.add(url).catch(()=>{})))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  if(e.request.url.startsWith('chrome-extension')) return;
  if(e.request.url.includes('supabase.co')){
    e.respondWith(fetch(e.request));
    return;
  }
  // Never serve stale HTML — always go to network for pages
  if(e.request.mode === 'navigate' || e.request.destination === 'document'){
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  if(e.request.url.includes('rccaccess.github.io')){
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if(res.ok){
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', e => {
  let data = { title: 'RC Capital', body: 'Tienes un nuevo reporte disponible.' };
  try{ if(e.data) data = e.data.json(); }catch(err){}
  e.waitUntil(
    self.registration.showNotification(data.title||'RC Capital', {
      body: data.body,
      icon: '/RCCapital/icons/icon-192.png',
      badge: '/RCCapital/icons/icon-192.png',
      tag: 'rc-report',
      renotify: true,
      data: { url: '/RCCapital/index.html' }
    })
  );
});

// Tap notification → open app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window'}).then(list => {
      for(const c of list){
        if(c.url.includes('RCCapital') && 'focus' in c) return c.focus();
      }
      if(clients.openWindow) return clients.openWindow('/RCCapital/index.html');
    })
  );
});

self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});
