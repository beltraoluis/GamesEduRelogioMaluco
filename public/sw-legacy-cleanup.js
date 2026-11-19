self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => /^relogio-maluco-v\d+$/.test(k)).map((k) => caches.delete(k)))
    )
  );
});
