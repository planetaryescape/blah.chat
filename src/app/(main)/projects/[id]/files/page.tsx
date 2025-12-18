"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import {
  FileText,
  ImageIcon,
  Loader2,
  Music,
  Plus,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

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
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export default function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;

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

  return (
    <div className="h-full flex flex-col space-y-8 p-6 overflow-y-auto">
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
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectFiles.map((file: any) => (
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
                      <TableCell className="text-muted-foreground text-xs">
                        {format(file.createdAt, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={async () => {
                            if (
                              confirm("Remove this file from project context?")
                            ) {
                              await removeFileFromProject({
                                projectId,
                                fileId: file.fileId,
                              });
                            }
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
  );
}
