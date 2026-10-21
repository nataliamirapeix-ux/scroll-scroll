import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

export const BUCKET = 'media';
export const PAGE = 30;
export const MAX_FILE = 50 * 1024 * 1024;
export const AUTHORS = ['natalia', 'daniel', 'natalia&daniel'];
export const KINDS = ['text', 'link', 'image', 'video', 'audio'];

let client;
export function db() {
  if (!client) {
    // Se quitan espacios y saltos de línea por si la clave se pegó partida en Vercel
    const url = (process.env.SUPABASE_URL || '').replace(/\s+/g, '');
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\s+/g, '');
    if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno');
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// Error al cliente sin detalles: el detalle va al log de Vercel, nunca a la respuesta
export function fail(res, err, msg) {
  console.error(msg, err);
  return text(res, 500, msg);
}

export function checkPassword(given) {
  const expected = (process.env.SCROLL_PASSWORD || '').trim();
  if (!expected) return false;
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}
export function text(res, status, msg) {
  res.status(status).setHeader('content-type', 'text/plain; charset=utf-8');
  res.send(msg);
}

export function onlyPost(req, res) {
  if (req.method !== 'POST') { text(res, 405, 'Solo POST'); return false; }
  return true;
}

export function requirePassword(req, res) {
  if (!checkPassword(req.body?.password)) { text(res, 401, 'Contraseña incorrecta'); return false; }
  return true;
}

export function publicUrl(path) {
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
