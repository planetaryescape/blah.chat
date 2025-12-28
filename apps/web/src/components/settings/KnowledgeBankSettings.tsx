"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  ExternalLink,
  File,
  FileText,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SourceType = "file" | "text" | "web" | "youtube";

interface KnowledgeSource {
  _id: Id<"knowledgeSources">;
  title: string;
  type: SourceType;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  chunkCount?: number;
  url?: string;
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

export function KnowledgeBankSettings() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<SourceType>("file");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");

  // Queries
  // @ts-ignore - Type depth exceeded
  const sources = useQuery(api.knowledgeBank.index.list, {}) as
    | KnowledgeSource[]
    | undefined;
  // @ts-ignore - Type depth exceeded
  const sourceCount = useQuery(api.knowledgeBank.index.getSourceCount, {});

  // Mutations
  // @ts-ignore - Type depth exceeded
  const generateUploadUrl = useMutation(
    api.knowledgeBank.index.generateUploadUrl,
  );
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

  // File upload handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!isAuthenticated) {
        toast.error("Please wait for authentication to complete");
        return;
      }
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
          });
        }
        toast.success("Files uploaded to knowledge bank");
        setIsAddDialogOpen(false);
      } catch (error) {
        console.error(error);
        toast.error("Failed to upload files");
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, createFileSource, isAuthenticated],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setUrl("");
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("Please wait for authentication to complete");
      return;
    }
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
          await createTextSource({ title, content });
          break;

        case "web":
          if (!url.trim()) {
            toast.error("URL required");
            return;
          }
          await createWebSource({ url, title });
          break;

        case "youtube":
          if (!url.trim()) {
            toast.error("YouTube URL required");
            return;
          }
          await createYouTubeSource({ url, title });
          break;

        default:
          toast.error("Unsupported type");
          return;
      }

      toast.success("Source added. Processing will begin shortly.");
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

  const handleDelete = async (sourceId: Id<"knowledgeSources">) => {
    try {
      await removeSource({ sourceId });
      toast.success("Source deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const handleReprocess = async (sourceId: Id<"knowledgeSources">) => {
    try {
      await reprocessSource({ sourceId });
      toast.success("Reprocessing started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reprocess",
      );
    }
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Knowledge Bank</h3>
        <p className="text-sm text-muted-foreground">
          Add documents, web pages, and videos for the AI to reference in
          conversations.
        </p>
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{sourceCount ?? 0} / 100 sources</span>
          <span className="text-border">|</span>
          <span>
            {sources?.filter((s) => s.status === "completed").length ?? 0}{" "}
            indexed
          </span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/knowledge">
            <Search className="h-4 w-4 mr-2" />
            Explore
          </Link>
        </Button>
      </div>

      {/* Add Source Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Knowledge Bank</DialogTitle>
            <DialogDescription>
              Add content for the AI to reference in your conversations.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={addType}
            onValueChange={(v) => setAddType(v as SourceType)}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="file">
                <Upload className="h-4 w-4 mr-2" />
                File
              </TabsTrigger>
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
              <TabsContent value="file" className="mt-0">
                <div
                  {...getRootProps()}
                  className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-muted-foreground mb-4 animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Uploading...
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium">
                        Drag & drop files here, or click to select
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, TXT, MD, DOCX (Max 50MB)
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>

              {addType !== "file" && (
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Give this content a name"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              )}

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

          {addType !== "file" && (
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
          )}
        </DialogContent>
      </Dialog>

      {/* Sources List */}
      <div className="space-y-3">
        {sources === undefined ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sources.length === 0 ? (
          <Alert>
            <BookOpen className="h-4 w-4" />
            <AlertDescription>
              No sources yet. Add documents, web pages, or videos for the AI to
              reference.
            </AlertDescription>
          </Alert>
        ) : (
          sources.map((source) => {
            const Icon = SOURCE_ICONS[source.type];
            return (
              <div
                key={source._id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{source.title}</span>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[source.status]}
                    >
                      {source.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="capitalize">{source.type}</span>
                    {source.chunkCount && (
                      <>
                        <span>·</span>
                        <span>{source.chunkCount} chunks</span>
                      </>
                    )}
                    {source.url && (
                      <>
                        <span>·</span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      </>
                    )}
                  </div>
                  {source.error && (
                    <p className="mt-1 text-xs text-destructive">
                      {source.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {source.status === "failed" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleReprocess(source._id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(source._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info */}
      <Alert>
        <File className="h-4 w-4" />
        <AlertDescription>
          <strong>Tip:</strong> Knowledge from your bank is automatically
          searched when you ask questions. The AI will cite sources when using
          this information.
        </AlertDescription>
      </Alert>
    </div>
  );
}
