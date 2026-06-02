'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Calendar,
  Search,
  Download,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import type { ApiResponse, BatchSummary, BatchDetail } from '@/types';

export default function ListsPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<Record<string, BatchDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const url = `/api/lists${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const data: ApiResponse<BatchSummary[]> = await res.json();
      if (data.success && data.data) setBatches(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const toggleExpand = async (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
      return;
    }
    setExpandedBatch(batchId);
    if (!batchDetails[batchId]) {
      setLoadingDetail(batchId);
      try {
        const res = await fetch(`/api/lists?batchId=${batchId}`);
        const data: ApiResponse<BatchDetail> = await res.json();
        if (data.success && data.data) {
          setBatchDetails((prev) => ({ ...prev, [batchId]: data.data! }));
        }
      } catch {
        // silent
      } finally {
        setLoadingDetail(null);
      }
    }
  };

  const exportBatchCSV = (detail: BatchDetail) => {
    // Collect all unique extra column names across every lead in this batch
    const extraKeys = new Set<string>();
    for (const agent of detail.agents) {
      for (const lead of agent.leads) {
        if (lead.extraColumns) {
          Object.keys(lead.extraColumns).forEach((k) => extraKeys.add(k));
        }
      }
    }

    const allLeads: Record<string, string>[] = [];
    for (const agent of detail.agents) {
      for (const lead of agent.leads) {
        const fnKey = detail.columnLabels?.firstName || 'FirstName';
        const pKey = detail.columnLabels?.phone || 'Phone';
        const nKey = detail.columnLabels?.notes || 'Notes';

        const row: Record<string, string> = {
          Agent: agent.name,
          [fnKey]: lead.firstName,
          [pKey]: lead.phone,
          [nKey]: lead.notes || '',
        };
        for (const key of extraKeys) {
          row[key] = lead.extraColumns?.[key] || '';
        }
        allLeads.push(row);
      }
    }

    const csv = Papa.unparse(allLeads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_${detail.uploadBatchId.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredBatches = batches.filter((b) => {
    if (!searchFilter) return true;
    const s = searchFilter.toLowerCase();
    return (
      b.uploadBatchId.toLowerCase().includes(s) ||
      (b.batchLabel && b.batchLabel.toLowerCase().includes(s)) ||
      b.agents.some((a) => a.name.toLowerCase().includes(s))
    );
  });

  return (
    <PageContainer
      title="Lead Lists"
      description="View all uploaded batches and their distributions."
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search batches..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <div className="flex flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="pl-9 w-full sm:w-40"
            />
          </div>
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="pl-9 w-full sm:w-40"
            />
          </div>
        </div>
      </div>

      {/* Batch table */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="mt-3 text-lg font-semibold text-slate-900">No batches found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchFilter || dateFrom || dateTo
              ? 'Try adjusting your filters.'
              : 'Upload your first CSV to see batches here.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto w-full pb-2">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead>Batch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Rows</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => {
                  const isExpanded = expandedBatch === batch.uploadBatchId;
                  const detail = batchDetails[batch.uploadBatchId];

                  return (
                    <React.Fragment key={batch.uploadBatchId}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleExpand(batch.uploadBatchId)}
                      >
                        <TableCell>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </motion.div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">
                              {batch.batchLabel || `Batch ${batch.uploadBatchId.slice(0, 8)}`}
                            </p>
                            <p className="text-xs font-mono text-slate-400">
                              {batch.uploadBatchId.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(batch.uploadedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{batch.totalRows}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {batch.agents.map((agent) => (
                              <Badge key={agent.agentId} variant="outline" className="text-xs">
                                {agent.name} ({agent.count})
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {detail && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportBatchCSV(detail);
                              }}
                              className="h-8 w-8"
                              title="Export CSV"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <TableRow key="expanded" className="hover:bg-transparent">
                            <TableCell colSpan={6} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                                  {loadingDetail === batch.uploadBatchId ? (
                                    <div className="flex items-center gap-2 justify-center py-6">
                                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                                      <span className="text-sm text-slate-500">Loading details...</span>
                                    </div>
                                  ) : detail ? (
                                    <div className="space-y-4">
                                      {detail.agents.map((agent) => {
                                        // Collect extra column names for this agent's leads
                                        const agentExtraKeys: string[] = [];
                                        const agentExtraSeen = new Set<string>();
                                        for (const lead of agent.leads) {
                                          if (lead.extraColumns) {
                                            for (const k of Object.keys(lead.extraColumns)) {
                                              if (!agentExtraSeen.has(k)) {
                                                agentExtraSeen.add(k);
                                                agentExtraKeys.push(k);
                                              }
                                            }
                                          }
                                        }
                                        const totalCols = 3 + agentExtraKeys.length;

                                        return (
                                          <div
                                            key={agent.agentId}
                                            className="rounded-lg bg-white border border-slate-200 overflow-hidden"
                                          >
                                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                                              <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
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
                                                <Badge variant="secondary" className="text-xs">
                                                  {agent.count} leads
                                                </Badge>
                                                {agentExtraKeys.length > 0 && (
                                                  <Badge variant="outline" className="text-xs text-indigo-600">
                                                    +{agentExtraKeys.length} extra col{agentExtraKeys.length > 1 ? 's' : ''}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                            <div className="overflow-x-auto w-full">
                                              <Table className="min-w-[500px]">
                                                <TableHeader>
                                                  <TableRow className="hover:bg-transparent">
                                                    <TableHead className="text-xs">{detail.columnLabels?.firstName || 'First Name'}</TableHead>
                                                    <TableHead className="text-xs">{detail.columnLabels?.phone || 'Phone'}</TableHead>
                                                    <TableHead className="text-xs">{detail.columnLabels?.notes || 'Notes'}</TableHead>
                                                    {/* Dynamic extra column headers */}
                                                    {agentExtraKeys.map((col) => (
                                                      <TableHead key={col} className="text-xs text-indigo-600">
                                                        {col}
                                                      </TableHead>
                                                    ))}
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {agent.leads.slice(0, 10).map((lead, i) => (
                                                    <TableRow key={i}>
                                                      <TableCell className="text-sm font-medium">
                                                        {lead.firstName}
                                                      </TableCell>
                                                      <TableCell className="text-sm font-mono text-slate-500">
                                                        {lead.phone}
                                                      </TableCell>
                                                      <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">
                                                        {lead.notes || '—'}
                                                      </TableCell>
                                                      {/* Dynamic extra column cells */}
                                                      {agentExtraKeys.map((col) => (
                                                        <TableCell
                                                          key={col}
                                                          className="text-sm text-slate-500 max-w-[200px] truncate"
                                                        >
                                                          {lead.extraColumns?.[col] || '—'}
                                                        </TableCell>
                                                      ))}
                                                    </TableRow>
                                                  ))}
                                                  {agent.leads.length > 10 && (
                                                    <TableRow>
                                                      <TableCell
                                                        colSpan={totalCols}
                                                        className="text-center text-xs text-slate-400"
                                                      >
                                                        +{agent.leads.length - 10} more rows
                                                      </TableCell>
                                                    </TableRow>
                                                  )}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">
                                      Failed to load details.
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
