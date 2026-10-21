// Visita una URL y saca título, imagen y nombre del medio (Open Graph o <title>).
// Devuelve siempre un objeto; si algo falla, viene vacío pero con unfurled: true para no reintentar sin fin.
const MAX_BYTES = 400 * 1024;
const TIMEOUT = 5000;

function pick(html, re) {
  const m = html.match(re);
  return m ? decode(m[1]).trim() : '';
}
function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function meta(html, prop) {
  // <meta property="og:title" content="..."> en cualquier orden de atributos
  const a = pick(html, new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*?content=["']([^"']*)["']`, 'i'));
  if (a) return a;
  return pick(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${prop}["']`, 'i'));
}
function blocked(u) {
  const h = u.hostname;
  return !/^https?:$/.test(u.protocol) || h === 'localhost' || /^(127|10|0)\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^\[/.test(h);
}

export async function unfurl(url) {
  const out = { unfurled: true };
  let u;
  try { u = new URL(url); } catch { return out; }
  if (blocked(u)) return out;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(u, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; scroll-scroll/1.0; +https://scroll-scroll.com)', accept: 'text/html,*/*;q=0.8', 'accept-language': 'es,en;q=0.8' },
    });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !/html|xml/.test(type)) return out;
    const reader = r.body.getReader();
    const chunks = []; let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); size += value.length;
    }
    reader.cancel().catch(() => {});
    const html = Buffer.concat(chunks).toString('utf8');
    const title = meta(html, 'og:title') || meta(html, 'twitter:title') || pick(html, /<title[^>]*>([^<]*)<\/title>/i);
    const image = meta(html, 'og:image') || meta(html, 'og:image:url') || meta(html, 'twitter:image');
    const site = meta(html, 'og:site_name');
    const description = meta(html, 'og:description') || meta(html, 'description');
    if (title) out.title = title.slice(0, 300);
    if (image) { try { out.image = new URL(image, r.url || url).href; } catch {} }
    if (site) out.site = site.slice(0, 100);
    if (description) out.description = description.slice(0, 500);
  } catch {
    // sin datos: se muestra el enlace a pelo
  } finally {
    clearTimeout(timer);
  }
  return out;
}
