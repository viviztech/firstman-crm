"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { CalendarClockIcon, Repeat2Icon, ShieldCheckIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COMPLIANCE_RECURRENCE_LABEL } from "@/lib/badges";
import type { listComplianceItems } from "@/services/compliance";

type ComplianceRow = Awaited<ReturnType<typeof listComplianceItems>>["rows"][number];

const columns: ColumnDef<ComplianceRow>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
          <ShieldCheckIcon className="size-4" aria-hidden="true" />
        </span>
        <Link
          href={`/compliance/${row.original.id}`}
          className="font-semibold text-[#0b203a] hover:text-pink-700 hover:underline"
        >
          {row.original.title}
        </Link>
      </div>
    ),
  },
  {
    id: "client",
    header: "Client",
    cell: ({ row }) => (
      <Link
        href={`/clients/${row.original.clientId}`}
        className="inline-flex items-center gap-1.5 text-slate-600 hover:text-pink-700 hover:underline"
      >
        <UserRoundIcon className="size-3.5 text-pink-400" aria-hidden="true" />
        {row.original.clientName}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ComplianceStatusBadge status={row.original.status} />,
  },
  {
    id: "recurrence",
    header: "Recurrence",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5 text-slate-600">
        <Repeat2Icon className="size-3.5 text-pink-400" aria-hidden="true" />
        {COMPLIANCE_RECURRENCE_LABEL[row.original.recurrence]}
      </span>
    ),
  },
  {
    id: "dueDate",
    header: "Due",
    cell: ({ row }) => {
      const overdue = row.original.status === "overdue";
      return (
        <span
          className={`inline-flex items-center gap-1.5 ${overdue ? "font-medium text-destructive" : "text-slate-600"}`}
        >
          <CalendarClockIcon className="size-3.5" aria-hidden="true" />
          {new Date(row.original.dueDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      );
    },
  },
];

export function ComplianceTable({ items }: { items: ComplianceRow[] }) {
  const table = useReactTable({ data: items, columns, getCoreRowModel: getCoreRowModel() });

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-10 text-center">
        <ShieldCheckIcon className="mx-auto size-10 text-pink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-[#0b203a]">No compliance items found</p>
        <p className="mt-1 text-sm text-slate-500">Adjust the filters or add a new deadline.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-pink-100 bg-white shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="bg-pink-50/70 text-xs font-semibold text-slate-600"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-pink-50/35">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
