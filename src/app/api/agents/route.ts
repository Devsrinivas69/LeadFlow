import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { createAgentSchema } from '@/lib/validations/user';
import { getSession } from '@/lib/auth';
import type { ApiResponse, SafeUser } from '@/types';

// Disable static caching — always query MongoDB live
export const dynamic = 'force-dynamic';

// GET /api/agents — List agents
export async function GET(request: Request): Promise<NextResponse<ApiResponse<SafeUser[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const { userId, role } = await getSession(request);

    await dbConnect();

    const filter: Record<string, unknown> = { role: 'agent' };
    
    if (role === 'admin' && userId) {
      // Cast userId string to ObjectId so Mongoose matches correctly
      filter.createdBy = new mongoose.Types.ObjectId(userId);
    }

    if (activeOnly) {
      filter.isActive = true;
    }

    const agents = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: agents as unknown as SafeUser[],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Get Agents Error]:', error);
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

// POST /api/agents — Create agent
export async function POST(request: Request): Promise<NextResponse<ApiResponse<SafeUser>>> {
  try {
    const { role, userId } = await getSession(request);

    if (role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createAgentSchema.safeParse(body);

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

    const { name, email, password, mobileNumber } = parsed.data;

    await dbConnect();

    // Check duplicate email
    const existingUser = await User.findOne({ email }).lean();
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create agent
    const agent = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'agent',
      mobileNumber,
      isActive: true,
      createdBy: userId,
    });

    // Return without password
    const safeAgent = {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      mobileNumber: agent.mobileNumber,
      isActive: agent.isActive,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: safeAgent as unknown as SafeUser,
        message: 'Agent created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Create Agent Error]:', error);
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
