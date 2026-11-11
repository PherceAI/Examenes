import {createHmac, randomBytes, scryptSync, timingSafeEqual} from 'crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {readDb} from './db';
import type {Employee} from './types';

// Sesión firmada (HMAC) en una cookie HttpOnly. "e" = empleado (id), "m" = Gerencia.

const COOKIE = 'eval_session';
const EMPLOYEE_MAX_AGE = 60 * 60 * 24 * 60; // 60 días en el teléfono del empleado
const MANAGER_MAX_AGE = 60 * 60 * 12; // 12 horas en Gerencia

let fallbackSecret: string | null = null;
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.MANAGER_PASSWORD) {
    return createHmac('sha256', process.env.MANAGER_PASSWORD).update('evaluaciones-v1').digest('hex');
  }
  fallbackSecret ??= randomBytes(32).toString('hex');
  return fallbackSecret;
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

interface Payload {
  t: 'e' | 'm';
  id?: string;
  iat: number;
}

function sign(body: string) {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

function parse(token: string | undefined): Payload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Payload;
    const maxAge = p.t === 'm' ? MANAGER_MAX_AGE : EMPLOYEE_MAX_AGE;
    if (Date.now() / 1000 - p.iat > maxAge) return null;
    return p;
  } catch {
    return null;
  }
}

export async function startSession(p: Omit<Payload, 'iat'>) {
  const body = Buffer.from(JSON.stringify({...p, iat: Math.floor(Date.now() / 1000)})).toString(
    'base64url'
  );
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: p.t === 'm' ? MANAGER_MAX_AGE : EMPLOYEE_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

async function payload() {
  return parse((await cookies()).get(COOKIE)?.value);
}

export async function isManager(): Promise<boolean> {
  return (await payload())?.t === 'm';
}

export async function requireManager() {
  if (!(await isManager())) redirect('/gerencia/ingreso');
}

export async function currentEmployee(): Promise<Employee | null> {
  const p = await payload();
  if (p?.t !== 'e' || !p.id) return null;
  const db = await readDb();
  const emp = db.empleados.find((e) => e.id === p.id);
  return emp && emp.activo ? emp : null;
}

export async function requireEmployee(): Promise<Employee> {
  const emp = await currentEmployee();
  if (!emp) redirect('/');
  return emp;
}

// PIN de 4 dígitos con scrypt y sal propia
export function hashPin(pin: string): string {
  const salt = randomBytes(12).toString('hex');
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}

export function checkPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return safeEqual(scryptSync(pin, salt, 32).toString('hex'), hash);
}

export function checkManagerPassword(given: string): boolean {
  const expected = process.env.MANAGER_PASSWORD || '';
  return expected !== '' && safeEqual(given, expected);
}

// Límite simple de intentos fallidos por clave (en memoria)
const failed = new Map<string, {n: number; at: number}>();
const WINDOW = 15 * 60 * 1000;

export function rateLimited(key: string): boolean {
  const f = failed.get(key);
  if (!f) return false;
  if (Date.now() - f.at > WINDOW) {
    failed.delete(key);
    return false;
  }
  return f.n >= 6;
}

export function registerFailure(key: string) {
  const f = failed.get(key);
  if (!f || Date.now() - f.at > WINDOW) failed.set(key, {n: 1, at: Date.now()});
  else f.n += 1;
}

export function clearFailures(key: string) {
  failed.delete(key);
}
