"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  Loader2,
  Music,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SourceType = "file" | "text" | "web" | "youtube";

interface KnowledgeSource {
  _id: Id<"knowledgeSources">;
  title: string;
  type: SourceType;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  chunkCount?: number;
  url?: string;
  mimeType?: string;
  size?: number;
  createdAt: number;
}

const SOURCE_ICONS = {
  file: FileText,
  text: BookOpen,
  web: Globe,
  youtube: Youtube,
};

const STATUS_COLORS = {
  pending: "bg-yellow-500/10 text-yellow-500",
  processing: "bg-blue-500/10 text-blue-500",
  completed: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
};

function StatusBadge({
  status,
  chunkCount,
}: {
  status: "pending" | "processing" | "completed" | "failed";
  chunkCount?: number;
}) {
  const tooltipText = {
    pending: "Waiting to be processed",
    processing: "Extracting and generating embeddings",
    completed: chunkCount ? `${chunkCount} chunks indexed` : "Indexed",
    failed: "Processing failed",
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="secondary" className={STATUS_COLORS[status]}>
          {status === "processing" && (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          )}
          {status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
          {status === "failed" && <AlertCircle className="w-3 h-3 mr-1" />}
          {status}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{tooltipText[status]}</TooltipContent>
    </Tooltip>
  );
}

export default function ProjectKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<SourceType>("file");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<KnowledgeSource | null>(
    null,
  );

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");

  // Queries
  // @ts-ignore - Type depth exceeded
  const sources = useQuery(api.knowledgeBank.index.list, {
    projectId,
  }) as KnowledgeSource[] | undefined;

  // @ts-ignore - Type depth exceeded
  const attachments = useQuery(api.projects.getProjectAttachments, {
    projectId,
    paginationOpts: { numItems: 50, cursor: null },
  });

  // Mutations
  // @ts-ignore - Type depth exceeded
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  // @ts-ignore - Type depth exceeded
  const createFileSource = useMutation(
    api.knowledgeBank.index.createFileSource,
  );
  // @ts-ignore - Type depth exceeded
  const createTextSource = useMutation(
    api.knowledgeBank.index.createTextSource,
  );
  // @ts-ignore - Type depth exceeded
  const createWebSource = useMutation(api.knowledgeBank.index.createWebSource);
  // @ts-ignore - Type depth exceeded
  const createYouTubeSource = useMutation(
    api.knowledgeBank.index.createYouTubeSource,
  );
  // @ts-ignore - Type depth exceeded
  const removeSource = useMutation(api.knowledgeBank.index.remove);
  // @ts-ignore - Type depth exceeded
  const reprocessSource = useMutation(api.knowledgeBank.index.reprocess);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setUrl("");
  };

  // File upload via dropzone
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

          await createFileSource({
            title: file.name,
            storageId,
            mimeType: file.type,
            size: file.size,
            projectId,
          });
        }
        toast.success("Files uploaded to knowledge bank");
      } catch (error) {
        console.error(error);
        toast.error("Failed to upload files");
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, createFileSource, projectId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // Handle form submission for text/web/youtube
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }

    setIsSubmitting(true);

    try {
      switch (addType) {
        case "text":
          if (!content.trim()) {
            toast.error("Content required");
            return;
          }
          await createTextSource({ title, content, projectId });
          break;

        case "web":
          if (!url.trim()) {
            toast.error("URL required");
            return;
          }
          await createWebSource({ url, title, projectId });
          break;

        case "youtube":
          if (!url.trim()) {
            toast.error("YouTube URL required");
            return;
          }
          await createYouTubeSource({ url, title, projectId });
          break;

        default:
          toast.error("Unsupported type");
          return;
      }

      toast.success("Source added to knowledge bank");
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add source",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!sourceToDelete) return;
    try {
      await removeSource({ sourceId: sourceToDelete._id });
      toast.success("Source deleted");
      setSourceToDelete(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleReprocess = async (sourceId: Id<"knowledgeSources">) => {
    try {
      await reprocessSource({ sourceId });
      toast.success("Reprocessing started");
    } catch {
      toast.error("Failed to reprocess");
    }
  };

  // Helpers
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="w-4 h-4 text-gray-500" />;
    if (mimeType.startsWith("image/"))
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (mimeType.startsWith("audio/"))
      return <Music className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const conversationAttachments = attachments?.page || [];

  return (
    <div className="h-full flex flex-col space-y-8 p-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Knowledge Bank
        </h2>
        <p className="text-muted-foreground">
          Add documents, web pages, and videos as context for project
          conversations.
        </p>
      </div>

      {/* Main Knowledge Bank Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Project Knowledge</CardTitle>
            <CardDescription>
              Content here is searchable by the AI in all project conversations.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* File upload button */}
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Button variant="outline" size="sm" disabled={uploading}>
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload File
              </Button>
            </div>

            {/* Add other source types */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add to Knowledge Bank</DialogTitle>
                  <DialogDescription>
                    Add content for the AI to reference in project
                    conversations.
                  </DialogDescription>
                </DialogHeader>

                <Tabs
                  value={addType}
                  onValueChange={(v) => setAddType(v as SourceType)}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="text">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Text
                    </TabsTrigger>
                    <TabsTrigger value="web">
                      <Globe className="h-4 w-4 mr-2" />
                      Web
                    </TabsTrigger>
                    <TabsTrigger value="youtube">
                      <Youtube className="h-4 w-4 mr-2" />
                      YouTube
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Give this content a name"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <TabsContent value="text" className="mt-0 space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        placeholder="Paste your text here..."
                        className="min-h-[200px]"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {content.length.toLocaleString()} / 100,000 characters
                      </p>
                    </TabsContent>

                    <TabsContent value="web" className="mt-0 space-y-2">
                      <Label htmlFor="web-url">Web URL</Label>
                      <Input
                        id="web-url"
                        type="url"
                        placeholder="https://example.com/article"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        The page content will be extracted and indexed.
                      </p>
                    </TabsContent>

                    <TabsContent value="youtube" className="mt-0 space-y-2">
                      <Label htmlFor="yt-url">YouTube URL</Label>
                      <Input
                        id="yt-url"
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        The video transcript will be extracted and indexed.
                      </p>
                    </TabsContent>
                  </div>
                </Tabs>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add Source
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

          {sources === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sources.length === 0 && !uploading ? (
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
                Drag & drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Or use &quot;Add Source&quot; for text, web pages, or YouTube
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((source) => {
                    const Icon = SOURCE_ICONS[source.type];
                    return (
                      <TableRow key={source._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {source.type === "file" ? (
                              getFileIcon(source.mimeType)
                            ) : (
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="truncate max-w-[250px]">
                              {source.title}
                            </span>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {source.type}
                          {source.size && (
                            <span className="ml-2">
                              ({formatSize(source.size)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={source.status}
                            chunkCount={source.chunkCount}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(source.createdAt, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {source.status === "failed" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleReprocess(source._id)}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reprocess</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setSourceToDelete(source)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Attachments (kept from original) */}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!sourceToDelete}
        onOpenChange={(open) => !open && setSourceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete knowledge source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{sourceToDelete?.title}&quot;
              and all its indexed content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
