import { FileCode, FileText } from "lucide-react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import type { Id } from "@/convex/_generated/dataModel";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the createDocument tool.
 * Shows document creation with type-specific icon and toggle link.
 */
export function CreateDocumentRenderer({
  parsedArgs,
  parsedResult,
  state,
}: ToolRendererProps) {
  const { documentId, setDocumentId } = useCanvasContext();
  const Icon = parsedArgs?.documentType === "code" ? FileCode : FileText;

  const resultDocId = parsedResult?.documentId;
  const isOpen = documentId === resultDocId;

  const handleToggle = () => {
    if (isOpen) {
      setDocumentId(null);
    } else if (resultDocId) {
      setDocumentId(resultDocId as Id<"canvasDocuments">);
    }
  };

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          "{parsedArgs?.title}"
        </span>
        {parsedArgs?.language && (
          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">
            {parsedArgs.language}
          </span>
        )}
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground flex items-center gap-2">
          {parsedResult.success ? (
            <>
              <span>Created • {parsedResult.lineCount} lines</span>
              <span className="text-[10px]">•</span>
              <span
                onClick={handleToggle}
                onKeyDown={(e) => e.key === "Enter" && handleToggle()}
                role="button"
                tabIndex={0}
                className="text-primary hover:underline cursor-pointer text-[10px]"
              >
                {isOpen ? "Close" : "Open"}
              </span>
            </>
          ) : (
            <span className="text-destructive">{parsedResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
