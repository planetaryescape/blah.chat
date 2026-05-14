import { UserButton } from "@clerk/nextjs";

export function SidebarUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          userButtonPopoverCard: { pointerEvents: "initial" },
        },
      }}
    />
  );
}
