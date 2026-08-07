"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { EnquiryStatusBadge } from "@/components/enquiries/enquiry-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ENQUIRY_SOURCE_LABEL } from "@/lib/badges";
import type { listEnquiries } from "@/services/enquiries";

type EnquiryRow = Awaited<ReturnType<typeof listEnquiries>>["rows"][number];

function isOverdue(nextFollowUpAt: Date | string | null): boolean {
  if (!nextFollowUpAt) return false;
  return new Date(nextFollowUpAt).getTime() < Date.now();
}

const columns: ColumnDef<EnquiryRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/enquiries/${row.original.id}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <EnquiryStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => ENQUIRY_SOURCE_LABEL[row.original.source],
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => row.original.city ?? "—",
  },
  {
    id: "assignee",
    header: "Assigned to",
    cell: ({ row }) => row.original.assignee?.name ?? "Unassigned",
  },
  {
    id: "nextFollowUpAt",
    header: "Next follow-up",
    cell: ({ row }) => {
      const value = row.original.nextFollowUpAt;
      if (!value) return "—";
      const overdue = isOverdue(value);
      return (
        <span className={overdue ? "font-medium text-destructive" : undefined}>
          {new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          {overdue ? " · Overdue" : ""}
        </span>
      );
    },
  },
];

export function EnquiriesTable({ enquiries }: { enquiries: EnquiryRow[] }) {
  const table = useReactTable({ data: enquiries, columns, getCoreRowModel: getCoreRowModel() });

  if (enquiries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No enquiries found.
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
