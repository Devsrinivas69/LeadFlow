import { NextResponse } from 'next/server';
// @ts-ignore - Ignore the IDE warning about mongoose types
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { updateAgentSchema } from '@/lib/validations/user';
import { getSession } from '@/lib/auth';
import type { ApiResponse, SafeUser } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/agents/[id] — Get single agent
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<SafeUser>>> {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ID', message: 'Invalid agent ID' },
        { status: 400 }
      );
    }

    await dbConnect();
    const agent = await User.findById(id).select('-password').lean();

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: agent as unknown as SafeUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Get Agent Error]:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id] — Update agent
export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<SafeUser>>> {
  try {
    const { role } = await getSession(request);
    
    if (role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ID', message: 'Invalid agent ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updateAgentSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: fieldErrors.join('; '),
        },
        { status: 400 }
      );
    }

    const updateData = parsed.data;

    await dbConnect();

    // Check duplicate email if email is being updated
    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: id },
      }).lean();

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: 'DUPLICATE_EMAIL',
            message: 'An account with this email already exists',
          },
          { status: 409 }
        );
      }
    }

    const agent = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select('-password')
      .lean();

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: agent as unknown as SafeUser,
        message: updateData.isActive === false
          ? 'Agent deactivated successfully'
          : 'Agent updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Update Agent Error]:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
