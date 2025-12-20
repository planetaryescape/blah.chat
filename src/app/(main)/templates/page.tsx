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
import { FileText, Plus } from "lucide-react";
import { useState } from "react";

const CATEGORIES = ["all", "coding", "writing", "analysis", "creative"];

import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";

// ... imports

export default function TemplatesPage() {
  const { showTemplates, isLoading } = useFeatureToggles();

  // Show loading while preferences are being fetched
  if (isLoading) {
    return <FeatureLoadingScreen />;
  }

  // Route guard: show disabled page if templates feature is off
  if (!showTemplates) {
    return (
      <DisabledFeaturePage featureName="Templates" settingKey="showTemplates" />
    );
  }

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [hasSeeded, setHasSeeded] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const templates: Doc<"templates">[] | undefined = useQuery(
    api.templates.list,
    selectedCategory === "all" ? {} : { category: selectedCategory },
  );

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
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
      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">Templates</h1>
              <p className="text-sm text-muted-foreground">
                Quick-start prompts for common tasks
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Tabs
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                className="w-full md:w-auto"
              >
                <TabsList className="bg-muted/50">
                  {CATEGORIES.map((cat: any) => (
                    <TabsTrigger
                      key={cat}
                      value={cat}
                      className="capitalize data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="hidden md:flex"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="icon"
                className="md:hidden"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="space-y-10">
            {userTemplates.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                  Your Templates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userTemplates.map((template: any) => (
                    <TemplateCard key={template._id} template={template} />
                  ))}
                </div>
              </div>
            )}

            {builtInTemplates.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                  Built-in Templates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {builtInTemplates.map((template: any) => (
                    <TemplateCard key={template._id} template={template} />
                  ))}
                </div>
              </div>
            )}

            {templates && templates.length === 0 && (
              <div className="text-center py-24 text-muted-foreground flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold">No templates found</h3>
                <p className="text-sm">Create a new template to get started.</p>
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
