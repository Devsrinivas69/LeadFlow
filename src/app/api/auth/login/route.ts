import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken, COOKIE_NAME, getCookieOptions } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/user';
import { rateLimit } from '@/lib/rate-limit';
import type { ApiResponse, LoginResponse } from '@/types';

export async function POST(request: Request): Promise<NextResponse<ApiResponse<LoginResponse>>> {
  try {
    // Extract IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `login:${ip}`;

    // Rate limit check
    const limit = rateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5,
    });

    if (!limit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMITED',
          message: `Too many login attempts. Try again after ${limit.resetAt.toLocaleTimeString()}.`,
        },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid input',
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Connect to DB and find user
    await dbConnect();
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Contact an administrator.',
        },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Sign JWT
    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Build safe user response (no password)
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobileNumber: user.mobileNumber,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Set cookie and respond
    const response = NextResponse.json(
      {
        success: true,
        data: { user: safeUser },
        message: 'Login successful',
      },
      { status: 200 }
    );

    response.cookies.set(COOKIE_NAME, token, getCookieOptions());

    return response;
  } catch (error) {
    console.error('[Login Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
