import { randomUUID } from 'node:crypto';
import { db, json, text, onlyPost, requirePassword, publicUrl, BUCKET, MAX_FILE } from '../lib/common.js';

const ALLOWED = /^(image\/.+|video\/(mp4|webm|quicktime|x-m4v)|audio\/.+)$/;

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  if (!requirePassword(req, res)) return;

  const { filename, type, size } = req.body || {};
  if (!ALLOWED.test(String(type || ''))) return text(res, 400, 'Tipo de archivo no permitido');
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE) return text(res, 400, 'El archivo pasa de 50 MB');

  const ext = String(filename || '').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${ext}`;

  try {
    const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    return json(res, 200, { signedUrl: data.signedUrl, token: data.token, path, publicUrl: publicUrl(path) });
  } catch (err) {
    console.error(err);
    return text(res, 500, err.message || 'No se ha podido preparar la subida');
  }
}
