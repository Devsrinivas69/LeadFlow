import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { registerAdminSchema } from '@/lib/validations/user';
import type { ApiResponse, SafeUser } from '@/types';

export async function POST(request: Request): Promise<NextResponse<ApiResponse<SafeUser>>> {
  try {
    const body = await request.json();
    const parsed = registerAdminSchema.safeParse(body);

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

    // Create admin
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      mobileNumber,
      isActive: true,
    });

    // Return without password
    const safeAdmin = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      mobileNumber: admin.mobileNumber,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: safeAdmin as unknown as SafeUser,
        message: 'Admin created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Register Admin Error]:', error);
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
