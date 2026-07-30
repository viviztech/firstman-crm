"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { listInvoices } from "@/services/invoices";

type InvoiceRow = Awaited<ReturnType<typeof listInvoices>>["rows"][number];

function isOverdue(status: string, dueDate: Date | string): boolean {
  if (status !== "sent" && status !== "partially_paid" && status !== "overdue") return false;
  return new Date(dueDate).getTime() < Date.now();
}

const columns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: "invoiceNo",
    header: "Invoice #",
    cell: ({ row }) => (
      <Link href={`/invoices/${row.original.id}`} className="font-medium hover:underline">
        {row.original.invoiceNo}
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
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
  {
    id: "total",
    header: "Total",
    cell: ({ row }) => formatMoney(row.original.totalPaise),
  },
  {
    id: "dueDate",
    header: "Due",
    cell: ({ row }) => {
      const overdue = isOverdue(row.original.status, row.original.dueDate);
      return (
        <span className={overdue ? "font-medium text-destructive" : undefined}>
          {new Date(row.original.dueDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
          {overdue ? " · Overdue" : ""}
        </span>
      );
    },
  },
];

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const table = useReactTable({ data: invoices, columns, getCoreRowModel: getCoreRowModel() });

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No invoices found.
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
