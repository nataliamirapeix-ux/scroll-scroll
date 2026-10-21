import { db, json, text, onlyPost, requirePassword, AUTHORS, KINDS } from '../lib/common.js';

const MAX_BODY = 20000;

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  if (!requirePassword(req, res)) return;

  const { author, kind, body, url, meta } = req.body || {};
  if (!AUTHORS.includes(author)) return text(res, 400, 'Autor no válido');
  if (!KINDS.includes(kind)) return text(res, 400, 'Tipo no válido');

  const cleanBody = typeof body === 'string' ? body.trim().slice(0, MAX_BODY) : null;
  const cleanUrl = typeof url === 'string' ? url.trim() : null;

  if (kind === 'text' && !cleanBody) return text(res, 400, 'Falta el texto');
  if (kind !== 'text') {
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) return text(res, 400, 'Falta la URL');
    if (cleanUrl.length > 2048) return text(res, 400, 'URL demasiado larga');
  }

  try {
    const { data, error } = await db()
      .from('posts')
      .insert({
        author,
        kind,
        body: cleanBody || null,
        url: kind === 'text' ? null : cleanUrl,
        meta: meta && typeof meta === 'object' ? meta : {},
      })
      .select('id, created_at, author, kind, body, url, meta')
      .single();
    if (error) throw error;
    return json(res, 200, data);
  } catch (err) {
    console.error(err);
    return text(res, 500, err.message || 'No se ha podido guardar');
  }
}
