"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Building2Icon, UserRoundIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { listClients } from "@/services/clients";

type ClientRow = Awaited<ReturnType<typeof listClients>>["rows"][number];

const columns: ColumnDef<ClientRow>[] = [
  {
    accessorKey: "name",
    header: "Client",
    cell: ({ row }) => (
      <Link
        href={`/clients/${row.original.id}`}
        className="group flex min-w-52 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 text-xs font-bold text-pink-700 ring-1 ring-pink-100">
          {row.original.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-[#0b203a] group-hover:text-pink-700">
            {row.original.name}
          </span>
          <span className="mt-0.5 block max-w-52 truncate text-xs text-slate-500">
            {row.original.businessName ??
              (row.original.type === "business" ? "Business account" : "Individual account")}
          </span>
        </span>
      </Link>
    ),
  },
  {
    accessorKey: "cin",
    header: "Customer ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-500">{row.original.cin ?? "—"}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className="gap-1.5 rounded-full bg-slate-100 font-medium text-slate-700"
      >
        {row.original.type === "business" ? (
          <Building2Icon className="size-3" aria-hidden="true" />
        ) : (
          <UserRoundIcon className="size-3" aria-hidden="true" />
        )}
        {row.original.type}
      </Badge>
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
    header: "Account owner",
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
];

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const table = useReactTable({ data: clients, columns, getCoreRowModel: getCoreRowModel() });

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-pink-200 bg-white px-6 py-14 text-center shadow-[0_12px_30px_-28px_rgba(107,28,64,0.35)]">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
          <UsersIcon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-bold text-[#0b203a]">No clients found</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Try a different search or create a client account from the page header.
        </p>
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
