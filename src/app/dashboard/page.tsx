'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FileSpreadsheet,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalLeads: number;
  totalBatches: number;
  recentBatches: Array<{
    uploadBatchId: string;
    batchLabel?: string;
    uploadedAt: string;
    totalRows: number;
  }>;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch {
        // Error fetching stats
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const isAdmin = user?.role === 'admin';

  const statCards = isAdmin
    ? [
        {
          label: 'Total Agents',
          value: stats?.totalAgents ?? 0,
          icon: Users,
          color: 'bg-indigo-100 text-indigo-600',
          href: '/dashboard/agents',
        },
        {
          label: 'Active Agents',
          value: stats?.activeAgents ?? 0,
          icon: TrendingUp,
          color: 'bg-emerald-100 text-emerald-600',
          href: '/dashboard/agents',
        },
        {
          label: 'Total Leads',
          value: stats?.totalLeads ?? 0,
          icon: FileSpreadsheet,
          color: 'bg-amber-100 text-amber-600',
          href: '/dashboard/lists',
        },
        {
          label: 'Upload Batches',
          value: stats?.totalBatches ?? 0,
          icon: Layers,
          color: 'bg-purple-100 text-purple-600',
          href: '/dashboard/lists',
        },
      ]
    : [
        {
          label: 'My Leads',
          value: stats?.totalLeads ?? 0,
          icon: FileSpreadsheet,
          color: 'bg-indigo-100 text-indigo-600',
          href: '/dashboard/lists',
        },
        {
          label: 'My Batches',
          value: stats?.totalBatches ?? 0,
          icon: Layers,
          color: 'bg-emerald-100 text-emerald-600',
          href: '/dashboard/lists',
        },
      ];

  return (
    <PageContainer
      title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`}
      description={
        isAdmin
          ? 'Here\'s an overview of your sales operations.'
          : 'Here\'s a summary of your assigned leads.'
      }
    >
      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: isAdmin ? 4 : 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((card) => (
            <motion.div key={card.label} variants={item}>
              <Link href={card.href}>
                <Card className="group cursor-pointer hover:border-indigo-200 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color} transition-transform group-hover:scale-110`}
                      >
                        <card.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{card.label}</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {card.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Recent Batches */}
      {stats && stats.recentBatches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Uploads
            </h2>
            <Link
              href="/dashboard/lists"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
            {stats.recentBatches.map((batch) => (
              <Link
                key={batch.uploadBatchId}
                href={`/dashboard/lists?batchId=${batch.uploadBatchId}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                    <FileSpreadsheet className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {batch.batchLabel || `Batch ${batch.uploadBatchId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(batch.uploadedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{batch.totalRows} leads</Badge>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state for new users */}
      {stats && stats.totalLeads === 0 && isAdmin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No leads distributed yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Start by adding agents, then upload a CSV file to distribute leads across your team.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/dashboard/agents">
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
                <Users className="h-4 w-4" />
                Add Agents
              </button>
            </Link>
            <Link href="/dashboard/upload">
              <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-indigo-700 transition-colors cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                Upload Leads
              </button>
            </Link>
          </div>
        </motion.div>
      )}
    </PageContainer>
  );
}
