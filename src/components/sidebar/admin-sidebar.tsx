"use client";

import { Logo } from "@/components/brand/Logo";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, MessageSquare, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_MENU_ITEMS = [
  { icon: MessageSquare, label: "Feedback", href: "/admin/feedback" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      role="navigation"
      aria-label="Admin navigation"
    >
      <SidebarHeader className="pt-6 px-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/admin/feedback"
            className="hidden group-data-[collapsible=icon]:hidden sm:block hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <Logo size="sm" showText={false} />
              <span className="font-semibold text-sm">Admin</span>
            </div>
          </Link>
          <Link
            href="/admin/feedback"
            className="group-data-[collapsible=icon]:block hidden hover:opacity-80 transition-opacity"
          >
            <Logo size="sm" showText={false} />
          </Link>
          <div className="sm:hidden">
            <Link href="/admin/feedback" className="hover:opacity-80 transition-opacity">
              <Logo size="sm" showText={false} />
            </Link>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_MENU_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to App">
              <Link href="/app" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <UserButton afterSignOutUrl="/sign-in" />
            <ThemeSwitcher />
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex justify-center pt-2">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
