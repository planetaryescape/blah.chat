"use client";

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowUpDown,
  Bot,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { USE_DB_MODELS, useAllModels } from "@/lib/models";
import { formatCurrency } from "@/lib/utils/date";

// Lazy load mutations to avoid type depth issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _modelsApi: any = null;
function getModelsApi() {
  if (!_modelsApi) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { api } = require("@blah-chat/backend/convex/_generated/api");
    _modelsApi = api.models;
  }
  return _modelsApi;
}

type ModelRow = Doc<"models">;

function ModelsListSkeleton() {
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

function ModelsPageContent() {
  const router = useRouter();
  const models = useAllModels();

  // @ts-ignore - Type depth exceeded with Convex mutations
  const deprecateMutation = useMutation(getModelsApi().mutations.deprecate);
  // @ts-ignore - Type depth exceeded with Convex mutations
  const reactivateMutation = useMutation(getModelsApi().mutations.reactivate);
  // @ts-ignore - Type depth exceeded with Convex mutations
  const removeMutation = useMutation(getModelsApi().mutations.remove);
  // @ts-ignore - Type depth exceeded with Convex mutations
  const duplicateMutation = useMutation(getModelsApi().mutations.duplicate);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Doc<"models">["_id"] | null>(
    null,
  );
  const [duplicateTarget, setDuplicateTarget] = useState<ModelRow | null>(null);
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeprecate = useCallback(
    async (id: Doc<"models">["_id"]) => {
      try {
        await deprecateMutation({ id });
        toast.success("Model deprecated");
      } catch (error: any) {
        toast.error(error.message || "Failed to deprecate model");
      }
    },
    [deprecateMutation],
  );

  const handleReactivate = useCallback(
    async (id: Doc<"models">["_id"]) => {
      try {
        await reactivateMutation({ id });
        toast.success("Model reactivated");
      } catch (error: any) {
        toast.error(error.message || "Failed to reactivate model");
      }
    },
    [reactivateMutation],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await removeMutation({ id: deleteTarget });
      toast.success("Model deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete model");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, removeMutation]);

  const openDuplicateDialog = useCallback((model: ModelRow) => {
    setDuplicateTarget(model);
    setNewModelId(`${model.modelId}-copy`);
    setNewModelName(`${model.name} (Copy)`);
  }, []);

  const closeDuplicateDialog = useCallback(() => {
    setDuplicateTarget(null);
    setNewModelId("");
    setNewModelName("");
  }, []);

  const executeDuplicate = useCallback(async () => {
    if (!duplicateTarget || !newModelId || !newModelName) return;
    try {
      await duplicateMutation({
        sourceId: duplicateTarget._id,
        newModelId,
        newName: newModelName,
      });
      toast.success("Model duplicated");
      closeDuplicateDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate model");
    }
  }, [
    duplicateTarget,
    newModelId,
    newModelName,
    duplicateMutation,
    closeDuplicateDialog,
  ]);

  const handleExport = useCallback(() => {
    if (!models) return;
    const data = models.map((m) => ({
      modelId: m.modelId,
      provider: m.provider,
      name: m.name,
      description: m.description,
      contextWindow: m.contextWindow,
      inputCost: m.inputCost,
      outputCost: m.outputCost,
      cachedInputCost: m.cachedInputCost,
      reasoningCost: m.reasoningCost,
      capabilities: m.capabilities,
      status: m.status,
      isPro: m.isPro,
      isInternalOnly: m.isInternalOnly,
      isExperimental: m.isExperimental,
      speedTier: m.speedTier,
      gateway: m.gateway,
      hostOrder: m.hostOrder,
      actualModelId: m.actualModelId,
      knowledgeCutoff: m.knowledgeCutoff,
      userFriendlyDescription: m.userFriendlyDescription,
      bestFor: m.bestFor,
      benchmarks: m.benchmarks,
      reasoningConfig: m.reasoningConfig,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `models-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Models exported");
  }, [models]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        toast.info(
          `Parsed ${data.length} models. Import via seed script for now.`,
        );
      } catch (_error: any) {
        toast.error("Invalid JSON file");
      }

      e.target.value = "";
    },
    [],
  );

  // Filter models
  const filteredModels = useMemo(() => {
    if (!models) return [];
    return models.filter((m) => {
      if (providerFilter !== "all" && m.provider !== providerFilter)
        return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      return true;
    });
  }, [models, providerFilter, statusFilter]);

  // Get unique providers
  const providers = useMemo(() => {
    if (!models) return [];
    return [...new Set(models.map((m) => m.provider))].sort();
  }, [models]);

  // Column definitions
  const columns = useMemo<ColumnDef<ModelRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Model
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.name}</span>
              {row.original.isPro && (
                <Badge variant="default" className="text-xs">
                  Pro
                </Badge>
              )}
              {row.original.isExperimental && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Beta
                </Badge>
              )}
              {row.original.isInternalOnly && (
                <Badge variant="outline" className="text-xs">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Internal
                </Badge>
              )}
            </div>
            <code className="text-xs text-muted-foreground">
              {row.original.modelId}
            </code>
          </div>
        ),
      },
      {
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.provider}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value === "all" || row.getValue(id) === value;
        },
      },
      {
        id: "pricing",
        header: "Pricing (per 1M)",
        cell: ({ row }) => (
          <div className="text-sm">
            <div>
              In: {formatCurrency(row.original.inputCost)} / Out:{" "}
              {formatCurrency(row.original.outputCost)}
            </div>
            {row.original.cachedInputCost && (
              <div className="text-xs text-muted-foreground">
                Cached: {formatCurrency(row.original.cachedInputCost)}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "contextWindow",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Context
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span>{(row.original.contextWindow / 1000).toFixed(0)}K</span>
        ),
      },
      {
        accessorKey: "capabilities",
        header: "Capabilities",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.capabilities?.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant={
                status === "active"
                  ? "default"
                  : status === "deprecated"
                    ? "destructive"
                    : "secondary"
              }
            >
              {status === "active" && <Check className="w-3 h-3 mr-1" />}
              {status === "deprecated" && (
                <AlertTriangle className="w-3 h-3 mr-1" />
              )}
              {status}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value === "all" || row.getValue(id) === value;
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(row.original.updatedAt, { addSuffix: true })}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/admin/models/${row.original._id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View/Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(row.original.modelId);
                  toast.success("Model ID copied");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDuplicateDialog(row.original)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.original.status === "active" ? (
                <DropdownMenuItem
                  onClick={() => handleDeprecate(row.original._id)}
                  className="text-orange-600"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Deprecate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleReactivate(row.original._id)}
                  className="text-green-600"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setDeleteTarget(row.original._id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router, handleDeprecate, handleReactivate, openDuplicateDialog],
  );

  const table = useReactTable({
    data: filteredModels,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase();
      const model = row.original;
      return (
        model.name.toLowerCase().includes(searchValue) ||
        model.modelId.toLowerCase().includes(searchValue) ||
        model.provider.toLowerCase().includes(searchValue) ||
        model.description?.toLowerCase().includes(searchValue) ||
        false
      );
    },
  });

  if (!USE_DB_MODELS) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <h2 className="text-lg font-semibold text-yellow-600">
            DB Models Disabled
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set <code>NEXT_PUBLIC_USE_DB_MODELS=true</code> to enable
            database-backed models.
          </p>
        </div>
      </div>
    );
  }

  if (!models) {
    return <ModelsListSkeleton />;
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6" />
            <h1 className="text-2xl font-semibold">Model Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{models.length} models</Badge>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={() => router.push("/admin/models/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Model
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col min-h-0 px-6 pb-0 mt-4">
        <div className="border rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
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
                        router.push(`/admin/models/${row.original._id}`)
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="p-4 align-middle"
                          onClick={
                            cell.column.id === "actions"
                              ? (e) => e.stopPropagation()
                              : undefined
                          }
                        >
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
                      No models found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredModels.length}{" "}
            models
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
          </div>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate model dialog */}
      <Dialog
        open={duplicateTarget !== null}
        onOpenChange={(open) => !open && closeDuplicateDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Model</DialogTitle>
            <DialogDescription>
              Create a copy of {duplicateTarget?.name} with a new ID and name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newModelId">Model ID</Label>
              <Input
                id="newModelId"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                placeholder="e.g., openai:gpt-5-copy"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newModelName">Model Name</Label>
              <Input
                id="newModelName"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="e.g., GPT-5 (Copy)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDuplicateDialog}>
              Cancel
            </Button>
            <Button
              onClick={executeDuplicate}
              disabled={!newModelId || !newModelName}
            >
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminModelsPage() {
  return (
    <Suspense fallback={<ModelsListSkeleton />}>
      <ModelsPageContent />
    </Suspense>
  );
}
