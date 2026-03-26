import { Shield } from "lucide-react";
import { PrefetchableLink } from "@/components/ui/prefetchable-link";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarOverflowMenu } from "./SidebarOverflowMenu";
import { SidebarUserControls } from "./SidebarUserControls";

type SidebarMenuItemConfig = {
  icon: React.ElementType;
  label: string;
  href: string;
  featureKey: string | null;
};

export function SidebarNavigationFooter({
  displayedItems,
  overflowItems,
  isAdmin,
  isAuthLoaded,
  isMobile,
  pathname,
  onNavigate,
}: {
  displayedItems: SidebarMenuItemConfig[];
  overflowItems: SidebarMenuItemConfig[];
  isAdmin: boolean;
  isAuthLoaded: boolean;
  isMobile: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarFooter className="pb-4">
      <SidebarMenu>
        {displayedItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                tooltip={item.label}
                isActive={isActive}
                className="p-2.5"
                {...(item.href === "/projects" && {
                  "data-tour": "projects",
                })}
              >
                <PrefetchableLink href={item.href} onClick={onNavigate}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </PrefetchableLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}

        {isMobile && overflowItems.length > 0 && (
          <SidebarOverflowMenu
            items={overflowItems}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        )}

        {isAdmin && (
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Admin Dashboard"
              isActive={pathname.startsWith("/admin")}
            >
              <PrefetchableLink
                href="/admin/feedback"
                className="text-amber-500 hover:text-amber-400"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </PrefetchableLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
      <SidebarUserControls isAuthLoaded={isAuthLoaded} />
    </SidebarFooter>
  );
}
