"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Edit, Archive, Pin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { RenameDialog } from "./RenameDialog";

export function ConversationItem({ conversation }: { conversation: Doc<"conversations"> }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showRename, setShowRename] = useState(false);

  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const togglePin = useMutation(api.conversations.togglePin);
  const toggleStar = useMutation(api.conversations.toggleStar);
  const archiveConversation = useMutation(api.conversations.archive);

  const isActive = pathname === `/chat/${conversation._id}`;

  const handleClick = () => {
    router.push(`/chat/${conversation._id}`);
  };

  const handleDelete = async () => {
    await deleteConversation({ conversationId: conversation._id });
    if (isActive) {
      router.push("/");
    }
  };

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-2 px-2 mx-2 py-2 rounded cursor-pointer hover:bg-accent transition-colors",
          isActive && "bg-accent"
        )}
        onClick={handleClick}
      >
        <div className="flex-1 truncate">
          <p className="text-sm truncate">
            {conversation.title || "New conversation"}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {conversation.starred && (
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          )}
          {conversation.pinned && <Pin className="w-3 h-3 text-primary" />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowRename(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => togglePin({ conversationId: conversation._id })}
              >
                <Pin className="w-4 h-4 mr-2" />
                {conversation.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleStar({ conversationId: conversation._id })}
              >
                <Star className="w-4 h-4 mr-2" />
                {conversation.starred ? "Unstar" : "Star"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => archiveConversation({ conversationId: conversation._id })}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <RenameDialog
        conversation={conversation}
        open={showRename}
        onOpenChange={setShowRename}
      />
    </>
  );
}
