import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from '@/types';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'Please define the JWT_SECRET environment variable inside .env.local'
  );
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET!);
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    algorithms: ['HS256'],
  });

  return payload as unknown as JWTPayload;
}

export const COOKIE_NAME = 'leadflow-token';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

export function getCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/',
  };
}

export async function getSession(request: Request) {
  let userId = request.headers.get('x-user-id');
  let role = request.headers.get('x-user-role');
  let email = request.headers.get('x-user-email');

  if (!userId) {
    try {
      const c = await cookies();
      const token = c.get(COOKIE_NAME)?.value;
      if (token) {
        const payload = await verifyToken(token);
        userId = payload.userId;
        role = payload.role;
        email = payload.email;
      }
    } catch (e) {}
  }

  return { userId, role, email };
}
