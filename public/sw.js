// ─────────────────────────────────────────────────────────────────────────────
// MedTime Service Worker
//
// Responsibilities:
//   1. Cache-first strategy for static assets (PWA shell)
//   2. Handle 'push' events from Supabase Edge Function (VAPID ping)
//   3. On push: read localforage IndexedDB to find the matching dose,
//      build a rich notification — all medication data stays on-device.
//   4. Handle 'notificationclick' to focus or open the app.
// ─────────────────────────────────────────────────────────────────────────────

importScripts(
  'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js',
);

const CACHE_NAME = 'medtime-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon.jpg'];

// Tolerance window: consider a dose "due now" if its scheduled time
// is within ±5 minutes of the current time.
const MATCH_TOLERANCE_MS = 5 * 60 * 1000;

// ── Install: pre-cache static shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── Activate: clean up stale caches ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: cache-first for static, network for everything else ────────────────
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests for the same origin
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
  );
});

// ── Push: triggered by Supabase Edge Function every minute ───────────────────
self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  // Payload sent by the Edge Function: { scheduledTime: number (Unix ms) }
  // Intentionally minimal — no medication data on the server.
  let scheduledTime = null;

  if (event.data) {
    try {
      const payload = event.data.json();
      scheduledTime = payload.scheduledTime ?? null;
    } catch {
      // Malformed payload: show generic notification
    }
  }

  // ── Look up matching dose in local IndexedDB via localforage ─────────────
  const notificationOptions = await buildNotificationOptions(scheduledTime);

  await self.registration.showNotification(
    notificationOptions.title,
    notificationOptions,
  );

  // ── Inform page clients so local polling won't double-fire ───────────────
  // The tag encodes medicationId + scheduledTime, matching what TodayPage uses.
  if (notificationOptions.tag && notificationOptions.tag !== 'medtime-generic') {
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    allClients.forEach((client) =>
      client.postMessage({ type: 'PUSH_NOTIFIED', tag: notificationOptions.tag }),
    );
  }
}

/**
 * Reads the 'doses' array from localforage, finds the dose whose
 * scheduledTime is closest to `scheduledTime` (within ±5 min),
 * and builds the full notification options object.
 *
 * Falls back to a generic notification if no match is found.
 */
async function buildNotificationOptions(scheduledTime) {
  const FALLBACK = {
    title: '💊 Hora do Remédio!',
    body: 'Está na hora de tomar seu medicamento.',
    icon: '/icon.jpg',
    badge: '/icon.jpg',
    vibrate: [100, 50, 100],
    data: { url: '/' },
    tag: 'medtime-generic',
  };

  if (!scheduledTime) return FALLBACK;

  try {
    // localforage stores the full doses array under the key 'doses'
    const doses = (await localforage.getItem('doses')) ?? [];

    if (!Array.isArray(doses) || doses.length === 0) return FALLBACK;

    // Find the dose closest to the scheduled time within tolerance
    const due = doses.find(
      (dose) =>
        dose.status === 'pending' &&
        Math.abs(dose.scheduledTime - scheduledTime) <= MATCH_TOLERANCE_MS,
    );

    if (!due) return FALLBACK;

    // Look up person name and medication dosage (dosage lives in medications, not doses)
    const [people, medications] = await Promise.all([
      localforage.getItem('people').then((v) => v ?? []),
      localforage.getItem('medications').then((v) => v ?? []),
    ]);
    const person = people.find((p) => p.id === due.personId);
    const personLabel = person ? ` para ${person.name}` : '';

    const med = medications.find((m) => m.id === due.medicationId);
    const dosageLabel = med?.dosage ? `(${med.dosage}) ` : '';
    const antibioticLabel = due.isAntibiotic ? ' ⚠️ Antibiótico' : '';

    return {
      title: `💊 ${due.medicationName}${antibioticLabel}`,
      body: `Hora do ${due.medicationName}${dosageLabel}${personLabel}.`,
      icon: '/icon.jpg',
      badge: '/icon.jpg',
      vibrate: [100, 50, 100],
      // Pass the scheduledTime so the app can mark the dose as taken
      data: {
        url: '/',
        scheduledTime: due.scheduledTime,
        medicationId: due.medicationId,
      },
      tag: `medtime-dose-${due.medicationId}-${due.scheduledTime}`,
      renotify: false,
    };
  } catch (err) {
    console.error('[SW] Failed to read localforage:', err);
    return FALLBACK;
  }
}

// ── Notification click: focus app or open new window ─────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url ?? '/',
    self.location.origin,
  ).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) => c.url === targetUrl);
        if (existing) return existing.focus();
        return clients.openWindow(targetUrl);
      }),
  );
});
