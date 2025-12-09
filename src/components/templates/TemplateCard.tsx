"use client";

import { useMutation } from "convex/react";
import { Edit, FileText, Sparkles, Trash2 } from "lucide-react";
import { useRouter as useNextRouter } from "next/navigation";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
  const deleteTemplate = useMutation(api.templates.deleteTemplate);
  const incrementUsage = useMutation(api.templates.incrementUsage);
  const router = useNextRouter();

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
      // Here you could navigate to a new conversation with the template pre-filled
      // For now, just copy to clipboard
      await navigator.clipboard.writeText(template.prompt);
      toast.success("Template copied to clipboard");
    } catch (error) {
      toast.error("Failed to use template");
      console.error(error);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {template.isBuiltIn ? (
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {template.name}
              </CardTitle>
              {template.description && (
                <CardDescription className="mt-2">
                  {template.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {template.prompt}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="px-2 py-1 bg-secondary rounded-full">
                {template.category}
              </span>
              <span>{template.usageCount} uses</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleUse}
                className="flex-1"
              >
                Use Template
              </Button>
              {!template.isBuiltIn && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!template.isBuiltIn && (
        <>
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-2xl">
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
                <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
