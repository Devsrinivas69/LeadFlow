'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import {
  CheckCircle2,
  Download,
  Users,
  FileSpreadsheet,
  Hash,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import type { UploadResponse, ApiResponse, BatchDetail } from '@/types';

interface UploadResultsProps {
  result: UploadResponse;
  onReset: () => void;
}

export function UploadResults({ result, onReset }: UploadResultsProps) {
  const [batchDetail, setBatchDetail] = useState<BatchDetail | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Fetch detailed batch data
    async function fetchBatchDetail() {
      try {
        const res = await fetch(`/api/lists?batchId=${result.batchId}`);
        const data: ApiResponse<BatchDetail> = await res.json();
        if (data.success && data.data) {
          setBatchDetail(data.data);
        }
      } catch {
        // Could not fetch details
      }
    }
    fetchBatchDetail();

    // Remove confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [result.batchId]);

  const exportAgentCSV = (agentName: string, leads: Array<{ firstName: string; phone: string; notes?: string }>) => {
    const csv = Papa.unparse(
      leads.map((l) => ({
        FirstName: l.firstName,
        Phone: l.phone,
        Notes: l.notes || '',
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${agentName.replace(/\s+/g, '_')}_leads_${result.batchId.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Confetti / Success animation */}
      {showConfetti && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: [0, 1.2, 1], rotate: 0 }}
            transition={{ duration: 0.6, times: [0, 0.6, 1] }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100"
          >
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </motion.div>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Rows</p>
                <p className="text-2xl font-bold text-slate-900">
                  {result.totalSaved}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Agents Involved</p>
                <p className="text-2xl font-bold text-slate-900">
                  {result.distribution.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Hash className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Batch ID</p>
                <p className="font-mono text-sm text-slate-900 truncate max-w-[120px]">
                  {result.batchId.slice(0, 8)}...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Agent Tabs */}
      {batchDetail && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <Tabs
            defaultValue={batchDetail.agents[0]?.agentId}
            className="w-full"
          >
            <div className="border-b border-slate-200 px-4 pt-4">
              <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
                {batchDetail.agents.map((agent) => (
                  <TabsTrigger
                    key={agent.agentId}
                    value={agent.agentId}
                    className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 gap-2"
                  >
                    {agent.name}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {agent.count}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {batchDetail.agents.map((agent) => (
              <TabsContent key={agent.agentId} value={agent.agentId}>
                <div className="p-4 space-y-3">
                  {/* Search + Export */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search leads..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportAgentCSV(agent.name, agent.leads)}
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>

                  {/* Agent Leads Table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>First Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agent.leads
                        .filter((lead) => {
                          if (!searchFilter) return true;
                          const s = searchFilter.toLowerCase();
                          return (
                            lead.firstName.toLowerCase().includes(s) ||
                            lead.phone.includes(s)
                          );
                        })
                        .map((lead, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-slate-900">
                              {lead.firstName}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-slate-600">
                              {lead.phone}
                            </TableCell>
                            <TableCell className="text-slate-500 max-w-[200px] truncate">
                              {lead.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onReset}>
          Upload Another File
        </Button>
        <Button
          variant="default"
          onClick={() => (window.location.href = '/dashboard/lists')}
        >
          View All Batches
        </Button>
      </div>
    </motion.div>
  );
}
