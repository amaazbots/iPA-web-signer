const CACHE="amaazsign-shell-v1";
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["/help","/privacy","/amaazsign-logo.png"]))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin||!["/help","/privacy","/amaazsign-logo.png"].includes(url.pathname))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
