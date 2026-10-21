import { db, json, text, fail } from '../lib/common.js';

// Lo llama la tarea programada de Vercel una vez al día.
// Supabase pausa los proyectos gratuitos tras una semana sin actividad; esta consulta mínima lo evita.
export default async function handler(req, res) {
  try {
    const { count, error } = await db().from('posts').select('id', { count: 'exact', head: true });
    if (error) throw error;
    res.setHeader('cache-control', 'no-store');
    return json(res, 200, { ok: true, count, at: new Date().toISOString() });
  } catch (err) {
    return fail(res, err, 'ping fallido');
  }
}
