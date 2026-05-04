// Option Panda service worker — minimal, just enough for iOS PWA push
// notifications. iOS 16.4+ supports Web Push but ONLY for sites the user
// has added to their home screen, AND only when the alert is fired through
// a registered service worker (the browser-level `new Notification()` API
// is unsupported on iOS Safari).
//
// We don't subscribe to a push service — Option Panda is single-user,
// runs entirely in the browser, and doesn't have a backend to push from.
// Instead, when the page wants to fire a notification it calls
// `registration.showNotification()` directly. The service worker just
// has to be installed for iOS to allow that path.
//
// Cache strategy: pure passthrough. We DO NOT cache index.html or any
// asset — caching is what caused the 10-minute stale-HTML bug earlier.
// The browser's HTTP cache (gated by our Cache-Control: no-cache meta
// tags) handles freshness; the service worker just installs and gets
// out of the way.

self.addEventListener('install', function(e){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(self.clients.claim());
});

// Handle notification clicks — focus an existing tab if one is open,
// otherwise open the scanner.
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(clients){
      for (var i=0; i<clients.length; i++){
        var c = clients[i];
        if (c.url.indexOf('alexreed122287.github.io/scanner') >= 0 && 'focus' in c){
          return c.focus();
        }
      }
      if (self.clients.openWindow){
        return self.clients.openWindow('/');
      }
    })
  );
});

// No fetch handler — let the browser handle all network as-is.
