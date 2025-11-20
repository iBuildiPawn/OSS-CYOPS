"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Eye,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Server,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { VulnerabilityFinding } from "@/types/vulnerability";
import { format } from "date-fns";

interface FindingsDataTableProps {
  data: VulnerabilityFinding[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  onFindingClick?: (finding: VulnerabilityFinding) => void;
}

export function FindingsDataTable({
  data,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onFindingClick,
}: FindingsDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Circle className="h-4 w-4 text-red-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "MITIGATED":
        return <CheckCircle2 className="h-4 w-4 text-yellow-500" />;
      case "FIXED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "VERIFIED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "RISK_ACCEPTED":
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case "FALSE_POSITIVE":
        return <XCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      OPEN: "destructive",
      IN_PROGRESS: "default",
      FIXED: "default",
      VERIFIED: "default",
      MITIGATED: "secondary",
      RISK_ACCEPTED: "secondary",
      FALSE_POSITIVE: "secondary",
    };

    return (
      <Badge
        variant={variants[status] || "secondary"}
        className="flex items-center gap-1 w-fit"
      >
        {getStatusIcon(status)}
        <span>{status.replace("_", " ")}</span>
      </Badge>
    );
  };

  const columns: ColumnDef<VulnerabilityFinding>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "host",
      header: "Host / System",
      cell: ({ row }) => {
        const finding = row.original;
        return (
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => onFindingClick?.(finding)}
                className="font-medium hover:underline text-left truncate"
              >
                {finding.affected_system?.hostname ||
                  finding.affected_system?.ip_address ||
                  "Unknown Host"}
              </button>
            </div>
            {finding.affected_system?.ip_address &&
              finding.affected_system?.hostname && (
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  {finding.affected_system.ip_address}
                </div>
              )}
          </div>
        );
      },
    },
    {
      id: "vulnerability",
      header: "Vulnerability",
      cell: ({ row }) => {
        const finding = row.original;
        return (
          <div className="max-w-md">
            <div className="font-medium text-sm truncate">
              {finding.vulnerability?.title || "Unknown Vulnerability"}
            </div>
            {finding.vulnerability?.severity && (
              <Badge
                variant={
                  finding.vulnerability.severity === "CRITICAL" ||
                  finding.vulnerability.severity === "HIGH"
                    ? "destructive"
                    : "secondary"
                }
                className={
                  finding.vulnerability.severity === "HIGH"
                    ? "bg-orange-500"
                    : ""
                }
              >
                {finding.vulnerability.severity}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "service",
      header: "Service",
      cell: ({ row }) => {
        const finding = row.original;
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs font-mono">
                {finding.port}/{finding.protocol}
              </Badge>
            </div>
            {finding.service_name && (
              <div className="text-xs text-muted-foreground mt-1">
                {finding.service_name}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "first_detected",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            First Detected
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.original.first_detected;
        return (
          <span className="text-sm">
            {format(new Date(date), "MMM dd, yyyy")}
          </span>
        );
      },
    },
    {
      id: "fixed_date",
      header: "Fixed Date",
      cell: ({ row }) => {
        const fixedAt = row.original.fixed_at;
        if (!fixedAt) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        return (
          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {format(new Date(fixedAt), "MMM dd, yyyy")}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const finding = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFindingClick?.(finding)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalCount / pageSize),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: pageSize,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
  });

  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onFindingClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center py-8">
                    <Shield className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No findings found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <span>
              {table.getFilteredSelectedRowModel().rows.length} of {totalCount}{" "}
              row(s) selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {Math.ceil(totalCount / pageSize)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
