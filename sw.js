/* Kept on the device so the site opens with no connection (registered by every page's opening shell, tools/lock.mjs;
   copied beside the pages by tools/publish.mjs). This file is public and plaintext, like the shell: it names nothing.

   The pages are asked of the network first, so a newer build is always what is shown when there is a connection, and
   each one that arrives is kept. With no connection, or one too slow to answer in a few seconds, the copy kept is
   shown instead. When a page is opened with a connection the other pages are checked too (a conditional request, so
   an unchanged page costs almost nothing), which is what lets all of them open later at a table with no wifi after
   only one has been visited. What a page keeps in the browser (saved battles, lists, players) is not touched here. */
const KEPT = "kept-v1";
const WAIT_MS = 6000;
const PAGES = ["", "battlefleet-gothic.html", "age-of-sigmar.html"];
const EXTRAS = ["manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const BASE = new URL("./", self.location.href);
/* One name for a file whatever was asked: "index.html" and the folder are the same page, and "?v=3" is no other file. */
const nameOf = url => { const u = new URL(url, BASE); return u.origin === BASE.origin && u.pathname.startsWith(BASE.pathname) ? u.pathname.slice(BASE.pathname.length).replace(/^index\.html$/, "") : null; };
const known = name => name !== null && (PAGES.includes(name) || EXTRAS.includes(name));
const keyOf = name => new URL(name, BASE).href;

async function keep(name, response){
  if(!response || !response.ok) return response;
  const cache = await caches.open(KEPT);
  await cache.put(keyOf(name), response.clone());
  return response;
}
const bring = name => fetch(new Request(keyOf(name), {cache: "no-cache"})).then(r => keep(name, r));
let checked = 0;
function checkOthers(but){
  if(Date.now() - checked < 10 * 60 * 1000) return Promise.resolve();
  checked = Date.now();
  return Promise.all([...PAGES, ...EXTRAS].filter(n => n !== but).map(n => bring(n).catch(() => null)));
}
async function answer(event, name){
  const cache = await caches.open(KEPT), held = await cache.match(keyOf(name));
  const fresh = fetch(event.request).then(r => keep(name, r));
  if(!held) return fresh;
  /* A connection that never answers is no connection: after a few seconds the copy kept is shown. */
  const slow = new Promise(resolve => setTimeout(() => resolve(null), WAIT_MS));
  const got = await Promise.race([fresh.catch(() => null), slow]);
  if(got && got.ok){ if(PAGES.includes(name)) event.waitUntil(checkOthers(name)); return got; }
  event.waitUntil(fresh.catch(() => null));
  return held;
}

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(Promise.all([...PAGES, ...EXTRAS].map(n => bring(n).catch(() => null))));
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(keys => Promise.all(keys.filter(k => k !== KEPT).map(k => caches.delete(k))))]));
});
self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  const name = nameOf(event.request.url);
  if(!known(name)) return;
  event.respondWith(answer(event, name));
});
