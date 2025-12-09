"use client";

import { useMutation, useQuery } from "convex/react";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

export function TemplateManager() {
  const templates = useQuery(api.projects.listTemplates);
  const createFromTemplate = useMutation(api.projects.createFromTemplate);
  const router = useRouter();

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const projectId = await createFromTemplate({
        templateId: templateId as any,
      });
      toast.success("Project created from template");
      router.push("/projects");
    } catch (error) {
      toast.error("Failed to create project from template");
      console.error(error);
    }
  };

  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
          <p className="text-muted-foreground">
            Create new projects from your saved templates
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(
          (template: {
            _id: string;
            name: string;
            description?: string;
            systemPrompt?: string;
          }) => (
            <Card
              key={template._id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {template.name}
                </CardTitle>
                {template.description && (
                  <CardDescription>{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {template.systemPrompt && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-1">System Prompt:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.systemPrompt}
                    </p>
                  </div>
                )}
                <Button
                  onClick={() => handleCreateFromTemplate(template._id)}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create from Template
                </Button>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
