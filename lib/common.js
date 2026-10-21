import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

export const BUCKET = 'media';
export const PAGE = 30;
export const MAX_FILE = 50 * 1024 * 1024;
export const AUTHORS = ['natalia', 'daniel'];
export const KINDS = ['text', 'link', 'image', 'video', 'audio'];

let client;
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno');
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export function checkPassword(given) {
  const expected = process.env.SCROLL_PASSWORD || '';
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
