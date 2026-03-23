"use client";

import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ExternalLink,
  File as FileIcon,
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
import { useCallback, useReducer } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { SOURCE_ICONS, STATUS_STYLES } from "@/components/knowledge/constants";
import type { KnowledgeSource, SourceType } from "@/components/knowledge/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useKnowledgeSourceCount,
  useKnowledgeSources,
} from "@/hooks/useKnowledgeSources";

type RequestPayload<T> = {
  data?: T;
  error?: string;
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as RequestPayload<T>;

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

async function uploadKnowledgeSourceFile(file: File) {
  const upload = await requestJson<{
    uploadUrl: string;
    storageId: string;
  }>("/api/v1/files/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });

  const result = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!result.ok) {
    throw new Error("Failed to upload files");
  }

  await requestJson("/api/v1/knowledge/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "file",
      title: file.name,
      storageId: upload.storageId,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });
}

async function createKnowledgeSource(args: {
  addType: SourceType;
  title: string;
  content: string;
  url: string;
}) {
  const { addType, title, content, url } = args;

  if (addType === "text") {
    await requestJson("/api/v1/knowledge/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "text",
        title,
        content,
      }),
    });
    return;
  }

  if (addType === "web") {
    await requestJson("/api/v1/knowledge/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "web",
        title,
        url,
      }),
    });
    return;
  }

  if (addType === "youtube") {
    await requestJson("/api/v1/knowledge/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "youtube",
        title,
        url,
      }),
    });
    return;
  }

  throw new Error("Unsupported type");
}

interface AddSourceDialogState {
  isOpen: boolean;
  addType: SourceType;
  isSubmitting: boolean;
  uploading: boolean;
  title: string;
  content: string;
  url: string;
}

type AddSourceDialogAction =
  | {
      type: "patch";
      patch: Partial<AddSourceDialogState>;
    }
  | {
      type: "resetForm";
    };

const INITIAL_ADD_SOURCE_DIALOG_STATE: AddSourceDialogState = {
  isOpen: false,
  addType: "file",
  isSubmitting: false,
  uploading: false,
  title: "",
  content: "",
  url: "",
};

function addSourceDialogReducer(
  state: AddSourceDialogState,
  action: AddSourceDialogAction,
): AddSourceDialogState {
  if (action.type === "resetForm") {
    return {
      ...state,
      title: "",
      content: "",
      url: "",
    };
  }

  return { ...state, ...action.patch };
}

export function KnowledgeBankSettings() {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: sources, isLoading: sourcesLoading } = useKnowledgeSources();
  const { data: sourceCount, isLoading: countLoading } =
    useKnowledgeSourceCount();
  const allSources = sources ?? [];

  const refreshKnowledgeQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["knowledge-sources", null] }),
      queryClient.invalidateQueries({
        queryKey: ["knowledge-sources-count", null],
      }),
    ]);
  }, [queryClient]);

  const handleDelete = (sourceId: string) => {
    void requestJson(
      `/api/v1/knowledge/sources/${encodeURIComponent(sourceId)}`,
      {
        method: "DELETE",
      },
    )
      .then(() => refreshKnowledgeQueries())
      .then(() => {
        toast.success("Source deleted");
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete",
        );
      });
  };

  const handleReprocess = async (sourceId: string) => {
    try {
      await requestJson(
        `/api/v1/knowledge/sources/${encodeURIComponent(sourceId)}/reprocess`,
        {
          method: "POST",
        },
      );
      await refreshKnowledgeQueries();
      toast.success("Reprocessing started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reprocess",
      );
    }
  };

  // Show loading state while auth is initializing
  if (!isLoaded || countLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Knowledge Bank</h3>
        <p className="text-sm text-muted-foreground">
          Add documents, web pages, and videos for the AI to reference in
          conversations.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{sourceCount ?? 0} / 100 sources</span>
          <span className="text-border">|</span>
          <span>
            {allSources.filter((s) => s.status === "completed").length} indexed
          </span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/knowledge">
            <Search className="h-4 w-4 mr-2" />
            Manage
          </Link>
        </Button>
      </div>

      <KnowledgeBankAddSourceDialog
        userId={userId}
        onAdded={refreshKnowledgeQueries}
      />

      <KnowledgeSourceList
        sources={allSources}
        isLoading={sourcesLoading}
        onDelete={handleDelete}
        onReprocess={handleReprocess}
      />

      <Alert>
        <FileIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Tip:</strong> Knowledge from your bank is automatically
          searched when you ask questions. The AI will cite sources when using
          this information.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function KnowledgeBankAddSourceDialog({
  userId,
  onAdded,
}: {
  userId: string | null | undefined;
  onAdded: () => Promise<void>;
}) {
  const [state, dispatch] = useReducer(
    addSourceDialogReducer,
    INITIAL_ADD_SOURCE_DIALOG_STATE,
  );
  const { addType, content, isOpen, isSubmitting, title, uploading, url } =
    state;

  const setDialogState = (patch: Partial<AddSourceDialogState>) => {
    dispatch({ type: "patch", patch });
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!userId) {
        toast.error("Please wait for authentication to complete");
        return;
      }

      setDialogState({ uploading: true });

      void Promise.all(
        acceptedFiles.map((file) => uploadKnowledgeSourceFile(file)),
      )
        .then(() => onAdded())
        .then(() => {
          toast.success("Files uploaded to knowledge bank");
          setDialogState({ isOpen: false });
        })
        .catch((error) => {
          console.error(error);
          toast.error("Failed to upload files");
        })
        .finally(() => {
          setDialogState({ uploading: false });
        });
    },
    [onAdded, userId],
  );

  const { getInputProps, getRootProps, isDragActive } = useDropzone({ onDrop });

  const handleSubmit = () => {
    if (!userId) {
      toast.error("Please wait for authentication to complete");
      return;
    }

    if (!title.trim()) {
      toast.error("Title required");
      return;
    }

    const trimmedContent = content.trim();
    const trimmedUrl = url.trim();

    if (addType === "text" && !trimmedContent) {
      toast.error("Content required");
      return;
    }

    if ((addType === "web" || addType === "youtube") && !trimmedUrl) {
      toast.error(
        addType === "youtube" ? "YouTube URL required" : "URL required",
      );
      return;
    }

    setDialogState({ isSubmitting: true });

    void createKnowledgeSource({
      addType,
      title,
      content: trimmedContent,
      url: trimmedUrl,
    })
      .then(() => onAdded())
      .then(() => {
        toast.success("Source added. Processing will begin shortly.");
        dispatch({ type: "resetForm" });
        setDialogState({ isOpen: false });
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to add source",
        );
      })
      .finally(() => {
        setDialogState({ isSubmitting: false });
      });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => setDialogState({ isOpen: open })}
    >
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
          onValueChange={(value) =>
            setDialogState({ addType: value as SourceType })
          }
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
                  onChange={(event) =>
                    setDialogState({ title: event.target.value })
                  }
                />
              </div>
            )}

            <TabsContent value="text" className="mt-0 space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Paste your text here..."
                className="min-h-[200px] max-h-[300px] overflow-y-auto resize-none"
                value={content}
                onChange={(event) =>
                  setDialogState({ content: event.target.value })
                }
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
                onChange={(event) =>
                  setDialogState({ url: event.target.value })
                }
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
                onChange={(event) =>
                  setDialogState({ url: event.target.value })
                }
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
              onClick={() => setDialogState({ isOpen: false })}
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
  );
}

function KnowledgeSourceList({
  sources,
  isLoading,
  onDelete,
  onReprocess,
}: {
  sources: KnowledgeSource[];
  isLoading: boolean;
  onDelete: (sourceId: string) => void;
  onReprocess: (sourceId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertDescription>
          No sources yet. Add documents, web pages, or videos for the AI to
          reference.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <KnowledgeSourceRow
          key={source._id}
          source={source}
          onDelete={onDelete}
          onReprocess={onReprocess}
        />
      ))}
    </div>
  );
}

function KnowledgeSourceRow({
  source,
  onDelete,
  onReprocess,
}: {
  source: KnowledgeSource;
  onDelete: (sourceId: string) => void;
  onReprocess: (sourceId: string) => void;
}) {
  const Icon = SOURCE_ICONS[source.type];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{source.title}</span>
          <Badge variant="secondary" className={STATUS_STYLES[source.status]}>
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
          <p className="mt-1 text-xs text-destructive">{source.error}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {source.status === "failed" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onReprocess(source._id)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(source._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
