"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import {
  parseImportFile,
  validateImportFile,
  type ImportData,
} from "@/lib/import";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const importConversations = useMutation(api.import.importConversations);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setImportData(null);
    setFile(selectedFile);

    // Validate file
    const validation = validateImportFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setIsProcessing(true);

    try {
      // Read file content
      const content = await selectedFile.text();

      // Parse file
      const result = parseImportFile(content);

      if (!result.success) {
        setError(result.error || "Failed to parse file");
        return;
      }

      setImportData(result.data!);
      toast.success(
        `Found ${result.conversationsCount} conversations with ${result.messagesCount} messages`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process file",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    setIsProcessing(true);

    try {
      const result = await importConversations({
        conversations: importData.conversations,
      });

      if (!result.success) {
        throw new Error(result.error || "Import failed");
      }

      toast.success(
        `Successfully imported ${result.importedCount} conversations`,
      );

      // Navigate to first imported conversation
      if (result.conversationIds.length > 0) {
        router.push(`/chat/${result.conversationIds[0]}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to import conversations",
      );
      setError(
        err instanceof Error ? err.message : "Failed to import conversations",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Import Conversations</h1>
          <p className="text-muted-foreground mt-2">
            Import your conversations from blah.chat JSON exports, Markdown files, or ChatGPT exports
          </p>
        </div>

        {/* File Upload Card */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Select File</h2>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8">
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">
                      {file ? file.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      JSON, Markdown, or Text files (max 10MB)
                    </p>
                  </div>
                  <Button type="button" variant="outline">
                    Choose File
                  </Button>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".json,.md,.txt"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/90 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Preview Card */}
        {importData && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-lg">Import Preview</h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Format Detected</p>
                    <p className="text-sm text-muted-foreground">
                      {importData.format === "json"
                        ? "blah.chat JSON Export"
                        : importData.format === "chatgpt"
                          ? "ChatGPT Export"
                          : "Markdown"}
                    </p>
                  </div>
                  <Badge variant="outline">{importData.format}</Badge>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Conversations to Import</p>
                  <p className="text-2xl font-bold mt-1">
                    {importData.conversations.length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total messages:{" "}
                    {importData.conversations.reduce(
                      (sum, conv) => sum + conv.messages.length,
                      0,
                    )}
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importData.conversations.map((conv, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-border rounded-lg"
                    >
                      <p className="font-medium text-sm">{conv.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {conv.messages.length} messages
                        {conv.model && ` · ${conv.model}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Conversations"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setImportData(null);
                    setError(null);
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Help Text */}
        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold mb-3">Supported Formats</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                <strong>blah.chat JSON:</strong> Full export from Settings →
                Export
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                <strong>ChatGPT:</strong> Export from ChatGPT settings
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                <strong>Markdown:</strong> Plain text conversation exports
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
