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
  onShowNotesChange: (checked: boolean) => Promise<void>;
  onShowTemplatesChange: (checked: boolean) => Promise<void>;
  onShowProjectsChange: (checked: boolean) => Promise<void>;
  onShowBookmarksChange: (checked: boolean) => Promise<void>;
}

export function SidebarFeaturesSection({
  showNotes,
  showTemplates,
  showProjects,
  showBookmarks,
  onShowNotesChange,
  onShowTemplatesChange,
  onShowProjectsChange,
  onShowBookmarksChange,
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
      </AccordionContent>
    </AccordionItem>
  );
}
