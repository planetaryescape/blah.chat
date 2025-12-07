"use client";

import { ExternalLink } from "lucide-react";

interface Source {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  snippet?: string;
}

interface SourceListProps {
  sources: Source[];
}

export function SourceList({ sources }: SourceListProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-medium opacity-60">Sources</div>
      <div className="grid gap-2">
        {sources.map((source) => {
          let domain: string;
          try {
            domain = new URL(source.url).hostname;
          } catch {
            domain = source.url;
          }

          return (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent transition-colors group"
            >
              <span className="text-xs font-mono opacity-60 flex-shrink-0">
                [{source.id}]
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm line-clamp-1 group-hover:underline">
                  {source.title}
                </div>
                {source.snippet && (
                  <div className="text-xs opacity-60 line-clamp-2 mt-1">
                    {source.snippet}
                  </div>
                )}
                <div className="text-xs opacity-40 mt-1">{domain}</div>
              </div>
              <ExternalLink className="w-3 h-3 opacity-40 flex-shrink-0 mt-0.5" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
