import { db, json, text, onlyPost, requirePassword, BUCKET } from '../lib/common.js';

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  if (!requirePassword(req, res)) return;

  const { id } = req.body || {};
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return text(res, 400, 'Id no válido');

  try {
    const { data: row, error: readErr } = await db().from('posts').select('id, meta').eq('id', id).maybeSingle();
    if (readErr) throw readErr;
    if (!row) return json(res, 200, { ok: true });

    const path = row.meta && typeof row.meta.path === 'string' ? row.meta.path : null;
    if (path) {
      const { error: rmErr } = await db().storage.from(BUCKET).remove([path]);
      if (rmErr) console.error('No se ha podido borrar el archivo', path, rmErr);
    }
    const { error } = await db().from('posts').delete().eq('id', id);
    if (error) throw error;
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return text(res, 500, err.message || 'No se ha podido borrar');
  }
}
