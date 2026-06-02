import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'leadflow-token';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return new TextEncoder().encode(secret);
}

// Routes that require admin role
const ADMIN_ONLY_PATHS = [
  '/dashboard/agents',
  '/dashboard/upload',
  '/api/agents',
  '/api/upload',
];

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('[DEBUG MIDDLEWARE] Running for:', pathname);

  // Skip auth routes (login)
  if (pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  // Check if route needs protection
  const isProtectedPage = pathname.startsWith('/dashboard');
  const isProtectedApi = pathname.startsWith('/api/') && pathname !== '/api/auth/login';

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  // Extract token from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    });

    const userId = payload.userId as string;
    const role = payload.role as string;
    const email = payload.email as string;

    // Role-based access control
    if (isAdminOnlyPath(pathname) && role !== 'admin') {
      if (isProtectedApi) {
        return NextResponse.json(
          { success: false, error: 'FORBIDDEN', message: 'Admin access required' },
          { status: 403 }
        );
      }
      // Redirect agents to their allowed page
      const dashboardUrl = new URL('/dashboard/lists', request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Inject user context into request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-user-email', email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // Token expired or invalid
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, error: 'TOKEN_EXPIRED', message: 'Session expired' },
        { status: 401 }
      );
    }

    // Clear invalid cookie and redirect
    const loginUrl = new URL('/login?expired=true', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
