"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import commandScore from "command-score";
import { useMutation, useQuery } from "convex/react";
import { FileText, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTemplateStore } from "@/stores/templateStore";

const CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "coding", label: "Coding" },
  { id: "writing", label: "Writing" },
  { id: "analysis", label: "Analysis" },
  { id: "creative", label: "Creative" },
] as const;

interface QuickTemplateSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (templatePrompt: string) => void;
  mode?: "navigate" | "insert";
}

export function QuickTemplateSwitcher({
  open,
  onOpenChange,
  onSelectTemplate,
  mode = "navigate",
}: QuickTemplateSwitcherProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const setTemplateText = useTemplateStore((s) => s.setTemplateText);

  // @ts-ignore - Type depth exceeded with complex Convex query
  const templates = useQuery(api.templates.list, {});
  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const incrementUsage = useMutation(api.templates.incrementUsage);

  const prevOpenRef = useRef(open);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened) {
      analytics.track("template_switcher_opened", { mode });
    }
  }, [open, mode]);

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (!templates) return { builtIn: [], user: [] };

    const filtered =
      activeCategory === "all"
        ? templates
        : templates.filter((t: any) => t.category === activeCategory);

    return {
      builtIn: filtered.filter((t: any) => t.isBuiltIn),
      user: filtered.filter((t: any) => !t.isBuiltIn),
    };
  }, [templates, activeCategory]);

  const handleSelect = async (template: {
    _id: Id<"templates">;
    prompt: string;
    name: string;
  }) => {
    // Increment usage
    try {
      await incrementUsage({ id: template._id });
    } catch (error) {
      console.error("Failed to increment usage:", error);
    }

    // Track selection
    analytics.track("template_selected", {
      templateId: template._id,
      templateName: template.name,
      mode,
    });

    if (mode === "insert" && onSelectTemplate) {
      // Insert template into current input
      onSelectTemplate(template.prompt);
      onOpenChange(false);

      // Focus chat input after inserting
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("focus-chat-input"));
      }, 50);
    } else {
      // Navigate to new chat with template (using Zustand store)
      onOpenChange(false);
      setTemplateText(template.prompt, template.name);
      router.push("/chat?from=template");
    }
  };

  const renderTemplateItem = (template: any) => {
    const itemContent = (
      <CommandItem
        key={template._id}
        value={template._id}
        keywords={[
          template.name,
          template.category,
          template.description || "",
        ]}
        onSelect={() => handleSelect(template)}
        className={cn(
          "group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer aria-selected:bg-muted/50 transition-colors",
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg border shrink-0",
              template.isBuiltIn
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30"
                : "bg-primary/10 text-primary border-primary/30",
            )}
          >
            {template.isBuiltIn ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>

          <div className="flex flex-col min-w-0 gap-0.5">
            <span className="font-medium text-sm truncate text-foreground">
              {template.name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {template.description || template.prompt.slice(0, 60) + "..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-2 text-xs text-muted-foreground/50">
          <span className="capitalize">{template.category}</span>
          {template.usageCount > 0 && (
            <>
              <span className="text-muted-foreground/30">•</span>
              <span>{template.usageCount} uses</span>
            </>
          )}
        </div>
      </CommandItem>
    );

    return (
      <HoverCard key={template._id} openDelay={300}>
        <HoverCardTrigger asChild>{itemContent}</HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          className="w-80 p-4"
          sideOffset={10}
        >
          <div className="space-y-2">
            <h4 className="font-medium">{template.name}</h4>
            {template.description && (
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
            )}
            <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {template.prompt}
              </p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      commandProps={{
        filter: (value, search, keywords) => {
          const extendValue = `${value} ${keywords?.join(" ") || ""}`;
          const score = commandScore(extendValue, search);
          return score;
        },
      }}
      className="max-w-[95vw] md:max-w-3xl h-[80vh] md:h-[500px] p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl"
    >
      <div className="flex items-center border-b px-4 py-3 shrink-0">
        <Search className="w-4 h-4 mr-2 text-muted-foreground" />
        <CommandInput
          placeholder={`Search ${activeCategory === "all" ? "" : activeCategory + " "}templates...`}
          className="flex-1 h-9 bg-transparent border-0 ring-0 focus:ring-0 text-sm"
        />
      </div>

      <div className="flex h-[400px] overflow-hidden">
        {/* Sidebar Categories */}
        <div className="w-[160px] border-r bg-muted/30 p-2 flex flex-col gap-1 shrink-0 overflow-y-auto">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Categories
          </div>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full flex items-center px-2.5 py-2 rounded-md text-sm transition-colors text-left",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Main List Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          <CommandList className="max-h-[400px] overflow-y-auto p-2">
            <CommandEmpty>No templates found.</CommandEmpty>

            {/* User Templates */}
            {filteredTemplates.user.length > 0 && (
              <CommandGroup heading="Your Templates">
                {filteredTemplates.user.map((template: any) =>
                  renderTemplateItem(template),
                )}
              </CommandGroup>
            )}

            {filteredTemplates.user.length > 0 &&
              filteredTemplates.builtIn.length > 0 && <CommandSeparator />}

            {/* Built-in Templates */}
            {filteredTemplates.builtIn.length > 0 && (
              <CommandGroup heading="Built-in Templates">
                {filteredTemplates.builtIn.map((template: any) =>
                  renderTemplateItem(template),
                )}
              </CommandGroup>
            )}
          </CommandList>
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Press <kbd className="px-1 py-0.5 rounded bg-muted">↵</kbd> to select
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted">⌘;</kbd> to open
        </span>
      </div>
    </CommandDialog>
  );
}
