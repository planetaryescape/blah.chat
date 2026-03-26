import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrefetchableLink } from "@/components/ui/prefetchable-link";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SidebarMenuItemConfig = {
  icon: React.ElementType;
  label: string;
  href: string;
  featureKey: string | null;
};

export function SidebarOverflowMenu({
  items,
  pathname,
  onNavigate,
}: {
  items: SidebarMenuItemConfig[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip="More">
            <MoreHorizontal className="w-4 h-4" />
            <span>More</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          className="w-48 bg-sidebar border-sidebar-border"
        >
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <DropdownMenuItem key={item.href} asChild>
                <PrefetchableLink
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    isActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  )}
                  onClick={onNavigate}
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </PrefetchableLink>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
