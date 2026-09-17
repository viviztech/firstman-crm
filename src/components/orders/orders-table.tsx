"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  BriefcaseBusinessIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { listOrders } from "@/services/orders";

type OrderRow = Awaited<ReturnType<typeof listOrders>>["rows"][number];

function isOverdue(dueAt: Date | string, completedAt: Date | string | null): boolean {
  if (completedAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

const columns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "orderNo",
    header: "Job Card #",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
          <ClipboardListIcon className="size-4" aria-hidden="true" />
        </span>
        <Link
          href={`/orders/${row.original.id}`}
          className="font-mono text-sm font-semibold text-pink-700 hover:text-pink-900 hover:underline"
        >
          {row.original.orderNo}
        </Link>
      </div>
    ),
  },
  {
    id: "client",
    header: "Client",
    cell: ({ row }) => (
      <span className="font-medium text-[#0b203a]">{row.original.client.name}</span>
    ),
  },
  {
    id: "service",
    header: "Service",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5 text-slate-600">
        <BriefcaseBusinessIcon className="size-3.5 text-pink-400" aria-hidden="true" />
        {row.original.service.name}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
  },
  {
    id: "docsPending",
    header: "Docs",
    cell: ({ row }) =>
      row.original.docsPending ? (
        <Badge variant="destructive">Docs pending</Badge>
      ) : (
        <span className="text-muted-foreground">Complete</span>
      ),
  },
  {
    id: "quotedPrice",
    header: "Quoted",
    cell: ({ row }) => (
      <span className="font-semibold text-[#0b203a]">
        {formatMoney(row.original.quotedPricePaise)}
      </span>
    ),
  },
  {
    id: "assignee",
    header: "Assigned to",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5 text-slate-600">
        <UserRoundIcon className="size-3.5 text-pink-400" aria-hidden="true" />
        {row.original.assignee?.name ?? "Unassigned"}
      </span>
    ),
  },
  {
    id: "dueAt",
    header: "Due",
    cell: ({ row }) => {
      const overdue = isOverdue(row.original.dueAt, row.original.completedAt);
      return (
        <span
          className={`inline-flex items-center gap-1.5 ${overdue ? "font-medium text-destructive" : "text-slate-600"}`}
        >
          <CalendarClockIcon className="size-3.5" aria-hidden="true" />
          {new Date(row.original.dueAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
          {overdue ? " · Overdue" : ""}
        </span>
      );
    },
  },
];

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const table = useReactTable({ data: orders, columns, getCoreRowModel: getCoreRowModel() });

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-10 text-center">
        <ClipboardListIcon className="mx-auto size-10 text-pink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-[#0b203a]">No job cards found</p>
        <p className="mt-1 text-sm text-slate-500">Adjust the filters or create a new job card.</p>
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
