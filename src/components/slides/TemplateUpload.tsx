"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Check,
  FileImage,
  FileText,
  Loader2,
  Palette,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface TemplateUploadProps {
  onTemplateSelect: (templateId: Id<"designTemplates"> | null) => void;
  selectedTemplateId?: Id<"designTemplates"> | null;
  disabled?: boolean;
}

interface SourceFile {
  storageId: Id<"_storage">;
  name: string;
  mimeType: string;
  type: "pdf" | "pptx" | "image";
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

function getFileType(mimeType: string): "pdf" | "pptx" | "image" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("presentationml")) return "pptx";
  return "image";
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-5 w-5 rounded border"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function TemplateUpload({
  onTemplateSelect,
  selectedTemplateId,
  disabled,
}: TemplateUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<SourceFile[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showNewUpload, setShowNewUpload] = useState(false);

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const generateUploadUrl = useMutation(api.designTemplates.generateUploadUrl);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const createTemplate = useMutation(api.designTemplates.create);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const deleteTemplate = useMutation(api.designTemplates.remove);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const templates = useQuery(api.designTemplates.listByUser, {});

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;
      setUploading(true);

      try {
        const newFiles: SourceFile[] = [];

        for (const file of acceptedFiles) {
          if (file.size > 20 * 1024 * 1024) {
            toast.error(`${file.name} exceeds 20MB limit`);
            continue;
          }

          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          const { storageId } = await result.json();
          newFiles.push({
            storageId,
            name: file.name,
            mimeType: file.type,
            type: getFileType(file.type),
          });
        }

        setPendingFiles((prev) => [...prev, ...newFiles]);
        if (!templateName && newFiles.length > 0) {
          const firstName = newFiles[0].name.replace(/\.[^/.]+$/, "");
          setTemplateName(firstName);
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload file");
      } finally {
        setUploading(false);
      }
    },
    [disabled, generateUploadUrl, templateName],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    disabled: disabled || uploading,
  });

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || pendingFiles.length === 0) {
      toast.error("Please provide a name and upload at least one file");
      return;
    }

    try {
      setUploading(true);
      const templateId = await createTemplate({
        name: templateName.trim(),
        sourceFiles: pendingFiles,
      });

      toast.success("Template uploaded! Analyzing brand...");
      onTemplateSelect(templateId);
      setPendingFiles([]);
      setTemplateName("");
      setShowNewUpload(false);
    } catch (error) {
      console.error("Create template error:", error);
      toast.error("Failed to create template");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: Id<"designTemplates">) => {
    try {
      await deleteTemplate({ templateId });
      if (selectedTemplateId === templateId) {
        onTemplateSelect(null);
      }
      toast.success("Template deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete template");
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Render saved templates list
  const completedTemplates =
    templates?.filter((t) => t.status === "complete") ?? [];
  const processingTemplates =
    templates?.filter(
      (t) => t.status === "processing" || t.status === "pending",
    ) ?? [];

  return (
    <div className="space-y-4">
      {/* Saved Templates */}
      {completedTemplates.length > 0 && !showNewUpload && (
        <div className="space-y-2">
          <Label>Saved Templates</Label>
          <div className="grid gap-2">
            {completedTemplates.map((template) => (
              <div
                key={template._id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",
                  selectedTemplateId === template._id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50",
                )}
                onClick={() =>
                  !disabled &&
                  onTemplateSelect(
                    selectedTemplateId === template._id ? null : template._id,
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{template.name}</p>
                    {template.extractedDesign && (
                      <div className="flex gap-3 mt-1">
                        <ColorSwatch
                          color={template.extractedDesign.colors.primary}
                          label="Primary"
                        />
                        <ColorSwatch
                          color={template.extractedDesign.colors.secondary}
                          label="Secondary"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTemplateId === template._id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template._id);
                    }}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Templates */}
      {processingTemplates.length > 0 && (
        <div className="space-y-2">
          <Label>Processing</Label>
          {processingTemplates.map((template) => (
            <div
              key={template._id}
              className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{template.name}</span>
              <span className="text-xs text-muted-foreground">
                Analyzing brand...
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload New Template */}
      {(showNewUpload || completedTemplates.length === 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {completedTemplates.length > 0
                ? "Upload New Template"
                : "Brand Template"}
            </CardTitle>
            <CardDescription>
              Upload your organization's slide template (PDF, PPTX, or images)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Acme Corp Brand"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={disabled || uploading}
              />
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                (disabled || uploading) && "opacity-50 cursor-not-allowed",
              )}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm">
                    {isDragActive
                      ? "Drop files here"
                      : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, PPTX, PNG, JPG (max 20MB)
                  </p>
                </div>
              )}
            </div>

            {/* Pending files */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files</Label>
                {pendingFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div className="flex items-center gap-2">
                      {file.type === "image" ? (
                        <FileImage className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="text-sm truncate max-w-[200px]">
                        {file.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removePendingFile(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Save button */}
            {pendingFiles.length > 0 && (
              <Button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || uploading || disabled}
                className="w-full"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save & Analyze Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Toggle to show upload when templates exist */}
      {completedTemplates.length > 0 && !showNewUpload && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewUpload(true)}
          disabled={disabled}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload New Template
        </Button>
      )}

      {showNewUpload && completedTemplates.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowNewUpload(false);
            setPendingFiles([]);
            setTemplateName("");
          }}
          className="w-full"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
