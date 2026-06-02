import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import type { ApiResponse } from '@/types';

export async function GET(request: Request): Promise<NextResponse<ApiResponse<{ available: boolean }>>> {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email parameter is required',
        },
        { status: 400 }
      );
    }

    await dbConnect();
    const existingUser = await User.findOne({ email }).lean();

    return NextResponse.json(
      {
        success: true,
        data: { available: !existingUser },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Check Email Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
