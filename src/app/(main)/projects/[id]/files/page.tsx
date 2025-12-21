"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  Music,
  Plus,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { FileDetailPanel } from "@/components/files/FileDetailPanel";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

// Embedding status badge component
function EmbeddingStatusBadge({
  status,
  chunkCount,
}: {
  status?: "pending" | "processing" | "completed" | "failed";
  chunkCount?: number;
}) {
  if (!status) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
            —
          </span>
        </TooltipTrigger>
        <TooltipContent>Not processed</TooltipContent>
      </Tooltip>
    );
  }

  switch (status) {
    case "pending":
      return (
        <Tooltip>
          <TooltipTrigger>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <Loader2 className="w-2.5 h-2.5" />
              Pending
            </span>
          </TooltipTrigger>
          <TooltipContent>Waiting to be processed</TooltipContent>
        </Tooltip>
      );
    case "processing":
      return (
        <Tooltip>
          <TooltipTrigger>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Processing
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Extracting text and generating embeddings
          </TooltipContent>
        </Tooltip>
      );
    case "completed":
      return (
        <Tooltip>
          <TooltipTrigger>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Ready
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {chunkCount
              ? `${chunkCount} chunks indexed`
              : "Indexed and searchable"}
          </TooltipContent>
        </Tooltip>
      );
    case "failed":
      return (
        <Tooltip>
          <TooltipTrigger>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertCircle className="w-2.5 h-2.5" />
              Failed
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Processing failed - file may not be searchable
          </TooltipContent>
        </Tooltip>
      );
  }
}

export default function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;

  // URL-persisted file selection (supports deep linking from search results)
  const [fileParam, setFileParam] = useQueryState(
    "file",
    parseAsString.withDefault(""),
  );
  const [chunkParam, setChunkParam] = useQueryState(
    "chunk",
    parseAsString.withDefault(""),
  );

  // Derive selected IDs from URL params
  const selectedFileId = useMemo(() => {
    return fileParam ? (fileParam as Id<"files">) : null;
  }, [fileParam]);

  const highlightChunkId = useMemo(() => {
    return chunkParam ? (chunkParam as Id<"fileChunks">) : null;
  }, [chunkParam]);

  const setSelectedFileId = useCallback(
    (id: Id<"files"> | null) => {
      setFileParam(id || "");
      // Clear chunk highlight when changing files
      if (!id) setChunkParam("");
    },
    [setFileParam, setChunkParam],
  );

  // Data Fetching
  // @ts-ignore - Type depth exceeded
  const resources = useQuery(api.projects.getProjectResources, { projectId });
  // @ts-ignore - Type depth exceeded
  const attachments = useQuery(api.projects.getProjectAttachments, {
    projectId,
    paginationOpts: { numItems: 50, cursor: null },
  });

  // Mutations
  // @ts-ignore - Type depth exceeded
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  // @ts-ignore - Type depth exceeded
  const saveFile = useMutation(api.files.saveFile);
  // @ts-ignore - Type depth exceeded
  const addFileToProject = useMutation(api.projects.addFileToProject);
  // @ts-ignore - Type depth exceeded
  const _deleteFile = useMutation(api.files.deleteFile);
  // @ts-ignore - Type depth exceeded
  const removeFileFromProject = useMutation(api.projects.removeFileFromProject);

  const [uploading, setUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    id: Id<"files">;
    name: string;
  } | null>(null);

  // File Upload Logic
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          const { storageId } = await result.json();

          const fileId = await saveFile({
            storageId,
            name: file.name,
            mimeType: file.type,
            size: file.size,
          });

          await addFileToProject({ projectId, fileId });
        }
        toast.success("Files uploaded to project context");
      } catch (error) {
        console.error(error);
        toast.error("Failed to upload files");
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, saveFile, addFileToProject, projectId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // Helpers
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (mimeType.startsWith("audio/"))
      return <Music className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const projectFiles = resources?.files || [];
  const conversationAttachments = attachments?.page || [];

  // Validate selected file exists in project
  const selectedFileExists = useMemo(() => {
    if (!selectedFileId || !projectFiles.length) return false;
    return projectFiles.some((f: any) => f._id === selectedFileId);
  }, [selectedFileId, projectFiles]);

  // Clear invalid selection from URL
  useEffect(() => {
    if (selectedFileId && projectFiles.length > 0 && !selectedFileExists) {
      setFileParam(null);
      setChunkParam(null);
    }
  }, [
    selectedFileId,
    projectFiles,
    selectedFileExists,
    setFileParam,
    setChunkParam,
  ]);

  return (
    <div className="h-full flex">
      {/* Main content - Files list */}
      <div
        className={cn(
          "flex-1 flex flex-col space-y-8 p-6 overflow-y-auto transition-all",
          selectedFileId && "max-w-[60%]",
        )}
      >
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Files</h2>
          <p className="text-muted-foreground">
            Manage project context and view attachments from conversations.
          </p>
        </div>

        {/* Section 1: Project Context Files */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Project Context</CardTitle>
              <CardDescription>
                Files uploaded here are available as context for all project
                conversations.
              </CardDescription>
            </div>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Button disabled={uploading} size="sm">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add File
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {uploading && (
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Uploading...
                </span>
              </div>
            )}

            {projectFiles.length === 0 && !uploading ? (
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">
                  Drag & drop context files here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, TXT, MD, Images (Max 10MB)
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectFiles.map((file: any) => (
                      <TableRow
                        key={file._id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedFileId === file._id &&
                            "bg-primary/10 hover:bg-primary/15",
                        )}
                        onClick={() => setSelectedFileId(file._id)}
                      >
                        <TableCell className="font-medium flex items-center gap-2">
                          {getFileIcon(file.mimeType)}
                          {file.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {file.mimeType}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatSize(file.size)}
                        </TableCell>
                        <TableCell>
                          <EmbeddingStatusBadge
                            status={file.embeddingStatus}
                            chunkCount={file.chunkCount}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(file.createdAt, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row selection
                              setFileToDelete({
                                id: file._id,
                                name: file.name,
                              });
                            }}
                          >
                            <span className="sr-only">Remove</span>
                            &times;
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Conversation Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversation Attachments</CardTitle>
            <CardDescription>
              Files attached to conversations linked to this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {conversationAttachments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic text-sm">
                No attachments found in linked conversations.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Conversation</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversationAttachments.map((file: any) => (
                      <TableRow key={file._id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {getFileIcon(file.mimeType)}
                          {file.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {file.mimeType}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatSize(file.size)}
                        </TableCell>
                        <TableCell>
                          {file.conversationId && (
                            <Link
                              href={`/chat/${file.conversationId}`}
                              className="text-xs text-primary hover:underline"
                            >
                              View Chat
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(file.createdAt, "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File Detail Panel - slides in from right */}
      {selectedFileId && (
        <div className="w-[40%] min-w-[350px] h-full overflow-hidden">
          <FileDetailPanel
            fileId={selectedFileId}
            highlightChunkId={highlightChunkId}
            onClose={() => setSelectedFileId(null)}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove file from project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium">{fileToDelete?.name}</span> from the
              project context. The file will no longer be available for AI
              conversations in this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (fileToDelete) {
                  await removeFileFromProject({
                    projectId,
                    fileId: fileToDelete.id,
                  });
                  toast.success("File removed from project");
                  setFileToDelete(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
