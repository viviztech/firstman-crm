"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
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
      <Link href={`/compliance/${row.original.id}`} className="font-medium hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  {
    id: "client",
    header: "Client",
    cell: ({ row }) => (
      <Link href={`/clients/${row.original.clientId}`} className="hover:underline">
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
    cell: ({ row }) => COMPLIANCE_RECURRENCE_LABEL[row.original.recurrence],
  },
  {
    id: "dueDate",
    header: "Due",
    cell: ({ row }) => {
      const overdue = row.original.status === "overdue";
      return (
        <span className={overdue ? "font-medium text-destructive" : undefined}>
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
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No compliance items found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
            <TableRow key={row.id}>
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
