"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TemplateFormProps {
  template?: {
    _id: Id<"templates">;
    name: string;
    prompt: string;
    description?: string;
    category: string;
  };
  onSuccess?: () => void;
}

const CATEGORIES = ["coding", "writing", "analysis", "creative"];

export function TemplateForm({ template, onSuccess }: TemplateFormProps) {
  const [name, setName] = useState(template?.name || "");
  const [prompt, setPrompt] = useState(template?.prompt || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || "coding");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTemplate = useMutation(api.templates.create);
  const updateTemplate = useMutation(api.templates.update);

  const isEditing = !!template;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) {
      toast.error("Name and prompt are required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateTemplate({
          id: template._id,
          name: name.trim(),
          prompt: prompt.trim(),
          description: description.trim() || undefined,
          category,
        });
        toast.success("Template updated");
      } else {
        await createTemplate({
          name: name.trim(),
          prompt: prompt.trim(),
          description: description.trim() || undefined,
          category,
        });
        toast.success("Template created");
      }
      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to ${isEditing ? "update" : "create"} template`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Code Reviewer"
          maxLength={100}
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Category *</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat: any) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Quick description of what this template does..."
          maxLength={200}
          rows={2}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {description.length}/200 characters
        </p>
      </div>

      <div>
        <Label htmlFor="prompt">Prompt *</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="You are an expert code reviewer. Focus on..."
          maxLength={5000}
          rows={8}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {prompt.length}/5000 characters
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditing ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{isEditing ? "Update" : "Create"} Template</>
          )}
        </Button>
      </div>
    </form>
  );
}
