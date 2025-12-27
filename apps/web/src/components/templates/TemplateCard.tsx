"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  Copy,
  Edit,
  FileText,
  MoreHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { useTemplateStore } from "@/stores/templateStore";
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
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const deleteTemplate = useMutation(api.templates.deleteTemplate);
  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const incrementUsage = useMutation(api.templates.incrementUsage);
  const setTemplateText = useTemplateStore((s) => s.setTemplateText);

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
      setTemplateText(template.prompt, template.name);
      router.push("/chat?from=template");
    } catch (error) {
      toast.error("Failed to use template");
      console.error(error);
    }
  };

  return (
    <>
      <Card className="group relative flex flex-col justify-between p-5 transition-all duration-300 hover:border-primary/20 hover:bg-muted/10">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-primary/10 text-primary",
                )}
              >
                {template.isBuiltIn ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <h3 className="truncate text-base font-semibold text-foreground leading-tight">
                  {template.name}
                </h3>
                <span className="truncate text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">
                  {template.category}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100 -mr-2 -mt-2"
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {!template.isBuiltIn && (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                        <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setIsDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground/80 min-h-[3rem] leading-relaxed">
            {template.description || template.prompt}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
            <span>{template.usageCount} uses</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-4 text-xs font-medium bg-secondary/50 hover:bg-primary/10 hover:text-primary transition-all ml-auto"
            onClick={handleUse}
          >
            <Copy className="mr-1.5 h-3 w-3" />
            Use Template
          </Button>
        </div>
      </Card>

      {!template.isBuiltIn && (
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
      )}

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {template.isBuiltIn ? "Remove Template" : "Delete Template"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {template.isBuiltIn
                ? "Are you sure you want to remove this built-in template from your view?"
                : "Are you sure you want to delete this template? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {template.isBuiltIn ? "Remove" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
