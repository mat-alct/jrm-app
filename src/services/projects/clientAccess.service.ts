import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { addMonths, isAfter } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

import { Project } from '@/types/projects';

const ACCESS_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PUBLIC_ID_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ACCESS_CODE_LENGTH = 6;
const PUBLIC_ID_LENGTH = 12;
const SCRYPT_KEY_LENGTH = 32;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

export interface ClientCredentials {
  publicId: string;
  accessCode: string;
}

export interface ClientAccessAttemptUpdate {
  clientAccessAttempts: number;
  clientAccessLockUntil?: Timestamp | null;
}

function randomString(length: number, alphabet: string): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
}

function toDate(value?: Timestamp | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

export function generateClientCredentials(): ClientCredentials {
  return {
    publicId: randomString(PUBLIC_ID_LENGTH, PUBLIC_ID_ALPHABET),
    accessCode: randomString(ACCESS_CODE_LENGTH, ACCESS_CODE_ALPHABET),
  };
}

export function hashAccessCode(code: string): string {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(code, salt, SCRYPT_KEY_LENGTH).toString('base64url');
  return `scrypt:${salt}:${hash}`;
}

export function verifyAccessCode(code: string, encodedHash: string): boolean {
  const [algorithm, salt, storedHash] = encodedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !storedHash) return false;

  try {
    const stored = Buffer.from(storedHash, 'base64url');
    const candidate = scryptSync(code, salt, stored.length);
    return stored.length === candidate.length && timingSafeEqual(stored, candidate);
  } catch {
    return false;
  }
}

export function isLinkExpired(
  project: Pick<Project, 'completedAt' | 'clientLinkExpiresAt'>,
  now: Date = new Date(),
): boolean {
  const explicitExpiration = toDate(project.clientLinkExpiresAt);
  if (explicitExpiration) {
    return isAfter(now, explicitExpiration);
  }

  const completedAt = toDate(project.completedAt);
  if (!completedAt) return false;

  return isAfter(now, addMonths(completedAt, 1));
}

export function isClientAccessLocked(
  project: Pick<Project, 'clientAccessLockUntil'>,
  now: Date = new Date(),
): boolean {
  const lockUntil = toDate(project.clientAccessLockUntil);
  return Boolean(lockUntil && isAfter(lockUntil, now));
}

export function registerFailedClientAccessAttempt(
  project: Pick<Project, 'clientAccessAttempts' | 'clientAccessLockUntil'>,
  now: Date = new Date(),
): ClientAccessAttemptUpdate {
  const lockUntil = toDate(project.clientAccessLockUntil);
  const lockExpired = Boolean(lockUntil && !isAfter(lockUntil, now));
  const currentAttempts = lockExpired ? 0 : project.clientAccessAttempts ?? 0;
  const nextAttempts = currentAttempts + 1;

  if (nextAttempts >= LOCKOUT_THRESHOLD) {
    return {
      clientAccessAttempts: nextAttempts,
      clientAccessLockUntil: Timestamp.fromDate(
        new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000),
      ),
    };
  }

  return {
    clientAccessAttempts: nextAttempts,
    clientAccessLockUntil: null,
  };
}

export function resetClientAccessAttempts(): ClientAccessAttemptUpdate {
  return {
    clientAccessAttempts: 0,
    clientAccessLockUntil: null,
  };
}
