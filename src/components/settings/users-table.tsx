"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { UserBanToggle } from "@/components/settings/user-ban-toggle";
import { UserRoleSelect } from "@/components/settings/user-role-select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/lib/roles";
import type { listAllStaffForAdmin } from "@/services/users";

type StaffRow = Awaited<ReturnType<typeof listAllStaffForAdmin>>[number];

function buildColumns(currentUserId: string): ColumnDef<StaffRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => (
        <UserRoleSelect
          userId={row.original.id}
          role={row.original.role as Role}
          disabled={row.original.id === currentUserId}
        />
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.banned ? "destructive" : "secondary"}>
          {row.original.banned ? "Deactivated" : "Active"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <UserBanToggle
          userId={row.original.id}
          userName={row.original.name}
          banned={Boolean(row.original.banned)}
          disabled={row.original.id === currentUserId}
        />
      ),
    },
  ];
}

export function UsersTable({ staff, currentUserId }: { staff: StaffRow[]; currentUserId: string }) {
  const table = useReactTable({
    data: staff,
    columns: buildColumns(currentUserId),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
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
  );
}
