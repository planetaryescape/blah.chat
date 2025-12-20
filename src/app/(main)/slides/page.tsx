"use client";

import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
    ArrowUpDown,
    Clock,
    DollarSign,
    LayoutGrid,
    List,
    Loader2,
    MoreHorizontal,
    Plus,
    Presentation,
    Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
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
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useUserPreference } from "@/hooks/useUserPreference";

const statusLabels: Record<string, { label: string; color: string }> = {
  outline_pending: { label: "Pending", color: "text-muted-foreground" },
  outline_generating: { label: "Generating outline", color: "text-amber-500" },
  outline_complete: { label: "Outline ready", color: "text-blue-500" },
  design_generating: { label: "Creating design", color: "text-amber-500" },
  design_complete: { label: "Design ready", color: "text-blue-500" },
  slides_generating: { label: "Generating slides", color: "text-amber-500" },
  slides_complete: { label: "Complete", color: "text-green-500" },
  error: { label: "Error", color: "text-destructive" },
};

type ViewMode = "grid" | "list";

export default function SlidesPage() {
  const router = useRouter();
  const { showSlides, isLoading } = useFeatureToggles();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isClient, setIsClient] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"presentations"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const deletePresentation = useMutation(api.presentations.deletePresentation);

  // Initialize view preference from localStorage on client mount
  useEffect(() => {
    setIsClient(true);
    const savedMode = localStorage.getItem("slides-view-mode") as ViewMode;
    if (savedMode) {
      setViewMode(savedMode);
    }
  }, []);

  const handleViewModeChange = (mode: string) => {
    const newMode = mode as ViewMode;
    setViewMode(newMode);
    localStorage.setItem("slides-view-mode", newMode);
  };

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentations = useQuery(api.presentations.listByUserWithStats, {});
  const showStats = useUserPreference("showSlideStatistics");

  // Define type for presentation with stats
  type PresentationWithStats = Doc<"presentations"> & {
    stats: { totalCost: number; totalInputTokens: number; totalOutputTokens: number };
    statusLabel?: any;
  };

  const columns = useMemo<ColumnDef<PresentationWithStats>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              className="-ml-4 h-8 data-[state=open]:bg-accent"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              <span>Title</span>
              {column.getIsSorted() === "desc" ? (
                <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium text-base">{row.getValue("title")}</div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.statusLabel;
          return (
            <div className={`flex items-center gap-2 text-sm ${status.color}`}>
              {status.label}
            </div>
          );
        },
      },
      {
        accessorKey: "totalSlides",
        header: ({ column }) => (
          <div className="text-right">Slides</div>
        ),
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground">
            {row.getValue("totalSlides") || "-"}
          </div>
        ),
      },
      {
        accessorKey: "imageModel",
        header: () => <div className="text-center">Model</div>,
        cell: ({ row }) => {
          const model = row.original.imageModel;
          if (!model || !showStats) return null;
          return (
            <div className="text-center text-xs text-muted-foreground truncate max-w-[100px]" title={model}>
              {model.replace(/^google:/, "").replace(/-/g, " ")}
            </div>
          );
        },
      },
      {
        accessorKey: "stats.totalCost",
        header: () => <div className="text-right">Cost</div>,
        cell: ({ row }) => {
          const cost = row.original.stats?.totalCost;
          if (!cost || cost === 0 || !showStats) return <div className="text-right text-muted-foreground">-</div>;
          return (
            <div className="text-right font-mono text-xs">
              ${cost.toFixed(4)}
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => {
          return (
            <div className="text-right">
              <Button
                variant="ghost"
                className="-mr-4 h-8 data-[state=open]:bg-accent"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
              >
                <span>Created</span>
                {column.getIsSorted() === "desc" ? (
                  <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>
          );
        },
        cell: ({ row }) => {
          return (
            <div className="text-right text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(row.getValue("createdAt"), {
                addSuffix: true,
              })}
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const presentation = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(presentation._id);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    []
  );

  const tableData = useMemo(() => {
    if (!presentations) return [];
    return presentations.map((p: any) => ({
      ...p,
      statusLabel: statusLabels[p.status] || {
        label: p.status,
        color: "text-muted-foreground",
      },
    }));
  }, [presentations]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Show loading while preferences are being fetched
  if (isLoading) {
    return <FeatureLoadingScreen />;
  }

  if (!showSlides) {
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;
  }

  const handleRowClick = (presentation: any) => {
    const href =
      presentation.status === "slides_complete"
        ? `/slides/${presentation._id}/preview`
        : `/slides/${presentation._id}/outline`;
    router.push(href);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deletePresentation({ presentationId: deleteId });
      toast.success("Presentation deleted");
    } catch (error) {
      console.error("Failed to delete presentation:", error);
      toast.error("Failed to delete presentation");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Slides</h1>
          <p className="mt-1 text-muted-foreground">
            Create AI-powered presentations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isClient && (
            <Tabs
              value={viewMode}
              onValueChange={handleViewModeChange}
              className="mr-2"
            >
              <TabsList>
                <TabsTrigger value="grid">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <Button onClick={() => router.push("/slides/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Presentation
          </Button>
        </div>
      </div>

      {presentations === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : presentations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Presentation className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No presentations yet</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Create your first AI-powered presentation
            </p>
            <Button onClick={() => router.push("/slides/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Presentation
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presentations.map((presentation: any) => {
            const status = statusLabels[presentation.status] || {
              label: presentation.status,
              color: "text-muted-foreground",
            };

            return (
              <Card
                key={presentation._id}
                className="cursor-pointer transition-shadow hover:shadow-md group"
                onClick={() => handleRowClick(presentation)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Presentation className="h-5 w-5 text-primary" />
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(presentation._id);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardTitle className="line-clamp-1 text-lg">
                    {presentation.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(presentation.createdAt, {
                        addSuffix: true,
                      })}
                    </div>
                    {presentation.totalSlides > 0 && (
                      <div>{presentation.totalSlides} slides</div>
                    )}
                  </div>
                  {/* Stats row - only show if preference enabled and has cost data */}
                  {showStats && presentation.stats?.totalCost > 0 && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t text-xs text-muted-foreground">
                      {presentation.imageModel && (
                        <span className="truncate max-w-[100px]" title={presentation.imageModel}>
                          {presentation.imageModel.replace(/^google:/, "").replace(/-/g, " ")}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 ml-auto">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-mono">{presentation.stats.totalCost.toFixed(4)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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
                    No presentations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {(table.getCanPreviousPage() || table.getCanNextPage()) && (
             <div className="flex items-center justify-end space-x-2 py-4 px-4 border-t">
               <div className="flex-1 text-sm text-muted-foreground">
                 {table.getFilteredRowModel().rows.length} presentation(s)
               </div>
               <div className="space-x-2">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => table.previousPage()}
                   disabled={!table.getCanPreviousPage()}
                 >
                   Previous
                 </Button>
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
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Presentation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this presentation and all its slides.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
