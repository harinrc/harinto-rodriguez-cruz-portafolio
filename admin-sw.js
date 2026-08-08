const ADMIN_CACHE = 'admin-chat-v1';
const ADMIN_SHELL = [
  './admin-chat.html',
  './admin-chat.css',
  './admin-chat.js',
  './favicon.png',
  './admin-manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(ADMIN_CACHE).then((cache) => cache.addAll(ADMIN_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys
      .filter((k) => k !== ADMIN_CACHE)
      .map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(ADMIN_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./admin-chat.html'));
    })
  );
});

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBlDIPX-Tzj3uJ3xoPboBwhfeRCxVa0rQc',
  authDomain: 'portafolio-harin.firebaseapp.com',
  databaseURL: 'https://portafolio-harin-default-rtdb.firebaseio.com',
  projectId: 'portafolio-harin',
  storageBucket: 'portafolio-harin.firebasestorage.app',
  messagingSenderId: '754750655831',
  appId: '1:754750655831:web:3cbfb1a695c7ee39838212'
});

if (firebase.messaging.isSupported()) {
  const messaging = firebase.messaging();
  messaging.setBackgroundMessageHandler((payload) => {
    const data = payload && payload.data ? payload.data : {};
    const title = data.title || 'Nuevo mensaje';
    const body = data.body || data.text || 'Tienes un nuevo mensaje en Admin Chat';
    const conversationId = data.conversationId || '';
    const targetUrl = data.url || './admin-chat.html';
    // Tag por conversacion (no por mensaje): una rafaga de mensajes seguidos
    // reemplaza la misma notificacion en vez de apilar una nueva por cada
    // uno, evitando que el sonido se repita sin parar.
    const notificationTag = ['chat', conversationId || 'general'].join('-');

    return self.registration.showNotification(title, {
      body,
      icon: './favicon.png',
      badge: './favicon.png',
      tag: notificationTag,
      renotify: false,
      data: {
        url: targetUrl,
        conversationId
      }
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './admin-chat.html';
  event.waitUntil(clients.openWindow(target));
});
