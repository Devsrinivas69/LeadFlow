'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ValidatedRow } from '@/types';

interface PreviewTableProps {
  rows: ValidatedRow[];
  maxRows?: number;
}

export function PreviewTable({ rows, maxRows = 10 }: PreviewTableProps) {
  const displayRows = rows.slice(0, maxRows);
  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;

  // Collect all unique extra column names across all rows (preserves insertion order)
  const extraColumnNames: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.extraColumns) {
      for (const key of Object.keys(row.extraColumns)) {
        if (!seen.has(key)) {
          seen.add(key);
          extraColumnNames.push(key);
        }
      }
    }
  }

  const totalColumns = 3 + extraColumnNames.length; // firstName + phone + notes + extras

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium text-slate-700">
            {validCount} valid
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-slate-700">
            {invalidCount} invalid
          </span>
        </div>
        <div className="h-4 w-px bg-slate-300" />
        <span className="text-sm text-slate-500">
          {rows.length} total rows
        </span>
        <div className="h-4 w-px bg-slate-300" />
        <span className="text-sm text-slate-500">
          {totalColumns} column{totalColumns !== 1 ? 's' : ''} detected
        </span>
        {extraColumnNames.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {extraColumnNames.map((col) => (
              <Badge key={col} variant="secondary" className="text-xs">
                {col}
              </Badge>
            ))}
          </div>
        )}
        {rows.length > maxRows && (
          <span className="text-xs text-slate-400">
            (showing first {maxRows})
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto w-full pb-2">
          <TooltipProvider>
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Notes</TableHead>
                  {/* Dynamic extra column headers */}
                  {extraColumnNames.map((col) => (
                    <TableHead key={col} className="text-indigo-600">
                      {col}
                    </TableHead>
                  ))}
                  <TableHead className="w-20 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((row, i) => (
                  <TableRow
                    key={i}
                    className={
                      !row.isValid
                        ? 'bg-red-50/50 hover:bg-red-50'
                        : ''
                    }
                  >
                    <TableCell className="text-slate-400 font-mono text-xs">
                      {row.rowIndex + 1}
                    </TableCell>
                    <TableCell
                      className={`font-medium ${
                        !row.firstName ? 'text-red-500 italic' : 'text-slate-900'
                      }`}
                    >
                      {row.firstName || '(empty)'}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">
                      {row.phone || '(empty)'}
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-[200px] truncate">
                      {row.notes || '—'}
                    </TableCell>
                    {/* Dynamic extra column cells */}
                    {extraColumnNames.map((col) => (
                      <TableCell
                        key={col}
                        className="text-slate-600 max-w-[200px] truncate"
                      >
                        {row.extraColumns?.[col] || '—'}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {row.isValid ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <ul className="text-xs space-y-0.5">
                              {row.errors.map((err, ei) => (
                                <li key={ei}>• {err}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
