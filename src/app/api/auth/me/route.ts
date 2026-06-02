import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import type { ApiResponse, SafeUser } from '@/types';

export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<SafeUser>>> {
  try {
    let userId = request.headers.get('x-user-id');

    if (!userId) {
      // Fallback: Read token directly if middleware failed to pass headers
      const cookieStore = await cookies();
      const token = cookieStore.get('leadflow-token')?.value;
      if (token) {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET);
          const { payload } = await jwtVerify(token, secret);
          userId = payload.userId as string;
        } catch (e) {
          // Token verification failed
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await dbConnect();
    const user = await User.findById(userId).select('-password').lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: user as unknown as SafeUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth Me Error]:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
