import { ExternalLink } from "lucide-react";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the youtubeVideo tool.
 * Displays video thumbnail, URL, and AI analysis.
 */
export function YoutubeVideoRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const videoId = parsedResult?.videoId;
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  return (
    <div className="text-xs space-y-2 border-l-2 border-border/40 pl-3">
      {/* Video info */}
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {thumbnailUrl && state !== "executing" && (
          <a
            href={parsedResult?.url || parsedArgs?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded overflow-hidden hover:opacity-90 transition-opacity"
          >
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="w-24 h-auto rounded"
            />
          </a>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          {/* URL */}
          <div className="flex items-center gap-2">
            <ToolIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <a
              href={parsedResult?.url || parsedArgs?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex items-center gap-1"
            >
              {parsedResult?.url || parsedArgs?.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Question asked */}
          {parsedArgs?.question && (
            <div className="text-muted-foreground text-[11px]">
              <span className="opacity-60">Q:</span> {parsedArgs.question}
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      {parsedResult && state !== "executing" && (
        <div className="space-y-1">
          {parsedResult.success === false ? (
            <div className="text-red-500 text-[11px]">
              {parsedResult.error || "Failed to analyze video"}
            </div>
          ) : (
            parsedResult.answer && (
              <div className="max-h-64 overflow-y-auto text-muted-foreground bg-muted/30 rounded p-2">
                <pre className="whitespace-pre-wrap font-sans text-[11px]">
                  {parsedResult.answer}
                </pre>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
