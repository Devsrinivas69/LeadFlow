'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Edit, UserX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { SafeUser } from '@/types';

const columnHelper = createColumnHelper<SafeUser>();

interface AgentTableProps {
  agents: SafeUser[];
  loading: boolean;
  onEdit: (agent: SafeUser) => void;
  onDeactivate: (agent: SafeUser) => void;
}

export function AgentTable({
  agents,
  loading,
  onEdit,
  onDeactivate,
}: AgentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-medium text-slate-500 hover:text-slate-900 hover:bg-transparent"
          >
            Agent
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const name = row.original.name;
          const initials = name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-slate-900">{name}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('email', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-medium text-slate-500 hover:text-slate-900 hover:bg-transparent"
          >
            Email
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="text-slate-600">{getValue()}</span>
        ),
      }),
      columnHelper.accessor('mobileNumber', {
        header: () => <span className="font-medium text-slate-500">Mobile</span>,
        cell: ({ getValue }) => (
          <span className="text-slate-600 font-mono text-xs">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('role', {
        header: () => <span className="font-medium text-slate-500">Role</span>,
        cell: ({ getValue }) => (
          <Badge variant="default" className="capitalize">
            {getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('isActive', {
        header: () => <span className="font-medium text-slate-500">Status</span>,
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      }),
      columnHelper.accessor('createdAt', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-medium text-slate-500 hover:text-slate-900 hover:bg-transparent"
          >
            Created
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const date = new Date(getValue());
          return (
            <span className="text-slate-500 text-sm">
              {date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => (
          <span className="font-medium text-slate-500">Actions</span>
        ),
        cell: ({ row }) => {
          const agent = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(agent)}
                className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                title="Edit agent"
              >
                <Edit className="h-4 w-4" />
              </Button>
              {agent.isActive && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeactivate(agent)}
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  title="Deactivate agent"
                >
                  <UserX className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [onEdit, onDeactivate]
  );

  const table = useReactTable({
    data: agents,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = String(row.original.name).toLowerCase();
      const email = String(row.original.email).toLowerCase();
      return name.includes(search) || email.includes(search);
    },
  });

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-slate-500"
              >
                <div className="flex flex-col items-center gap-2">
                  <MoreHorizontal className="h-8 w-8 text-slate-300" />
                  <p>No agents found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={
                  !row.original.isActive
                    ? 'opacity-50 bg-slate-50/50'
                    : ''
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
