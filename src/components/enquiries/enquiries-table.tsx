"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { CalendarClockIcon, PlusIcon, UsersRoundIcon } from "lucide-react";
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
    header: "Enquiry",
    cell: ({ row }) => (
      <Link
        href={`/enquiries/${row.original.id}`}
        className="group flex min-w-48 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 text-xs font-bold text-pink-700 ring-1 ring-pink-100">
          {row.original.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-[#0b203a] group-hover:text-pink-700">
            {row.original.name}
          </span>
          <span className="mt-0.5 block max-w-48 truncate text-xs text-slate-500">
            {row.original.serviceInterested?.name ?? "Service not selected"}
          </span>
        </span>
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
    cell: ({ row }) => (
      <span className="text-slate-600">{ENQUIRY_SOURCE_LABEL[row.original.source]}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.phone}</span>,
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => <span className="text-slate-600">{row.original.city ?? "—"}</span>,
  },
  {
    id: "assignee",
    header: "Assigned to",
    cell: ({ row }) => {
      const name = row.original.assignee?.name;
      return name ? (
        <span className="flex items-center gap-2 text-slate-700">
          <span className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
            {name.charAt(0).toUpperCase()}
          </span>
          {name}
        </span>
      ) : (
        <span className="text-slate-400">Unassigned</span>
      );
    },
  },
  {
    id: "nextFollowUpAt",
    header: "Next follow-up",
    cell: ({ row }) => {
      const value = row.original.nextFollowUpAt;
      if (!value) return <span className="text-slate-400">—</span>;
      const overdue = isOverdue(value);
      return (
        <span
          className={
            overdue
              ? "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100"
              : "inline-flex items-center gap-1.5 text-sm text-slate-600"
          }
        >
          <CalendarClockIcon className="size-3.5" aria-hidden="true" />
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
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-pink-200 bg-white px-6 py-14 text-center shadow-[0_12px_30px_-28px_rgba(107,28,64,0.35)]">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
          <UsersRoundIcon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-bold text-[#0b203a]">No enquiries found</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Adjust the filters or capture a new enquiry to start the sales workflow.
        </p>
        <Link
          href="/enquiries/new"
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pink-500/30"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          New enquiry
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-[0_16px_38px_-30px_rgba(107,28,64,0.42)]">
      <Table>
        <TableHeader className="bg-slate-50/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-pink-100 hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-12 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
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
            <TableRow key={row.id} className="border-pink-50 hover:bg-pink-50/35">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="h-16">
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
