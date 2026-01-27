"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  formatCompactNumber,
  formatCurrency,
  getLastNDays,
} from "@/lib/utils/date";

type UserWithUsage = {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl: string | undefined;
  isAdmin: boolean;
  tier?: "free" | "tier1" | "tier2";
  createdAt: number;
  usage: {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
  };
};

function UsersListSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function UsersPageContent() {
  const router = useRouter();
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateRole = useMutation(api.admin.updateUserRole);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateTier = useMutation(api.admin.updateUserTier);

  // Date range state - fresh last 30 days on each page load
  const [dateRange, setDateRange] = useState(() => getLastNDays(30));

  // Sorting and pagination state (must be before early return)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalSpent", desc: true },
  ]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });

  // Virtualization ref (must be before early return)
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const users = useQuery(api.admin.listUsers);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const usageSummary = useQuery(api.usage.queries.getAllUsersUsageSummary, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Stabilize callback to prevent column recreation
  const handleToggleAdmin = useCallback(
    async (userId: Id<"users">, isAdmin: boolean) => {
      try {
        await updateRole({ userId, isAdmin });
        toast.success(isAdmin ? "Admin role granted" : "Admin role revoked");
      } catch (error: any) {
        toast.error(error.message || "Failed to update role");
      }
    },
    [updateRole],
  );

  const handleUpdateTier = useCallback(
    async (userId: Id<"users">, tier: "free" | "tier1" | "tier2") => {
      try {
        await updateTier({ userId, tier });
        toast.success(`User tier updated to ${tier}`);
      } catch (error: any) {
        toast.error(error.message || "Failed to update tier");
      }
    },
    [updateTier],
  );

  // Merge users with usage data - MUST be memoized to prevent infinite re-renders
  const usersWithUsage = useMemo<UserWithUsage[]>(() => {
    if (!users || !usageSummary) return [];

    const usageByUserId = new Map(
      usageSummary.map((usage: any) => [usage.userId, usage]),
    );

    return users.map((user: any) => ({
      ...user,
      tier: user.tier,
      usage: usageByUserId.get(user._id) || {
        totalCost: 0,
        totalTokens: 0,
        totalRequests: 0,
      },
    }));
  }, [users, usageSummary]);

  // Column definitions - MUST be memoized to prevent infinite re-renders
  const columns = useMemo<ColumnDef<UserWithUsage>[]>(
    () => [
      {
        id: "user",
        accessorFn: (row) => row.name,
        header: "User",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={row.original.imageUrl || undefined}
                alt={row.original.name}
              />
              <AvatarFallback>
                {row.original.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDistanceToNow(row.original.createdAt, { addSuffix: true })}
          </span>
        ),
      },
      {
        id: "totalSpent",
        accessorFn: (row) => row.usage.totalCost,
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="text-right w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total Spent
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {formatCurrency(row.original.usage.totalCost)}
          </div>
        ),
      },
      {
        id: "totalTokens",
        accessorFn: (row) => row.usage.totalTokens,
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="text-right w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total Tokens
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {formatCompactNumber(row.original.usage.totalTokens)}
          </div>
        ),
      },
      {
        id: "admin",
        header: () => <div className="text-right">Admin</div>,
        cell: ({ row }) => (
          <div
            className="flex items-center justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.isAdmin && (
              <Shield className="h-4 w-4 text-primary" />
            )}
            <Switch
              checked={row.original.isAdmin}
              onCheckedChange={(checked) =>
                handleToggleAdmin(row.original._id, checked)
              }
            />
          </div>
        ),
      },
      {
        id: "tier",
        header: () => <div className="text-right">Tier</div>,
        cell: ({ row }) => (
          <div
            className="flex items-center justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value={row.original.tier || "free"}
              onValueChange={(value: "free" | "tier1" | "tier2") =>
                handleUpdateTier(row.original._id, value)
              }
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="tier1">Tier 1</SelectItem>
                <SelectItem value="tier2">Tier 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ),
      },
    ],
    [handleToggleAdmin, handleUpdateTier],
  ); // dependency: only recreate if callbacks change

  // Initialize TanStack Table (must be before conditional return)
  const table = useReactTable({
    data: usersWithUsage,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false, // Client-side pagination for now
  });

  // Virtualization setup (must be before conditional return)
  const rows = table.getRowModel().rows;
  const shouldVirtualize = rows.length > 50;

  // Stabilize estimateSize function to prevent virtualizer recalculations
  const estimateSize = useCallback(() => 73, []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize, // Use stable callback reference
    overscan: 10, // Render 10 rows outside viewport for smooth scrolling
    enabled: shouldVirtualize,
  });

  // Show loading skeleton if data not ready
  if (!users || !usageSummary) {
    return <UsersListSkeleton />;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Fixed Page Header */}
      <div className="flex-shrink-0 px-6 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">User Management</h1>
          </div>
          <Badge variant="secondary">{users.length} users</Badge>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center justify-between">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Scrollable Table with Fixed Headers */}
      <div className="flex-1 flex flex-col min-h-0 px-6 pb-0">
        <div className="border rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
          {shouldVirtualize ? (
            /* Virtualized rendering for 50+ rows */
            <>
              {/* Fixed Headers */}
              <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <div key={headerGroup.id} className="flex">
                    {headerGroup.headers.map((header) => (
                      <div
                        key={header.id}
                        className="flex-1 px-4 py-3 text-sm font-medium"
                        style={{
                          width: header.getSize(),
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Scrollable Body */}
              <div
                ref={tableContainerRef}
                className="flex-1 overflow-auto relative"
              >
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <div
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className="flex cursor-pointer hover:bg-muted/50 border-b absolute left-0 w-full"
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        onClick={() =>
                          router.push(`/admin/users/${row.original._id}`)
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <div
                            key={cell.id}
                            className="flex-1 px-4 py-3"
                            style={{
                              width: cell.column.getSize(),
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Standard table rendering for < 50 rows - raw table for sticky header */
            <div className="flex-1 overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="sticky top-0 bg-background z-10 h-10 px-4 text-left align-middle font-medium text-muted-foreground"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          router.push(`/admin/users/${row.original._id}`)
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="p-4 align-middle">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b">
                      <td
                        colSpan={columns.length}
                        className="h-24 text-center p-4 align-middle"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Pagination Footer */}
      <div className="flex-shrink-0 px-6 pb-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {usersWithUsage.length}{" "}
            users
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
            <select
              value={pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            >
              {[20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<UsersListSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}
