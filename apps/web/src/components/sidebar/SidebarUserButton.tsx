import { UserButton } from "@clerk/nextjs";

export function SidebarUserButton() {
  return (
    <UserButton
      afterSignOutUrl="/sign-in"
      appearance={{
        elements: {
          userButtonPopoverCard: { pointerEvents: "initial" },
        },
      }}
    />
  );
}
