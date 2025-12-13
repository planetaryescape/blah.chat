"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
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

  const messagePreview =
    bookmark.message.content.length > 150
      ? `${bookmark.message.content.slice(0, 150)}...`
      : bookmark.message.content;

  return (
    <Card
      className="group relative overflow-hidden bg-background hover:bg-muted/30 border-border/40 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
      onClick={handleNavigate}
    >
      <CardHeader className="p-4 pb-2 space-y-0">
         <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-3">
               <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                     {bookmark.conversation.title}
                  </span>
                  <span>•</span>
                  <span>{format(bookmark.createdAt, "MMM d")}</span>
               </div>
               <div className="text-sm text-foreground/90 line-clamp-3 leading-relaxed">
                  {messagePreview}
               </div>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 -mr-2 -mt-2">
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    title="Delete bookmark"
                 >
                    <Trash2 className="h-3.5 w-3.5" />
                 </Button>
            </div>
         </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {bookmark.note && (
          <div className="mt-2 text-xs bg-muted/40 p-2 rounded border border-border/40 text-muted-foreground italic">
            "{bookmark.note}"
          </div>
        )}

        {bookmark.tags && bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
              {bookmark.tags.map((tag: any) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-border/30"
                >
                  {tag}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
