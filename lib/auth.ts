import crypto from 'crypto';
import { NextApiRequest } from 'next';

const TOKEN_NAME = 'saas_dashboard_token';
const SECRET = process.env.NEXTAUTH_SECRET || 'development-secret';
const ALGORITHM = 'sha256';
const MAX_AGE = 30 * 24 * 60 * 60;

export type AuthPayload = {
  email: string;
  name: string;
  role: string;
  exp: number;
};

const sign = (value: string) => {
  return crypto.createHmac(ALGORITHM, SECRET).update(value).digest('hex');
};

export function createToken(payload: Omit<AuthPayload, 'exp'>) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const data = JSON.stringify({ ...payload, exp });
  const signature = sign(data);
  return Buffer.from(`${data}|${signature}`).toString('base64url');
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const lastPipe = decoded.lastIndexOf('|');
    if (lastPipe === -1) return null;
    const data = decoded.substring(0, lastPipe);
    const signature = decoded.substring(lastPipe + 1);
    if (!data || !signature) return null;
    if (sign(data) !== signature) return null;
    const payload = JSON.parse(data) as AuthPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCookieToken(req: NextApiRequest) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.split(';').map((v) => v.trim()).find((v) => v.startsWith(`${TOKEN_NAME}=`));
  return match?.split('=')[1] ?? null;
}

export function createAuthHeaderValue(token: string) {
  return `${TOKEN_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearAuthCookie() {
  return `${TOKEN_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}