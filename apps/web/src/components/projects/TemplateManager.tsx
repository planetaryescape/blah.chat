"use client";

import type { Project } from "@blah-chat/api-client";
import { useQuery } from "@tanstack/react-query";
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
import { useSDKClient } from "@/lib/api/sdkClient";
import { useCreateProject } from "@/lib/hooks/mutations/useProjectMutations";

export function TemplateManager() {
  const sdk = useSDKClient();
  const router = useRouter();
  const createProject = useCreateProject();

  const { data: templates } = useQuery<Project[]>({
    queryKey: ["projects", "templates"],
    queryFn: () => sdk.listProjectTemplates(),
    staleTime: 10_000,
  });

  const handleCreateFromTemplate = async (template: Project) => {
    try {
      await createProject.mutateAsync({
        name: `${template.name} (Copy)`,
        description: template.description,
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
        {templates.map((template) => (
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
              <Button
                onClick={() => handleCreateFromTemplate(template)}
                className="w-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create from Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
