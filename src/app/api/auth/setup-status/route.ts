import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import type { ApiResponse } from '@/types';

export async function GET(): Promise<NextResponse<ApiResponse<{ hasAdmin: boolean }>>> {
  try {
    await dbConnect();
    
    const adminUser = await User.findOne({ role: 'admin' }).select('_id').lean();
    
    return NextResponse.json(
      {
        success: true,
        data: {
          hasAdmin: !!adminUser,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Setup Status Error]:', error);
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
