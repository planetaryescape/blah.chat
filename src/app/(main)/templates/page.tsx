"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const CATEGORIES = ["all", "coding", "writing", "analysis", "creative"];

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [hasSeeded, setHasSeeded] = useState(false);

  const templates = useQuery(
    api.templates.list,
    selectedCategory === "all" ? {} : { category: selectedCategory }
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

  const builtInTemplates = templates?.filter((t) => t.isBuiltIn) || [];
  const userTemplates = templates?.filter((t) => !t.isBuiltIn) || [];

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground mt-2">
            Quick-start prompts for common tasks
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-8 space-y-8">
        {userTemplates.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTemplates.map((template) => (
                <TemplateCard key={template._id} template={template} />
              ))}
            </div>
          </div>
        )}

        {builtInTemplates.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Built-in Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {builtInTemplates.map((template) => (
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
