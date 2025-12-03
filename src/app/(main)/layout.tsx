"use client";

import { UserButton } from "@clerk/nextjs";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar placeholder */}
        <aside className="w-64 min-h-screen border-r border-border bg-card p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-foreground">blah.chat</h1>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
          <p className="text-sm text-muted-foreground">Sidebar placeholder</p>
        </aside>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
