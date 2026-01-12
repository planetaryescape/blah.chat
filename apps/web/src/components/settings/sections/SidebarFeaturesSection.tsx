"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SidebarFeaturesSectionProps {
  showNotes: boolean;
  showTemplates: boolean;
  showProjects: boolean;
  showBookmarks: boolean;
  showTasks: boolean;
  showSmartAssistant: boolean;
  onShowNotesChange: (checked: boolean) => Promise<void>;
  onShowTemplatesChange: (checked: boolean) => Promise<void>;
  onShowProjectsChange: (checked: boolean) => Promise<void>;
  onShowBookmarksChange: (checked: boolean) => Promise<void>;
  onShowTasksChange: (checked: boolean) => Promise<void>;
  onShowSmartAssistantChange: (checked: boolean) => Promise<void>;
}

export function SidebarFeaturesSection({
  showNotes,
  showTemplates,
  showProjects,
  showBookmarks,
  showTasks,
  showSmartAssistant,
  onShowNotesChange,
  onShowTemplatesChange,
  onShowProjectsChange,
  onShowBookmarksChange,
  onShowTasksChange,
  onShowSmartAssistantChange,
}: SidebarFeaturesSectionProps) {
  return (
    <AccordionItem value="sidebar-features">
      <AccordionTrigger>Sidebar Features</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div
          id="setting-showNotes"
          className="flex items-center justify-between rounded-md p-2 -m-2 transition-all"
        >
          <div className="space-y-0.5">
            <Label htmlFor="show-notes">Show Notes</Label>
            <p className="text-sm text-muted-foreground">
              Display notes feature in sidebar and message actions
            </p>
          </div>
          <Switch
            id="show-notes"
            checked={showNotes}
            onCheckedChange={onShowNotesChange}
          />
        </div>

        <div
          id="setting-showTemplates"
          className="flex items-center justify-between rounded-md p-2 -m-2 transition-all"
        >
          <div className="space-y-0.5">
            <Label htmlFor="show-templates">Show Templates</Label>
            <p className="text-sm text-muted-foreground">
              Display templates section in sidebar
            </p>
          </div>
          <Switch
            id="show-templates"
            checked={showTemplates}
            onCheckedChange={onShowTemplatesChange}
          />
        </div>

        <div
          id="setting-showProjects"
          className="flex items-center justify-between rounded-md p-2 -m-2 transition-all"
        >
          <div className="space-y-0.5">
            <Label htmlFor="show-projects">Show Projects</Label>
            <p className="text-sm text-muted-foreground">
              Display projects feature across the app
            </p>
          </div>
          <Switch
            id="show-projects"
            checked={showProjects}
            onCheckedChange={onShowProjectsChange}
          />
        </div>

        <div
          id="setting-showBookmarks"
          className="flex items-center justify-between rounded-md p-2 -m-2 transition-all"
        >
          <div className="space-y-0.5">
            <Label htmlFor="show-bookmarks">Show Bookmarks</Label>
            <p className="text-sm text-muted-foreground">
              Display bookmarks feature in sidebar and message actions
            </p>
          </div>
          <Switch
            id="show-bookmarks"
            checked={showBookmarks}
            onCheckedChange={onShowBookmarksChange}
          />
        </div>

        <div
          id="setting-showTasks"
          className="flex items-center justify-between rounded-md p-2 -m-2 transition-all"
        >
          <div className="space-y-0.5">
            <Label htmlFor="show-tasks">Show Tasks</Label>
            <p className="text-sm text-muted-foreground">
              Display task management feature across the app
            </p>
          </div>
          <Switch
            id="show-tasks"
            checked={showTasks}
            onCheckedChange={onShowTasksChange}
          />
        </div>

        <div
          id="setting-showSmartAssistant"
          className="flex items-center justify-between rounded-md p-2 -m-2 transition-all"
        >
          <div className="space-y-0.5">
            <Label htmlFor="show-smart-assistant">Show Smart Assistant</Label>
            <p className="text-sm text-muted-foreground">
              Display AI extraction assistant in sidebar
            </p>
          </div>
          <Switch
            id="show-smart-assistant"
            checked={showSmartAssistant}
            onCheckedChange={onShowSmartAssistantChange}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
