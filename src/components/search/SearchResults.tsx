"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Bot, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";

interface SearchResultsProps {
  results: Array<{
    _id: Id<"messages">;
    conversationId: Id<"conversations">;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: number;
  }>;
  isLoading: boolean;
  query: string;
}

export function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Searching...
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Enter a search query to find messages
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No results found for "{query}"</p>
        <p className="text-sm text-muted-foreground">
          Try different keywords or enable hybrid search in settings for semantic matching
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Found {results.length} result{results.length === 1 ? "" : "s"}
      </p>

      {results.map((result) => (
        <SearchResultCard key={result._id} message={result} query={query} />
      ))}
    </div>
  );
}

function SearchResultCard({
  message,
  query,
}: {
  message: SearchResultsProps["results"][0];
  query: string;
}) {
  const conversation = useQuery(api.conversations.get, {
    conversationId: message.conversationId,
  });

  // Highlight query terms in content (sanitized)
  const highlightedContent = highlightText(message.content, query);

  return (
    <Link href={`/chat/${message.conversationId}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4" />
                {conversation?.title || "Untitled Conversation"}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {message.role === "user" ? (
                  <User className="w-3 h-3" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
                <span className="capitalize">{message.role}</span>
                <span>•</span>
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(message.createdAt, { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p
            className="text-sm line-clamp-3"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </CardContent>
      </Card>
    </Link>
  );
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return DOMPurify.sanitize(text);

  const terms = query.trim().split(/\s+/);
  let highlighted = text;

  terms.forEach((term) => {
    if (term.length < 2) return; // Skip single chars
    const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
    highlighted = highlighted.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>'
    );
  });

  // Sanitize to prevent XSS while allowing mark tags
  return DOMPurify.sanitize(highlighted, {
    ALLOWED_TAGS: ["mark"],
    ALLOWED_ATTR: ["class"],
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
