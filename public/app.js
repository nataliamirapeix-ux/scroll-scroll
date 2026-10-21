/* scroll-scroll · frontend */
(() => {
  const PAGE = 30;
  const MAX_FILE = 50 * 1024 * 1024; // límite del plan gratuito de Supabase
  const AUTHORS = ['natalia', 'daniel', 'natalia&daniel'];
  // La frase que se repite en los márgenes. Cambiadla por la que queráis.
  const TAGLINE = 'la gente que no es espléndida con las ideas es porque tiene pocas';

  const $ = (id) => document.getElementById(id);
  for (const n of document.querySelectorAll('[data-tagline]')) n.textContent = TAGLINE;
  const feed = $('feed');
  const sentinel = $('sentinel');
  const composer = $('composer');
  const text = $('text');
  const fileInput = $('file');
  const send = $('send');
  const pendingBox = $('pending');
  const statusEl = $('status');
  const countEl = $('count');
  const passdialog = $('passdialog');
  const passform = $('passform');
  const passInput = $('pass');

  const store = {
    get who() { return localStorage.getItem('ss_who') || ''; },
    set who(v) { localStorage.setItem('ss_who', v); },
    get pass() { return localStorage.getItem('ss_pass') || ''; },
    set pass(v) { v ? localStorage.setItem('ss_pass', v) : localStorage.removeItem('ss_pass'); },
  };

  let pendingFile = null;
  let oldest = null;
  let exhausted = false;
  let loading = false;
  let total = 0;
  const demo = location.search.includes('demo') || location.protocol === 'file:';

  /* ---------- utilidades ---------- */
  const two = (n) => String(n).padStart(2, '0');
  function when(iso) {
    const d = new Date(iso);
    return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
  }
  const URL_RE = /https?:\/\/[^\s<>"']+/gi;
  function isSingleUrl(s) {
    const t = s.trim();
    const m = t.match(URL_RE);
    return m && m.length === 1 && m[0] === t;
  }
  function el(tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function linkify(s) {
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const m of s.matchAll(URL_RE)) {
      frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      const a = el('a', null, m[0].replace(/^https?:\/\/(www\.)?/, ''));
      a.href = m[0]; a.target = '_blank'; a.rel = 'noopener';
      frag.appendChild(a);
      last = m.index + m[0].length;
    }
    frag.appendChild(document.createTextNode(s.slice(last)));
    return frag;
  }
  function setStatus(msg, err) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('err', !!err);
  }

  /* ---------- embeds ---------- */
  function embedFor(url) {
    let u;
    try { u = new URL(url); } catch { return null; }
    const host = u.hostname.replace(/^www\.|^m\./, '');
    const path = u.pathname;
    let m;

    if (/\.(gif|png|jpe?g|webp|avif|svg)$/i.test(path)) return { kind: 'img', src: url };
    if (/\.(mp4|webm|mov|m4v)$/i.test(path)) return { kind: 'video', src: url };
    if (/\.(mp3|m4a|ogg|wav)$/i.test(path)) return { kind: 'audio', src: url };

    if (host === 'youtu.be') return yt(path.slice(1), false);
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if ((m = path.match(/^\/shorts\/([\w-]+)/))) return yt(m[1], true);
      if ((m = path.match(/^\/embed\/([\w-]+)/))) return yt(m[1], false);
      if (u.searchParams.get('v')) return yt(u.searchParams.get('v'), false);
    }
    if (host === 'vimeo.com' && (m = path.match(/^\/(\d+)/))) return { kind: 'frame', src: `https://player.vimeo.com/video/${m[1]}` };
    if (host === 'tiktok.com' && (m = path.match(/\/video\/(\d+)/))) return { kind: 'frame', src: `https://www.tiktok.com/embed/v2/${m[1]}`, shape: 'tall' };
    if (host === 'instagram.com' && (m = path.match(/^\/(p|reel|reels)\/([\w-]+)/))) return { kind: 'frame', src: `https://www.instagram.com/p/${m[2]}/embed`, shape: m[1] === 'p' ? 'square' : 'tall' };
    if (host === 'giphy.com' && (m = path.match(/\/gifs\/(?:.*-)?([a-zA-Z0-9]+)$/))) return { kind: 'img', src: `https://media.giphy.com/media/${m[1]}/giphy.gif` };
    if (host === 'open.spotify.com' && (m = path.match(/^\/(?:intl-\w+\/)?(track|album|playlist|episode|show)\/([\w]+)/))) return { kind: 'frame', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, shape: 'spotify', tall: m[1] !== 'track' };
    return null;
  }
  function yt(id, short) {
    return { kind: 'frame', src: `https://www.youtube-nocookie.com/embed/${id}`, shape: short ? 'tall' : '' };
  }

  /* ---------- render ---------- */
  function render(item, number) {
    const art = el('article', `item ${item.kind}`);
    art.dataset.id = item.id;

    // ficha: número de orden, quién, cuándo
    const meta = el('p', 'meta tiny');
    meta.appendChild(el('span', 'n', `${number})`));
    meta.appendChild(el('span', 'who', item.author));
    meta.appendChild(el('span', 'when', when(item.created_at)));
    const del = el('button', 'del', 'borrar');
    del.type = 'button';
    del.addEventListener('click', () => removeItem(item, art));
    meta.appendChild(del);
    art.appendChild(meta);

    if (item.kind === 'text') {
      const p = el('p', 'body');
      p.appendChild(linkify(item.body || ''));
      const len = (item.body || '').length;
      art.classList.add(len <= 90 ? 'short' : len <= 320 ? 'medium' : 'long');
      art.appendChild(p);
    } else if (item.kind === 'link') {
      const e = embedFor(item.url);
      art.appendChild(media(e, item.url));
      if (item.body) { const c = el('p', 'caption'); c.appendChild(linkify(item.body)); art.appendChild(c); }
    } else {
      const e = { kind: item.kind === 'image' ? 'img' : item.kind, src: item.url };
      art.appendChild(media(e, item.url));
      if (item.body) { const c = el('p', 'caption'); c.appendChild(linkify(item.body)); art.appendChild(c); }
    }
    return art;
  }
  function media(e, url) {
    if (!e) {
      const a = el('a', 'linkcard');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      let host = url; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}
      a.appendChild(el('span', 'host', host));
      a.appendChild(el('span', 'href', url.replace(/^https?:\/\/(www\.)?/, '')));
      return a;
    }
    // las imágenes verticales van en columna estrecha; las apaisadas ocupan la columna entera
    if (e.kind === 'img') {
      const i = el('img'); i.src = e.src; i.loading = 'lazy'; i.alt = '';
      i.addEventListener('load', () => { if (i.naturalWidth > i.naturalHeight * 1.15) i.classList.add('wide'); }, { once: true });
      return i;
    }
    if (e.kind === 'video') {
      const v = el('video'); v.src = e.src; v.controls = true; v.playsInline = true; v.preload = 'metadata';
      v.addEventListener('loadedmetadata', () => { if (v.videoWidth > v.videoHeight * 1.15) v.classList.add('wide'); }, { once: true });
      return v;
    }
    if (e.kind === 'audio') { const a = el('audio'); a.src = e.src; a.controls = true; a.preload = 'metadata'; return a; }
    const f = el('div', `frame ${e.shape || ''}`);
    if (e.shape === 'spotify' && e.tall) f.style.height = '352px';
    const i = el('iframe');
    i.src = e.src; i.loading = 'lazy'; i.allow = 'autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen';
    i.referrerPolicy = 'strict-origin-when-cross-origin';
    f.appendChild(i);
    return f;
  }
  function updateCount() {
    countEl.textContent = total ? `${total} ${total === 1 ? 'cosa' : 'cosas'}` : '';
  }

  /* ---------- feed ---------- */
  async function loadMore() {
    if (loading || exhausted) return;
    loading = true;
    try {
      let rows, count;
      if (demo) {
        rows = oldest ? [] : DEMO; count = DEMO.length;
      } else {
        const q = oldest ? `?before=${encodeURIComponent(oldest)}` : '';
        const r = await fetch(`/api/feed${q}`);
        if (!r.ok) throw new Error(await r.text());
        ({ rows, count } = await r.json());
      }
      if (count != null) { total = count; updateCount(); }
      if (!rows.length) {
        exhausted = true;
        if (!feed.children.length) feed.appendChild(el('p', 'empty', 'todavía no hay nada'));
        return;
      }
      // numeración desde el más antiguo (1) hasta el más nuevo (total)
      let n = total - feed.querySelectorAll('.item').length;
      for (const row of rows) feed.appendChild(render(row, n--));
      oldest = rows[rows.length - 1].created_at;
      if (rows.length < PAGE) exhausted = true;
    } catch (err) {
      console.error(err);
      if (!feed.children.length) feed.appendChild(el('p', 'empty', 'no se ha podido cargar. recarga en un rato.'));
      exhausted = true;
    } finally {
      loading = false;
    }
  }
  new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) loadMore(); }, { rootMargin: '800px' }).observe(sentinel);

  /* ---------- contraseña ---------- */
  function askPassword() {
    return new Promise((resolve) => {
      passInput.value = '';
      passdialog.returnValue = '';
      const done = () => { passdialog.removeEventListener('close', done); resolve(passdialog.returnValue === 'ok' ? passInput.value : null); };
      passdialog.addEventListener('close', done);
      passdialog.showModal();
      setTimeout(() => passInput.focus(), 50);
    });
  }
  passform.addEventListener('submit', (e) => { e.preventDefault(); passdialog.close(passInput.value ? 'ok' : ''); });
  $('passcancel').addEventListener('click', () => passdialog.close(''));
  async function withPassword(fn) {
    let pass = store.pass;
    if (!pass) { pass = await askPassword(); if (!pass) return null; }
    try {
      return await fn(pass).then((r) => { store.pass = pass; return r; });
    } catch (err) {
      if (err.status === 401) {
        store.pass = '';
        setStatus('contraseña incorrecta', true);
        return withPassword(fn);
      }
      throw err;
    }
  }
  async function api(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const e = new Error((await r.text()) || r.statusText); e.status = r.status; throw e; }
    return r.json();
  }

  /* ---------- composer ---------- */
  function who() { return composer.querySelector('input[name=who]:checked')?.value || ''; }
  for (const r of composer.querySelectorAll('input[name=who]')) {
    if (r.value === store.who) r.checked = true;
    r.addEventListener('change', () => { store.who = r.value; refresh(); });
  }
  function refresh() {
    send.disabled = !(text.value.trim() || pendingFile);
    text.style.height = 'auto';
    text.style.height = Math.min(text.scrollHeight, window.innerHeight * 0.4) + 'px';
  }
  text.addEventListener('input', refresh);
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!send.disabled) composer.requestSubmit(); }
  });
  text.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])][0];
    if (f) { e.preventDefault(); setFile(f); }
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) setFile(fileInput.files[0]); fileInput.value = ''; });

  let dragDepth = 0;
  document.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) { dragDepth++; document.body.classList.add('dragging'); } });
  document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault(); dragDepth = 0; document.body.classList.remove('dragging');
    const f = e.dataTransfer?.files?.[0];
    if (f) { setFile(f); text.focus(); }
  });

  function setFile(f) {
    if (f.size > MAX_FILE) { setStatus('el archivo pasa de 50 MB. para vídeos largos, mejor un enlace.', true); return; }
    const kind = fileKind(f.type);
    if (!kind) { setStatus('ese tipo de archivo no entra: imágenes, gifs, vídeo mp4/webm/mov o audio.', true); return; }
    pendingFile = f;
    pendingBox.hidden = false;
    pendingBox.replaceChildren();
    const url = URL.createObjectURL(f);
    if (kind === 'image') { const i = el('img'); i.src = url; i.alt = ''; pendingBox.appendChild(i); }
    else if (kind === 'video') { const v = el('video'); v.src = url; v.muted = true; pendingBox.appendChild(v); }
    pendingBox.appendChild(el('span', null, `${f.name} · ${(f.size / 1024 / 1024).toFixed(1)} MB`));
    const x = el('button', null, 'quitar'); x.type = 'button';
    x.addEventListener('click', clearFile);
    pendingBox.appendChild(x);
    setStatus('');
    refresh();
  }
  function clearFile() { pendingFile = null; pendingBox.hidden = true; pendingBox.replaceChildren(); refresh(); }
  function fileKind(mime) {
    if (/^image\//.test(mime)) return 'image';
    if (/^video\/(mp4|webm|quicktime|x-m4v)$/.test(mime)) return 'video';
    if (/^audio\//.test(mime)) return 'audio';
    return null;
  }

  composer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const author = who();
    if (!author) { setStatus('elige quién sube: natalia, daniel o los dos', true); return; }
    const body = text.value.trim();
    if (!body && !pendingFile) return;
    if (demo) { setStatus('esto es la demo, no se sube nada', true); return; }

    send.disabled = true;
    setStatus(pendingFile ? 'subiendo archivo…' : 'subiendo…');
    try {
      const row = await withPassword(async (password) => {
        let payload;
        if (pendingFile) {
          const f = pendingFile;
          const { signedUrl, publicUrl, path } = await api('/api/upload-url', { password, filename: f.name, type: f.type, size: f.size });
          const up = await fetch(signedUrl, { method: 'PUT', headers: { 'content-type': f.type || 'application/octet-stream', 'x-upsert': 'false' }, body: f });
          if (!up.ok) throw new Error('no se ha podido subir el archivo (' + up.status + ')');
          payload = { password, author, kind: fileKind(f.type), body: body || null, url: publicUrl, meta: { path, name: f.name, size: f.size, type: f.type } };
        } else if (isSingleUrl(body)) {
          payload = { password, author, kind: 'link', body: null, url: body, meta: {} };
        } else {
          payload = { password, author, kind: 'text', body, url: null, meta: {} };
        }
        return api('/api/post', payload);
      });
      if (!row) { setStatus(''); refresh(); return; }
      const empty = feed.querySelector('.empty'); if (empty) empty.remove();
      total++; updateCount();
      feed.prepend(render(row, total));
      text.value = ''; clearFile(); setStatus('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'algo ha fallado', true);
    } finally {
      refresh();
    }
  });

  async function removeItem(item, node) {
    if (!confirm('¿borrar esto?')) return;
    try {
      const ok = await withPassword((password) => api('/api/delete', { password, id: item.id }));
      if (!ok) return;
      node.remove(); total--; updateCount();
    } catch (err) {
      setStatus(err.message || 'no se ha podido borrar', true);
    }
  }

  /* ---------- demo ---------- */
  const DEMO_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9b6ae"/><stop offset="1" stop-color="#6e6a63"/></linearGradient></defs><rect width="600" height="800" fill="url(#g)"/><rect x="150" y="220" width="300" height="360" fill="#e8e6e1" opacity=".85"/></svg>');
  const DEMO = [
    { id: 'd0', kind: 'text', author: 'daniel', created_at: '2026-10-21T18:10:00Z', body: 'ruido con forma' },
    { id: 'd1', kind: 'text', author: 'natalia', created_at: '2026-10-21T17:04:00Z', body: 'lo que no se escribe no existe, pero lo que se escribe tampoco' },
    { id: 'd1b', kind: 'image', author: 'natalia', created_at: '2026-10-21T16:00:00Z', url: DEMO_IMG, body: 'foto de ejemplo, vertical' },
    { id: 'd2', kind: 'link', author: 'daniel', created_at: '2026-10-21T12:30:00Z', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id: 'd3', kind: 'text', author: 'daniel', created_at: '2026-10-20T22:15:00Z', body: 'el scroll es un paisaje que se mueve para que tú no tengas que moverte' },
    { id: 'd4', kind: 'link', author: 'natalia', created_at: '2026-10-20T09:31:00Z', url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT' },
    { id: 'd5', kind: 'text', author: 'natalia', created_at: '2026-10-19T19:00:00Z', body: 'Apuntar aquí todo lo que no cabe en ningún sitio. Un cajón de sastre entre dos personas donde las cosas se acumulan sin orden y sin explicación, y donde el único criterio es que a uno de los dos le ha parecido que merecía quedarse. Esto es un ejemplo de texto largo para ver cómo se comporta la tipografía cuando hay más de un párrafo.\n\nSegundo párrafo, para probar.' },
    { id: 'd6', kind: 'link', author: 'daniel', created_at: '2026-10-18T16:42:00Z', url: 'https://www.are.na/natalia/scroll-scroll' },
  ];

  // pie: el subrayado de marcador se dispara cuando el pie entra en pantalla
  const colophon = document.querySelector('.colophon');
  if (colophon) new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) { colophon.classList.add('lit'); obs.disconnect(); }
  }, { threshold: 0.4 }).observe(colophon);

  refresh();
  loadMore();
})();
