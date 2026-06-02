import { NextResponse } from 'next/server';
// @ts-ignore - Ignore the IDE warning about mongoose types
import mongoose from 'mongoose';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import DistributedList from '@/models/DistributedList';
import User from '@/models/User';
import type { ApiResponse, BatchSummary, BatchDetail } from '@/types';

// GET /api/lists — Fetch batch history or single batch details
export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<BatchSummary[] | BatchDetail>>> {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const agentId = searchParams.get('agentId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const { userId, role } = await getSession(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // If requesting a specific batch, return detailed view
    if (batchId) {
      const matchFilter: Record<string, unknown> = { uploadBatchId: batchId };

      // Agents can only see their own leads
      if (role === 'agent' && userId) {
        matchFilter.agentId = new mongoose.Types.ObjectId(userId);
      }

      const leads = await DistributedList.find(matchFilter)
        .sort({ rowIndex: 1 })
        .lean();

      if (leads.length === 0) {
        return NextResponse.json(
          { success: false, error: 'NOT_FOUND', message: 'Batch not found' },
          { status: 404 }
        );
      }

      // Group leads by agent
      const agentMap = new Map<
        string,
        {
          agentId: string;
          leads: Array<{
            firstName: string;
            phone: string;
            notes?: string;
            extraColumns?: Record<string, string>;
            rowIndex: number;
          }>;
        }
      >();

      for (const lead of leads) {
        const aid = lead.agentId.toString();
        if (!agentMap.has(aid)) {
          agentMap.set(aid, { agentId: aid, leads: [] });
        }
        agentMap.get(aid)!.leads.push({
          firstName: lead.firstName,
          phone: lead.phone,
          notes: lead.notes,
          extraColumns: (lead as any).extraColumns,
          rowIndex: lead.rowIndex,
        });
      }

      // Fetch agent names
      const agentIds = Array.from(agentMap.keys());
      const agents = await User.find({
        _id: { $in: agentIds.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select('_id name')
        .lean();

      const agentNameMap = new Map<string, string>(
        agents.map((a: any) => [a._id.toString(), a.name])
      );

      const batchDetail: BatchDetail = {
        uploadBatchId: batchId,
        batchLabel: leads[0]?.batchLabel,
        uploadedAt: leads[0]?.uploadedAt,
        totalRows: leads.length,
        columnLabels: (leads[0] as any)?.columnLabels || undefined,
        agents: Array.from(agentMap.entries()).map(([aid, data]) => ({
          agentId: aid,
          name: agentNameMap.get(aid) || 'Unknown Agent',
          count: data.leads.length,
          leads: data.leads,
        })),
      };

      return NextResponse.json(
        { success: true, data: batchDetail },
        { status: 200 }
      );
    }

    // Build aggregation pipeline for batch listing
    const matchStage: Record<string, unknown> = {};

    // Agents can only see their own leads
    if (role === 'agent' && userId) {
      matchStage.agentId = new mongoose.Types.ObjectId(userId);
    }

    if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
      matchStage.agentId = new mongoose.Types.ObjectId(agentId);
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDate;
      }
      matchStage.uploadedAt = dateFilter;
    }

    const pipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$uploadBatchId',
          batchLabel: { $first: '$batchLabel' },
          uploadedAt: { $first: '$uploadedAt' },
          totalRows: { $sum: 1 },
          agentIds: { $addToSet: '$agentId' },
        },
      },
      { $sort: { uploadedAt: -1 as const } },
      { $limit: 50 },
    ];

    const batches = await DistributedList.aggregate(pipeline);

    // Fetch agent names for all batches
    const allAgentIds = new Set<string>();
    for (const batch of batches) {
      for (const aid of batch.agentIds) {
        allAgentIds.add(aid.toString());
      }
    }

    const allAgents = await User.find({
      _id: {
        $in: Array.from(allAgentIds).map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
      },
    })
      .select('_id name')
      .lean();

    const agentNameMap = new Map<string, string>(
      allAgents.map((a: any) => [a._id.toString(), a.name])
    );

    // Get per-agent counts for each batch
    const batchSummaries: BatchSummary[] = [];

    for (const batch of batches) {
      const agentCounts = await DistributedList.aggregate([
        { $match: { uploadBatchId: batch._id } },
        {
          $group: {
            _id: '$agentId',
            count: { $sum: 1 },
          },
        },
      ]);

      batchSummaries.push({
        uploadBatchId: batch._id,
        batchLabel: batch.batchLabel,
        uploadedAt: batch.uploadedAt,
        totalRows: batch.totalRows,
        agents: agentCounts.map((ac: any) => ({
          agentId: ac._id.toString(),
          name: agentNameMap.get(ac._id.toString()) || 'Unknown Agent',
          count: ac.count,
        })),
      });
    }

    return NextResponse.json(
      { success: true, data: batchSummaries },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Lists Error]:', error);
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
