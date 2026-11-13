/**
 * Post-processes the Expo web export (dist/) into an installable PWA:
 *  - manifest + iOS "Add to Home Screen" meta tags
 *  - small service worker so the app shell loads offline
 *  - 404.html (SPA fallback for GitHub Pages) and .nojekyll
 * Usage: EXPO_BASE_URL=/awaken node scripts/pwa.js
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const base = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
const indexPath = path.join(dist, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found — run `npx expo export -p web` first');
  process.exit(1);
}

const manifest = {
  name: 'AWAKEN — Level up your life',
  short_name: 'AWAKEN',
  description: 'A self-improvement RPG: daily quests, 66-day habits, workouts, focus dungeons and weekly bosses.',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'any',
  background_color: '#02040A',
  theme_color: '#02040A',
  icons: [
    { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
    { src: `${base}/icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

const version = Date.now().toString(36);
const sw = `// AWAKEN service worker (${version})
const CACHE = 'awaken-${version}';
const SHELL = ['${base}/', '${base}/index.html', '${base}/manifest.json', '${base}/icons/icon-192.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never cache API calls
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('${base}/index.html', copy)); return r; })
      .catch(() => caches.match('${base}/index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && (url.pathname.includes('/_expo/') || url.pathname.includes('/assets/') || url.pathname.includes('/icons/'))) {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return r;
  })));
});
`;
fs.writeFileSync(path.join(dist, 'sw.js'), sw);

let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
);
html = html.replace('<meta httpEquiv="X-UA-Compatible" content="IE=edge" />', '<meta http-equiv="X-UA-Compatible" content="IE=edge" />');
html = html.replace(/<title>[^<]*<\/title>/, '<title>AWAKEN — The System</title>');
const head = `
    <meta name="description" content="${manifest.description}" />
    <link rel="manifest" href="${base}/manifest.json" />
    <link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="AWAKEN" />
    <style>html,body{background:#02040A;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}</style>
    <script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('${base}/sw.js').catch(function(){})})}</script>
  </head>`;
html = html.replace('</head>', head);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(dist, '404.html'), html);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log(`PWA ready (base "${base || '/'}")`);
