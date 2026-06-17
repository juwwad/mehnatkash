// Custom service worker push event handler
// This is injected alongside the PWA service worker

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "You have a new notification",
      icon: data.icon || "/app-icon.svg",
      badge: data.badge || "/app-icon.svg",
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        { action: "open", title: "View" },
        { action: "dismiss", title: "Dismiss" },
      ],
      tag: data.data?.bookingId || "general",
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "TashkHaath Connect", options)
    );
  } catch (e) {
    console.error("Push event error:", e);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/bookings";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});
