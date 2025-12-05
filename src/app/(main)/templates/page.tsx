"use client";

import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useState } from "react";

const CATEGORIES = ["all", "coding", "writing", "analysis", "creative"];

import { ScrollArea } from "@/components/ui/scroll-area";

import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";

// ... imports

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [hasSeeded, setHasSeeded] = useState(false);

  // FIXME: Convex useQuery type inference excessively deep - intentionally ignored, do not remove @ts-ignore
  // @ts-ignore
  const templates = useQuery(
    // FIXME: Convex API type inference excessively deep - intentionally ignored, do not remove @ts-ignore
    // @ts-ignore
    api.templates.list,
    selectedCategory === "all" ? {} : { category: selectedCategory },
  );

  const seedBuiltIn = useMutation(api.templates.builtIn.seedBuiltInTemplates);

  useEffect(() => {
    const checkAndSeed = async () => {
      if (templates && templates.length === 0 && !hasSeeded) {
        try {
          const result = await seedBuiltIn();
          toast.success(result.message);
          setHasSeeded(true);
        } catch (error) {
          console.error("Failed to seed templates:", error);
        }
      }
    };
    checkAndSeed();
  }, [templates, hasSeeded, seedBuiltIn]);

  const builtInTemplates = templates?.filter((t: any) => t.isBuiltIn) || [];
  const userTemplates = templates?.filter((t: any) => !t.isBuiltIn) || [];

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-200">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Templates
              </h1>
              <p className="text-muted-foreground mt-2">
                Quick-start prompts for common tasks
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>

          <Tabs
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5">
              {CATEGORIES.map((cat: any) => (
                <TabsTrigger key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {/* Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 pointer-events-none" />
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="space-y-8">
            {userTemplates.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Your Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTemplates.map((template: any) => (
                    <TemplateCard key={template._id} template={template} />
                  ))}
                </div>
              </div>
            )}

            {builtInTemplates.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Built-in Templates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {builtInTemplates.map((template: any) => (
                    <TemplateCard key={template._id} template={template} />
                  ))}
                </div>
              </div>
            )}

            {templates && templates.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No templates found
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <TemplateForm onSuccess={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
