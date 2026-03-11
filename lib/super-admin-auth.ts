import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import crypto from 'crypto';

const SUPER_ADMIN_COOKIE_NAME = 'super_admin_session';
const SUPER_ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSuperAdminSecret(): string {
  return process.env.SUPER_ADMIN_SESSION_SECRET || process.env.ENCRYPTION_SECRET || 'default-super-admin-secret';
}

function signSessionPayload(payload: string): string {
  return crypto
    .createHmac('sha256', getSuperAdminSecret())
    .update(payload)
    .digest('hex');
}

function buildSessionToken(expiresAtSeconds: number): string {
  const payload = String(expiresAtSeconds);
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function appendSetCookie(res: NextApiResponse, serializedCookie: string) {
  const current = res.getHeader('Set-Cookie');

  if (!current) {
    res.setHeader('Set-Cookie', serializedCookie);
    return;
  }

  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, serializedCookie]);
    return;
  }

  res.setHeader('Set-Cookie', [String(current), serializedCookie]);
}

export function setSuperAdminSessionCookie(res: NextApiResponse) {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = nowInSeconds + SUPER_ADMIN_SESSION_TTL_SECONDS;
  const token = buildSessionToken(expiresAtSeconds);
  const isProduction = process.env.NODE_ENV === 'production';

  const serialized = cookie.serialize(SUPER_ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: SUPER_ADMIN_SESSION_TTL_SECONDS,
    path: '/',
  });

  appendSetCookie(res, serialized);
}

export function clearSuperAdminSessionCookie(res: NextApiResponse) {
  const isProduction = process.env.NODE_ENV === 'production';

  const serialized = cookie.serialize(SUPER_ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 0,
    path: '/',
  });

  appendSetCookie(res, serialized);
}

function isValidSuperAdminToken(token: string | undefined): boolean {
  if (!token) return false;

  const [expiresAtRaw, providedSignature] = token.split('.');
  if (!expiresAtRaw || !providedSignature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return false;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (expiresAt <= nowInSeconds) return false;

  const expectedSignature = signSessionPayload(expiresAtRaw);

  try {
    return crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export function isSuperAdminAuthenticatedFromCookieHeader(cookieHeader?: string): boolean {
  const parsed = cookie.parse(cookieHeader || '');
  const token = parsed[SUPER_ADMIN_COOKIE_NAME];
  return isValidSuperAdminToken(token);
}

export function isSuperAdminAuthenticated(req: NextApiRequest): boolean {
  return isSuperAdminAuthenticatedFromCookieHeader(req.headers.cookie);
}
