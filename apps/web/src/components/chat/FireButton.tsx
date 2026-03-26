"use client";

import { Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDeleteConversation } from "@/lib/hooks/mutations";
import { cn } from "@/lib/utils";

interface FireButtonProps {
  conversationId: string;
  className?: string;
}

export function FireButton({ conversationId, className }: FireButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { mutateAsync: deleteConversation } = useDeleteConversation();
  const router = useRouter();

  const handleFire = () => {
    setIsDeleting(true);
    void deleteConversation({ conversationId })
      .then(() => {
        toast.success("Conversation wiped");
        router.push("/");
      })
      .catch((error) => {
        console.error("Failed to wipe conversation:", error);
        toast.error("Failed to wipe conversation");
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDeleting}
              className={cn(
                "h-7 w-7 shrink-0",
                "text-orange-400/60 hover:text-orange-400",
                "hover:bg-orange-500/10",
                "transition-colors duration-200",
                className,
              )}
            >
              <Flame className="size-4" />
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Wipe conversation now</TooltipContent>
      </Tooltip>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Flame className="size-5 text-orange-400" />
            Wipe Incognito Chat
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this conversation and all its messages.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleFire}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Flame className="size-4 mr-2" />
            Wipe Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
