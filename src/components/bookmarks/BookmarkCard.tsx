"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

interface BookmarkCardProps {
  bookmark: Doc<"bookmarks"> & {
    message: Doc<"messages"> | null;
    conversation: Doc<"conversations"> | null;
  };
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const router = useRouter();
  const removeBookmark = useMutation(api.bookmarks.remove);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeBookmark({ bookmarkId: bookmark._id });
      toast.success("Bookmark removed");
    } catch (error) {
      toast.error("Failed to remove bookmark");
    }
  };

  const handleNavigate = () => {
    if (bookmark.conversation) {
      router.push(`/chat/${bookmark.conversationId}`);
    }
  };

  if (!bookmark.message || !bookmark.conversation) {
    return null;
  }

  const messagePreview =
    bookmark.message.content.length > 150
      ? `${bookmark.message.content.slice(0, 150)}...`
      : bookmark.message.content;

  return (
    <Card
      className="group relative overflow-hidden surface-glass border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
      onClick={handleNavigate}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold line-clamp-1 tracking-tight">
            {bookmark.conversation.title}
          </CardTitle>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-background/50 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate();
              }}
              title="Go to conversation"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              title="Delete bookmark"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <div className="text-sm text-muted-foreground/90 leading-relaxed">
          <span className="font-medium text-foreground/80 uppercase text-xs tracking-wider mr-1">
            {bookmark.message.role}:
          </span>
          {messagePreview}
        </div>

        {bookmark.note && (
          <div className="text-sm bg-muted/30 p-2.5 rounded-md border border-border/50 italic text-muted-foreground">
            "{bookmark.note}"
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-border/30">
          {bookmark.tags && bookmark.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {bookmark.tags.map((tag: any) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 bg-background/50 backdrop-blur-sm border-border/50"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <div />
          )}
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium ml-auto">
            {format(bookmark.createdAt, "MMM d, yyyy")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
