/**
 * PeakHer Service Worker: Push Notifications
 */

self.addEventListener('push', function (event) {
  var data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'PeakHer', body: event.data.text() };
    }
  }

  var title = data.title || 'PeakHer';
  var options = {
    body: data.body || '',
    icon: data.icon || '/app/icon-192.png',
    badge: data.icon || '/app/icon-192.png',
    data: {
      url: data.url || '/app/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var url = (event.notification.data && event.notification.data.url) || '/app/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a PeakHer tab is already open, focus it and navigate
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf('/app') !== -1 && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
