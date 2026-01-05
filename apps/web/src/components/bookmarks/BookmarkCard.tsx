"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import removeMarkdown from "remove-markdown";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface BookmarkCardProps {
  bookmark: Doc<"bookmarks"> & {
    message: Doc<"messages"> | null;
    conversation: Doc<"conversations"> | null;
  };
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const router = useRouter();
  // @ts-ignore - Type depth exceeded with complex Convex query
  const removeBookmark = useMutation(api.bookmarks.remove);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeBookmark({ bookmarkId: bookmark._id });
      toast.success("Bookmark removed");
    } catch (_error) {
      toast.error("Failed to remove bookmark");
    }
  };

  const handleNavigate = () => {
    if (bookmark.conversation) {
      router.push(
        `/chat/${bookmark.conversationId}?messageId=${bookmark.messageId}`,
      );
    }
  };

  if (!bookmark.message || !bookmark.conversation) {
    return null;
  }

  const messageContent = bookmark.message.content;

  // Always strip markdown for card preview - clean and concise
  const plainTextPreview = useMemo(() => {
    const stripped = removeMarkdown(messageContent);
    return stripped.length > 300 ? `${stripped.slice(0, 300)}...` : stripped;
  }, [messageContent]);

  return (
    <Card
      className="group relative overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col"
      onClick={handleNavigate}
    >
      <CardHeader className="p-4 pb-3 space-y-0 flex-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Conversation title with icon */}
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
              <span className="font-semibold text-sm text-foreground truncate">
                {bookmark.conversation.title}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <time dateTime={new Date(bookmark.createdAt).toISOString()}>
                {format(bookmark.createdAt, "MMM d, yyyy")}
              </time>
            </div>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 -mr-1 -mt-1"
            onClick={handleDelete}
            title="Delete bookmark"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 flex flex-col">
        {/* Message content */}
        <div className="flex-1 mb-3">
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-6">
            {plainTextPreview}
          </p>
        </div>

        {/* Note */}
        {bookmark.note && (
          <div className="mb-3 text-xs bg-muted/50 p-2.5 rounded-md border border-border/40 text-muted-foreground">
            <span className="opacity-60">&ldquo;</span>
            <span className="italic">{bookmark.note}</span>
            <span className="opacity-60">&rdquo;</span>
          </div>
        )}

        {/* Tags */}
        {bookmark.tags && bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/30">
            {bookmark.tags.slice(0, 4).map((tag: any) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-primary/5 text-primary/80 border-primary/10 hover:bg-primary/10 transition-colors"
              >
                {tag}
              </Badge>
            ))}
            {bookmark.tags.length > 4 && (
              <Badge
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground border-border/30"
              >
                +{bookmark.tags.length - 4}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
