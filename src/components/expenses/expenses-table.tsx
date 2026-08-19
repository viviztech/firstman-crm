"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { listExpenses } from "@/services/expenses";

type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>["rows"][number];

const columns: ColumnDef<ExpenseRow>[] = [
  {
    id: "date",
    header: "Date",
    cell: ({ row }) =>
      new Date(row.original.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    id: "description",
    header: "Description",
    cell: ({ row }) => row.original.description ?? "—",
  },
  {
    id: "order",
    header: "Job Card",
    cell: ({ row }) =>
      row.original.order ? (
        <Link href={`/orders/${row.original.order.id}`} className="hover:underline">
          {row.original.order.orderNo}
        </Link>
      ) : (
        "—"
      ),
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => formatMoney(row.original.amountPaise),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/expenses/${row.original.id}/edit`} />}
        >
          Edit
        </Button>
        <DeleteExpenseButton expenseId={row.original.id} category={row.original.category} />
      </div>
    ),
  },
];

export function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  const table = useReactTable({ data: expenses, columns, getCoreRowModel: getCoreRowModel() });

  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No expenses found.
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
