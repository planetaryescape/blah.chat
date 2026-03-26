"use client";

import { BarChart3, Maximize2 } from "lucide-react";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatWidth } from "@/lib/utils/chatWidth";

export function ConversationPreferencesMenu({
  currentWidth,
  showComparisonStats,
  showMessageStats,
  onToggleComparisonStats,
  onToggleMessageStats,
  onWidthChange,
}: {
  currentWidth: ChatWidth;
  showComparisonStats: boolean;
  showMessageStats: boolean;
  onToggleComparisonStats: (checked: boolean) => void;
  onToggleMessageStats: (checked: boolean) => void;
  onWidthChange: (width: ChatWidth) => void;
}) {
  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Maximize2 className="mr-2 h-4 w-4" />
          Chat Width
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuLabel>Layout Width</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentWidth}
            onValueChange={(value) => onWidthChange(value as ChatWidth)}
          >
            <DropdownMenuRadioItem value="narrow">
              Narrow (672px)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="standard">
              Standard (896px)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="wide">
              Wide (1152px)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="full">
              Full Width (95%)
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <BarChart3 className="mr-2 h-4 w-4" />
          Statistics
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuLabel>Display Options</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={showMessageStats}
            onCheckedChange={onToggleMessageStats}
          >
            Message Statistics
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showComparisonStats}
            onCheckedChange={onToggleComparisonStats}
          >
            Comparison Statistics
          </DropdownMenuCheckboxItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
