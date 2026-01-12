"use client";

import { X } from "lucide-react";
import { useState } from "react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SmartAssistantSectionProps {
  noteCategoryMode: "fixed" | "ai-suggested";
  customNoteCategories: string[];
  onNoteCategoryModeChange: (mode: "fixed" | "ai-suggested") => Promise<void>;
  onCustomNoteCategoriesChange: (categories: string[]) => Promise<void>;
}

const DEFAULT_CATEGORIES = [
  "decision",
  "discussion",
  "action-item",
  "insight",
  "followup",
];

export function SmartAssistantSection({
  noteCategoryMode,
  customNoteCategories,
  onNoteCategoryModeChange,
  onCustomNoteCategoriesChange,
}: SmartAssistantSectionProps) {
  const [newCategory, setNewCategory] = useState("");

  const categories =
    customNoteCategories.length > 0 ? customNoteCategories : DEFAULT_CATEGORIES;

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim().toLowerCase();
    if (trimmed && !categories.includes(trimmed)) {
      await onCustomNoteCategoriesChange([...categories, trimmed]);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = async (category: string) => {
    await onCustomNoteCategoriesChange(
      categories.filter((c) => c !== category),
    );
  };

  const handleResetToDefaults = async () => {
    await onCustomNoteCategoriesChange(DEFAULT_CATEGORIES);
  };

  return (
    <AccordionItem value="smart-assistant">
      <AccordionTrigger>Smart Assistant</AccordionTrigger>
      <AccordionContent className="space-y-6 pt-4">
        <div
          id="setting-noteCategoryMode"
          className="space-y-3 rounded-md p-2 -m-2 transition-all"
        >
          <div className="space-y-0.5">
            <Label>Note Category Mode</Label>
            <p className="text-sm text-muted-foreground">
              Choose how categories are assigned to extracted notes
            </p>
          </div>
          <RadioGroup
            value={noteCategoryMode}
            onValueChange={(value) =>
              onNoteCategoryModeChange(value as "fixed" | "ai-suggested")
            }
            className="flex flex-col gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="mode-fixed" />
              <Label
                htmlFor="mode-fixed"
                className="font-normal cursor-pointer"
              >
                Fixed set - Use your defined categories
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ai-suggested" id="mode-ai" />
              <Label htmlFor="mode-ai" className="font-normal cursor-pointer">
                AI-suggested - Let AI create categories based on content
              </Label>
            </div>
          </RadioGroup>
        </div>

        {noteCategoryMode === "fixed" && (
          <div
            id="setting-customNoteCategories"
            className="space-y-3 rounded-md p-2 -m-2 transition-all"
          >
            <div className="space-y-0.5">
              <Label>Custom Categories</Label>
              <p className="text-sm text-muted-foreground">
                Define categories for organizing extracted notes
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {category}</span>
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add category..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
              >
                Add
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToDefaults}
              className="text-xs text-muted-foreground"
            >
              Reset to defaults
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
