import { db, json, text, fail, PAGE } from '../lib/common.js';
import { unfurl } from '../lib/unfurl.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return text(res, 405, 'Solo GET');
  try {
    const before = typeof req.query.before === 'string' && !Number.isNaN(Date.parse(req.query.before)) ? req.query.before : null;

    let q = db()
      .from('posts')
      .select('id, created_at, author, kind, body, url, meta', { count: before ? null : 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE);
    if (before) q = q.lt('created_at', before);

    const { data, error, count } = await q;
    if (error) throw error;

    // Enlaces antiguos sin título: se completan ahora (como mucho tres por carga) y se guardan
    const pending = data.filter((r) => r.kind === 'link' && r.url && !(r.meta && r.meta.unfurled)).slice(0, 3);
    await Promise.all(pending.map(async (r) => {
      const extra = await unfurl(r.url);
      r.meta = { ...(r.meta || {}), ...extra };
      await db().from('posts').update({ meta: r.meta }).eq('id', r.id);
    }));

    res.setHeader('cache-control', 'no-store');
    return json(res, 200, { rows: data, count });
  } catch (err) {
    return fail(res, err, 'Error leyendo el feed');
  }
}
