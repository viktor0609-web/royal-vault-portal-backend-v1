import crypto from 'crypto';

const VIEW_AS_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes to use the link

const store = new Map(); // code -> { userId, expiresAt }

export function createViewAsCode(userId) {
  const code = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + VIEW_AS_CODE_TTL_MS;
  store.set(code, { userId: userId.toString(), expiresAt });
  return code;
}

export function consumeViewAsCode(code) {
  if (!code || typeof code !== 'string') return null;
  const entry = store.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(code);
    return null;
  }
  store.delete(code);
  return entry.userId;
}
