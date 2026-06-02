'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SafeUser } from '@/types';

interface DistributionSummaryProps {
  validRowCount: number;
  onConfirm: (batchLabel?: string) => void;
  onBack: () => void;
  uploading: boolean;
}

export function DistributionSummary({
  validRowCount,
  onConfirm,
  onBack,
  uploading,
}: DistributionSummaryProps) {
  const [agents, setAgents] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchLabel, setBatchLabel] = useState('');

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents?activeOnly=true');
        const data = await res.json();
        if (data.success) {
          setAgents(data.data || []);
        }
      } catch {
        // Error fetching agents
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  const agentCount = agents.length;
  const rowsPerAgent = agentCount > 0 ? Math.floor(validRowCount / agentCount) : 0;
  const extraRows = agentCount > 0 ? validRowCount % agentCount : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-slate-500">Checking active agents...</span>
      </div>
    );
  }

  if (agentCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"
      >
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h3 className="mt-3 text-lg font-semibold text-amber-800">
          No Active Agents
        </h3>
        <p className="mt-1 text-sm text-amber-700">
          You need at least 1 active agent before uploading leads. Go to the
          Agents page to add one.
        </p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Distribution Preview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              Distribution Preview
            </h3>
            <p className="text-sm text-slate-500">
              {validRowCount} rows will be distributed across {agentCount}{' '}
              agents (~{rowsPerAgent}
              {extraRows > 0 ? `-${rowsPerAgent + 1}` : ''} each)
            </p>
          </div>
        </div>

        {/* Agent list */}
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {agents.map((agent, i) => {
            const count =
              i < extraRows ? rowsPerAgent + 1 : rowsPerAgent;
            return (
              <div
                key={agent._id.toString()}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                    {agent.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {agent.name}
                  </span>
                </div>
                <span className="text-sm font-mono text-slate-500">
                  {count} leads
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Label */}
      <div className="space-y-2">
        <Label htmlFor="batch-label">
          Batch Label{' '}
          <span className="text-slate-400 font-normal">(optional)</span>
        </Label>
        <Input
          id="batch-label"
          value={batchLabel}
          onChange={(e) => setBatchLabel(e.target.value)}
          placeholder="e.g., June Campaign Leads"
          maxLength={100}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onBack} disabled={uploading}>
          Back
        </Button>
        <Button
          onClick={() => onConfirm(batchLabel || undefined)}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Distributing...
            </>
          ) : (
            `Distribute ${validRowCount} Leads`
          )}
        </Button>
      </div>
    </motion.div>
  );
}
