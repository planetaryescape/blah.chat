import { Ghost, Plus } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { PrefetchableLink } from "@/components/ui/prefetchable-link";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import { SidebarHeader } from "@/components/ui/sidebar";

export function SidebarHeaderContent({
  onNewChat,
  onOpenIncognito,
}: {
  onNewChat: () => void;
  onOpenIncognito: () => void;
}) {
  return (
    <SidebarHeader className="pt-6 px-1.5 group-data-[collapsible=icon]:px-2">
      <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
        <PrefetchableLink
          href="/app"
          className="hidden group-data-[collapsible=icon]:hidden sm:block hover:opacity-80 transition-opacity"
        >
          <Logo size="md" />
        </PrefetchableLink>
        <PrefetchableLink
          href="/app"
          className="group-data-[collapsible=icon]:block hidden hover:opacity-80 transition-opacity"
        >
          <Logo size="sm" showText={false} />
        </PrefetchableLink>
        <div className="sm:hidden">
          <PrefetchableLink
            href="/app"
            className="transition-opacity hover:opacity-80"
          >
            <Logo size="sm" />
          </PrefetchableLink>
        </div>
      </div>

      <div className="mt-4 group-data-[collapsible=icon]:hidden flex gap-2">
        <Button
          onClick={onNewChat}
          className="flex-1 px-2.5 py-2.5 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border border-sidebar-border shadow-sm transition-all duration-200 justify-between h-9 cursor-pointer"
          data-tour="new-chat"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </span>
          <div className="hidden sm:flex">
            <ShortcutBadge keys={["Alt", "N"]} />
          </div>
        </Button>
        <Button
          onClick={onOpenIncognito}
          className="p-0 transition-all duration-200 border shadow-sm cursor-pointer h-9 w-9 shrink-0 bg-sidebar-accent hover:bg-sidebar-accent/80 text-violet-400 border-sidebar-border "
          title="New Incognito Chat (Shift+Alt+N)"
        >
          <Ghost className="w-4 h-4" />
        </Button>
      </div>
    </SidebarHeader>
  );
}
