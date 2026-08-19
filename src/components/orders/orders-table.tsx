"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
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
      <Link href={`/orders/${row.original.id}`} className="font-medium hover:underline">
        {row.original.orderNo}
      </Link>
    ),
  },
  {
    id: "client",
    header: "Client",
    cell: ({ row }) => row.original.client.name,
  },
  {
    id: "service",
    header: "Service",
    cell: ({ row }) => row.original.service.name,
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
    cell: ({ row }) => formatMoney(row.original.quotedPricePaise),
  },
  {
    id: "assignee",
    header: "Assigned to",
    cell: ({ row }) => row.original.assignee?.name ?? "Unassigned",
  },
  {
    id: "dueAt",
    header: "Due",
    cell: ({ row }) => {
      const overdue = isOverdue(row.original.dueAt, row.original.completedAt);
      return (
        <span className={overdue ? "font-medium text-destructive" : undefined}>
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
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No job cards found.
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
