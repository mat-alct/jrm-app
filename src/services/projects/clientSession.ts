import { createHmac, timingSafeEqual } from 'node:crypto';

import { serialize } from 'cookie';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'client_session';

export interface ClientSessionPayload {
  publicId: string;
  expiresAt: number;
}

export interface ClientSessionOptions {
  secret?: string;
  now?: Date;
}

export interface IssuedClientSession {
  token: string;
  expiresAt: Date;
}

function getSecret(secret?: string): string {
  const resolved = secret ?? process.env.CLIENT_ACCESS_SECRET;
  if (!resolved) {
    throw new Error('CLIENT_ACCESS_SECRET nao configurado');
  }
  return resolved;
}

function encodePayload(payload: ClientSessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encodedPayload: string): ClientSessionPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<ClientSessionPayload>;

    if (!parsed.publicId || typeof parsed.expiresAt !== 'number') return null;
    return {
      publicId: parsed.publicId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
}

function signaturesMatch(left: string, right: string): boolean {
  try {
    const leftBuffer = Buffer.from(left, 'base64url');
    const rightBuffer = Buffer.from(right, 'base64url');
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  } catch {
    return false;
  }
}

export function issueClientSession(
  publicId: string,
  options: ClientSessionOptions = {},
): IssuedClientSession {
  const now = options.now ?? new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const payload = encodePayload({
    publicId,
    expiresAt: expiresAt.getTime(),
  });
  const signature = sign(payload, getSecret(options.secret));

  return {
    token: `${payload}.${signature}`,
    expiresAt,
  };
}

export function verifyClientSession(
  token: string | undefined,
  options: ClientSessionOptions = {},
): ClientSessionPayload | null {
  if (!token) return null;

  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra) return null;

  const expectedSignature = sign(encodedPayload, getSecret(options.secret));
  if (!signaturesMatch(signature, expectedSignature)) return null;

  const payload = decodePayload(encodedPayload);
  if (!payload) return null;

  const now = options.now ?? new Date();
  if (payload.expiresAt <= now.getTime()) return null;

  return payload;
}

export function serializeClientSessionCookie(
  token: string,
  expiresAt: Date,
): string {
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export function serializeExpiredClientSessionCookie(): string {
  return serialize(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}
