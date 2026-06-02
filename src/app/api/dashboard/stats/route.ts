import { NextResponse } from 'next/server';
// @ts-ignore - Ignore the IDE warning about mongoose types
import mongoose from 'mongoose';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import DistributedList from '@/models/DistributedList';
import type { ApiResponse } from '@/types';

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalLeads: number;
  totalBatches: number;
  recentBatches: Array<{
    uploadBatchId: string;
    batchLabel?: string;
    uploadedAt: Date;
    totalRows: number;
  }>;
}

export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<DashboardStats>>> {
  try {
    const { userId, role } = await getSession(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'User ID missing' },
        { status: 401 }
      );
    }

    await dbConnect();

    if (role === 'admin') {
      const [totalAgents, activeAgents, totalLeads, batchAgg, recentBatches] =
        await Promise.all([
          User.countDocuments({ role: 'agent' }),
          User.countDocuments({ role: 'agent', isActive: true }),
          DistributedList.countDocuments(),
          DistributedList.aggregate([
            { $group: { _id: '$uploadBatchId' } },
            { $count: 'total' },
          ]),
          DistributedList.aggregate([
            {
              $group: {
                _id: '$uploadBatchId',
                batchLabel: { $first: '$batchLabel' },
                uploadedAt: { $first: '$uploadedAt' },
                totalRows: { $sum: 1 },
              },
            },
            { $sort: { uploadedAt: -1 } },
            { $limit: 5 },
          ]),
        ]);

      return NextResponse.json(
        {
          success: true,
          data: {
            totalAgents,
            activeAgents,
            totalLeads,
            totalBatches: batchAgg[0]?.total || 0,
            recentBatches: recentBatches.map((b: any) => ({
              uploadBatchId: b._id,
              batchLabel: b.batchLabel,
              uploadedAt: b.uploadedAt,
              totalRows: b.totalRows,
            })),
          },
        },
        { status: 200 }
      );
    }

    // Agent view: only their own stats
    const agentFilter = { agentId: new mongoose.Types.ObjectId(userId as string) };
    const [totalLeads, batchAgg, recentBatches] = await Promise.all([
      DistributedList.countDocuments(agentFilter),
      DistributedList.aggregate([
        { $match: agentFilter },
        { $group: { _id: '$uploadBatchId' } },
        { $count: 'total' },
      ]),
      DistributedList.aggregate([
        { $match: agentFilter },
        {
          $group: {
            _id: '$uploadBatchId',
            batchLabel: { $first: '$batchLabel' },
            uploadedAt: { $first: '$uploadedAt' },
            totalRows: { $sum: 1 },
          },
        },
        { $sort: { uploadedAt: -1 } },
        { $limit: 5 },
      ]),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalAgents: 0,
          activeAgents: 0,
          totalLeads,
          totalBatches: batchAgg[0]?.total || 0,
          recentBatches: recentBatches.map((b: any) => ({
            uploadBatchId: b._id,
            batchLabel: b.batchLabel,
            uploadedAt: b.uploadedAt,
            totalRows: b.totalRows,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Dashboard Stats Error]:', error);
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
