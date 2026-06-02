import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import DistributedList from '@/models/DistributedList';
import { uploadRequestSchema } from '@/lib/validations/upload';
import { getSession } from '@/lib/auth';
import type { ApiResponse, UploadResponse, ParsedRow } from '@/types';

interface AgentRecord {
  _id: string;
  name: string;
}

function distributeRoundRobin(
  items: ParsedRow[],
  agents: AgentRecord[]
): Array<ParsedRow & { agentId: string }> {
  if (agents.length === 0) {
    throw new Error('No active agents available');
  }
  return items.map((item, index) => ({
    ...item,
    agentId: agents[index % agents.length]._id,
  }));
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<UploadResponse>>> {
  try {
    // Admin-only check
    const { role } = await getSession(request);
    if (role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = uploadRequestSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`
      );
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: fieldErrors.join('; '),
        },
        { status: 422 }
      );
    }

    const { rows, batchLabel } = parsed.data;

    await dbConnect();

    // Fetch active agents
    const agents = await User.find({ role: 'agent', isActive: true })
      .select('_id name')
      .lean();

    if (agents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_AGENTS',
          message:
            'No active agents available. Please add at least one active agent before uploading.',
        },
        { status: 422 }
      );
    }

    const agentRecords: AgentRecord[] = agents.map((a) => ({
      _id: a._id.toString(),
      name: a.name,
    }));

    // Distribute round-robin
    const distributed = distributeRoundRobin(rows, agentRecords);

    // Generate batch ID
    const batchId = uuidv4();
    const now = new Date();

    // Prepare documents for insertMany
    const documents = distributed.map((item) => ({
      agentId: item.agentId,
      uploadBatchId: batchId,
      batchLabel: batchLabel || undefined,
      firstName: item.firstName,
      phone: item.phone,
      notes: item.notes || undefined,
      rowIndex: item.rowIndex,
      uploadedAt: now,
    }));

    // Bulk insert
    await DistributedList.insertMany(documents, { ordered: false });

    // Build distribution summary
    const distributionMap = new Map<string, { name: string; count: number }>();
    for (const item of distributed) {
      const agent = agentRecords.find((a) => a._id === item.agentId);
      const existing = distributionMap.get(item.agentId);
      if (existing) {
        existing.count += 1;
      } else {
        distributionMap.set(item.agentId, {
          name: agent?.name || 'Unknown',
          count: 1,
        });
      }
    }

    const distribution = Array.from(distributionMap.entries()).map(
      ([agentId, { name, count }]) => ({
        agentId,
        name,
        count,
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          batchId,
          totalSaved: documents.length,
          distribution,
        },
        message: `Successfully distributed ${documents.length} leads across ${agents.length} agents`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Upload Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred during upload',
      },
      { status: 500 }
    );
  }
}
