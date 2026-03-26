import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { SidebarUserButton } from "./SidebarUserButton";

export function SidebarUserControls({
  isAuthLoaded,
}: {
  isAuthLoaded: boolean;
}) {
  return (
    <>
      <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden min-h-10">
        <div className="flex items-center justify-between">
          {isAuthLoaded && <SidebarUserButton />}
          <ThemeSwitcher />
        </div>
      </div>
      <div className="hidden group-data-[collapsible=icon]:flex justify-center pt-2">
        {isAuthLoaded && <SidebarUserButton />}
      </div>
    </>
  );
}
