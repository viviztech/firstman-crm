"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { CalendarClockIcon, ReceiptTextIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { InvoiceKindBadge } from "@/components/invoices/invoice-kind-badge";
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
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
          <ReceiptTextIcon className="size-4" aria-hidden="true" />
        </span>
        <Link
          href={`/invoices/${row.original.id}`}
          className="font-mono text-sm font-semibold text-pink-700 hover:text-pink-900 hover:underline"
        >
          {row.original.invoiceNo}
        </Link>
        <InvoiceKindBadge kind={row.original.kind} />
      </div>
    ),
  },
  {
    id: "client",
    header: "Client",
    cell: ({ row }) => (
      <Link
        href={`/clients/${row.original.clientId}`}
        className="inline-flex items-center gap-1.5 font-medium text-[#0b203a] hover:text-pink-700 hover:underline"
      >
        <UserRoundIcon className="size-3.5 text-pink-400" aria-hidden="true" />
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
    cell: ({ row }) => (
      <span className="font-semibold text-[#0b203a]">{formatMoney(row.original.totalPaise)}</span>
    ),
  },
  {
    id: "dueDate",
    header: "Due",
    cell: ({ row }) => {
      const overdue = isOverdue(row.original.status, row.original.dueDate);
      return (
        <span
          className={`inline-flex items-center gap-1.5 ${overdue ? "font-medium text-destructive" : "text-slate-600"}`}
        >
          <CalendarClockIcon className="size-3.5" aria-hidden="true" />
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
      <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-10 text-center">
        <ReceiptTextIcon className="mx-auto size-10 text-pink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-[#0b203a]">No invoices found</p>
        <p className="mt-1 text-sm text-slate-500">Adjust the filters or create a new invoice.</p>
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
