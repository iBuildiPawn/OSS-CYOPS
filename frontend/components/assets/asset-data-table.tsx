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
  ChevronDown,
  Eye,
  Edit,
  AlertCircle,
  ExternalLink,
  Server,
  Shield,
  MapPin,
  User,
  Calendar,
  Tag as TagIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AssetWithVulnCount } from "@/types/asset";
import { AssetCriticalityBadge } from "./asset-criticality-badge";
import { AssetStatusBadge } from "./asset-status-badge";
import { format } from "date-fns";
import { useAsset } from "@/hooks/use-assets";

interface AssetDataTableProps {
  data: AssetWithVulnCount[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  onSearchChange?: (search: string) => void;
}

export function AssetDataTable({
  data,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSearchChange,
}: AssetDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Fetch full asset details when drawer opens
  const { data: assetDetails, isLoading: isLoadingDetails } = useAsset(
    selectedAssetId || "",
    false,
  );
  const selectedAsset = assetDetails?.asset || assetDetails;

  const columns: ColumnDef<AssetWithVulnCount>[] = [
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
      accessorKey: "hostname",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Hostname
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const hostname = row.getValue("hostname") as string | undefined;
        const assetId = row.original.asset_id;
        return (
          <div className="max-w-md">
            <button
              onClick={() => {
                setSelectedAssetId(row.original.id);
                setDrawerOpen(true);
              }}
              className="font-medium hover:underline text-left truncate block max-w-full"
            >
              {hostname || "N/A"}
            </button>
            {assetId && (
              <div className="text-xs text-muted-foreground mt-1">
                ID: {assetId}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "ip_address",
      header: "IP Address",
      cell: ({ row }) => {
        const ip = row.getValue("ip_address") as string | undefined;
        return (
          <span className="font-mono text-sm">
            {ip || <span className="text-muted-foreground">N/A</span>}
          </span>
        );
      },
    },
    {
      accessorKey: "system_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.system_type;
        return (
          <Badge variant="outline" className="capitalize">
            {type.toLowerCase().replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "environment",
      header: "Environment",
      cell: ({ row }) => {
        const env = row.original.environment;
        const colors: Record<string, string> = {
          PRODUCTION:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
          STAGING:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          DEVELOPMENT:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          TEST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        };
        return (
          <Badge className={colors[env] || ""} variant="secondary">
            {env}
          </Badge>
        );
      },
    },
    {
      accessorKey: "criticality",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Criticality
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const criticality = row.original.criticality;
        return criticality ? (
          <AssetCriticalityBadge criticality={criticality} />
        ) : (
          <span className="text-muted-foreground text-sm">N/A</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <AssetStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "vulnerability_count",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Vulnerabilities
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const count = row.original.vulnerability_count || 0;
        return (
          <Badge
            variant={count > 0 ? "destructive" : "secondary"}
            className="min-w-[3rem] justify-center"
          >
            {count}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const asset = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAssetId(asset.id);
                setDrawerOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/assets/${asset.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
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
      <div className="flex items-center justify-end gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No assets found.</p>
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

      {/* Asset Preview Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="max-w-3xl h-full">
          {isLoadingDetails ? (
            <>
              <DrawerHeader className="border-b">
                <DrawerTitle>Loading...</DrawerTitle>
              </DrawerHeader>
              <div className="p-6 flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    Loading asset details...
                  </p>
                </div>
              </div>
            </>
          ) : selectedAsset ? (
            <>
              <DrawerHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DrawerTitle className="text-2xl mb-2">
                      {selectedAsset.hostname ||
                        selectedAsset.asset_id ||
                        "Asset Details"}
                    </DrawerTitle>
                    <DrawerDescription className="flex items-center gap-2 flex-wrap">
                      {selectedAsset.status && (
                        <AssetStatusBadge status={selectedAsset.status} />
                      )}
                      {selectedAsset.criticality && (
                        <AssetCriticalityBadge
                          criticality={selectedAsset.criticality}
                        />
                      )}
                      {selectedAsset.environment && (
                        <Badge variant="secondary">
                          {selectedAsset.environment}
                        </Badge>
                      )}
                    </DrawerDescription>
                  </div>
                </div>
              </DrawerHeader>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Overview Section */}
                <div className="grid grid-cols-2 gap-4">
                  {/* IP Address */}
                  {selectedAsset.ip_address && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase">
                        IP Address
                      </h3>
                      <p className="text-sm font-mono font-medium">
                        {selectedAsset.ip_address}
                      </p>
                    </div>
                  )}

                  {/* Asset ID */}
                  {selectedAsset.asset_id && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase">
                        Asset ID
                      </h3>
                      <p className="text-sm font-medium">
                        {selectedAsset.asset_id}
                      </p>
                    </div>
                  )}

                  {/* System Type */}
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase flex items-center gap-1">
                      <Server className="h-3 w-3" />
                      System Type
                    </h3>
                    <p className="text-sm font-medium capitalize">
                      {selectedAsset.system_type
                        ?.toLowerCase()
                        .replace("_", " ") || "N/A"}
                    </p>
                  </div>

                  {/* Vulnerability Count */}
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Vulnerabilities
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {selectedAsset.vulnerability_count || 0}
                      </span>
                      {selectedAsset.vulnerability_count &&
                        selectedAsset.vulnerability_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            Active
                          </Badge>
                        )}
                    </div>
                  </div>

                  {/* Owner */}
                  {selectedAsset.owner && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Owner
                      </h3>
                      <p className="text-sm font-medium">
                        {selectedAsset.owner.name || selectedAsset.owner.email}
                      </p>
                    </div>
                  )}

                  {/* Department */}
                  {selectedAsset.department && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase">
                        Department
                      </h3>
                      <p className="text-sm font-medium">
                        {selectedAsset.department}
                      </p>
                    </div>
                  )}

                  {/* Location */}
                  {selectedAsset.location && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Location
                      </h3>
                      <p className="text-sm font-medium">
                        {selectedAsset.location}
                      </p>
                    </div>
                  )}

                  {/* Last Scan Date */}
                  {selectedAsset.last_scan_date && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Last Scan
                      </h3>
                      <p className="text-sm font-medium">
                        {format(
                          new Date(selectedAsset.last_scan_date),
                          "MMM dd, yyyy",
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedAsset.description && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">
                        Description
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedAsset.description}
                      </p>
                    </div>
                  </>
                )}

                {/* Tags */}
                {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <TagIcon className="h-4 w-4" />
                        Tags ({selectedAsset.tags.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedAsset.tags.map((tagObj) => (
                          <Badge key={tagObj.tag} variant="outline">
                            {tagObj.tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Vulnerability Stats */}
                {selectedAsset.vulnerability_stats &&
                  Object.keys(selectedAsset.vulnerability_stats).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Vulnerability Breakdown
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(
                            selectedAsset.vulnerability_stats,
                          ).map(([severity, count]) => (
                            <div
                              key={severity}
                              className="p-3 border rounded-lg bg-muted/30"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium capitalize">
                                  {severity}
                                </span>
                                <Badge variant="outline">{count}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                {/* Metadata */}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold">Created:</span>{" "}
                    {selectedAsset.created_at
                      ? format(
                          new Date(selectedAsset.created_at),
                          "MMM dd, yyyy HH:mm",
                        )
                      : "N/A"}
                  </div>
                  <div>
                    <span className="font-semibold">Updated:</span>{" "}
                    {selectedAsset.updated_at
                      ? format(
                          new Date(selectedAsset.updated_at),
                          "MMM dd, yyyy HH:mm",
                        )
                      : "N/A"}
                  </div>
                </div>
              </div>

              <DrawerFooter className="border-t">
                <div className="flex gap-2 w-full">
                  <Button className="flex-1" asChild>
                    <Link href={`/assets/${selectedAsset.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Details
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/assets/${selectedAsset.id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline">Close</Button>
                  </DrawerClose>
                </div>
              </DrawerFooter>
            </>
          ) : (
            <>
              <DrawerHeader className="border-b">
                <DrawerTitle>No Data</DrawerTitle>
              </DrawerHeader>
              <div className="p-6 flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  Unable to load asset details.
                </p>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
