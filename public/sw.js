const CACHE = "tasuku-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // ナビゲーション（HTMLページ）: ネットワーク優先
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/") ?? Response.error())
    );
    return;
  }

  // 静的アセット: キャッシュ優先
  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(png|ico|svg)$/)) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached ??
        fetch(e.request).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
      )
    );
  }
});

// サーバーからのプッシュ通知（VAPID連携時に使用）
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "タスク管理", {
      body: data.body ?? "",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: data.tag,
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((cls) => {
        const w = cls.find((c) => "focus" in c);
        return w ? w.focus() : self.clients.openWindow(e.notification.data?.url ?? "/");
      })
  );
});
