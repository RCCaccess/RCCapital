// v5: auth, reports, CSV and HTML are never cached.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rccapital-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(fetch(e.request));});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});

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
      data: { url: '/RCCapital/inversores.html' }
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
      if(clients.openWindow) return clients.openWindow('/RCCapital/inversores.html');
    })
  );
});

