"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Copy, Edit, FileText, MoreHorizontal, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TemplateForm } from "./TemplateForm";

interface TemplateCardProps {
  template: {
    _id: Id<"templates">;
    name: string;
    prompt: string;
    description?: string;
    category: string;
    isBuiltIn: boolean;
    usageCount: number;
  };
}

export function TemplateCard({ template }: TemplateCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const deleteTemplate = useMutation(api.templates.deleteTemplate);
  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const incrementUsage = useMutation(api.templates.incrementUsage);

  const handleDelete = async () => {
    try {
      await deleteTemplate({ id: template._id });
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
      console.error(error);
    }
  };

  const handleUse = async () => {
    try {
      await incrementUsage({ id: template._id });
      await navigator.clipboard.writeText(template.prompt);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
      console.error(error);
    }
  };

  return (
    <>
      <div className="group relative flex flex-col justify-between rounded-xl border border-border/40 bg-background/50 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-muted/20 hover:shadow-sm">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
               <div className={cn(
                   "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50",
                   template.isBuiltIn ? "bg-amber-500/10 text-amber-600 dark:text-amber-500" : "bg-primary/10 text-primary"
               )}>
                  {template.isBuiltIn ? <Sparkles className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
               </div>
               <div className="flex flex-col overflow-hidden">
                 <h3 className="truncate text-sm font-medium text-foreground leading-tight">
                    {template.name}
                 </h3>
                 <span className="truncate text-xs text-muted-foreground/70">
                    {template.category}
                 </span>
               </div>
            </div>

            <div className="flex items-center gap-1">
               {!template.isBuiltIn && (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                            <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive focus:text-destructive">
                             <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
               )}
            </div>
          </div>

          <p className="line-clamp-2 text-xs text-muted-foreground/80 min-h-[2.5em]">
            {template.description || template.prompt}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                <span>{template.usageCount} uses</span>
            </div>

            <Button
                variant="secondary"
                size="sm"
                className="h-7 px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={handleUse}
            >
                <Copy className="mr-1.5 h-3 w-3" />
                Use
            </Button>
        </div>
      </div>

      {!template.isBuiltIn && (
        <>
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Template</DialogTitle>
              </DialogHeader>
              <TemplateForm
                template={template}
                onSuccess={() => setIsEditOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this template? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
