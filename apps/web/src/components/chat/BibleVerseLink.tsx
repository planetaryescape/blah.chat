"use client";

import { type ReactNode, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { osisToGatewayUrl } from "@/lib/bible/utils";
import { BibleVersePopover } from "./BibleVersePopover";

interface BibleVerseLinkProps {
  osis: string;
  children: ReactNode;
}

export function BibleVerseLink({ osis, children }: BibleVerseLinkProps) {
  const { isTouchDevice } = useMobileDetect();
  const [isOpen, setIsOpen] = useState(false);
  const gatewayUrl = osisToGatewayUrl(osis);

  // Mobile: Popover on tap
  if (isTouchDevice) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="bible-verse-link inline cursor-pointer bg-transparent border-none p-0 m-0 font-inherit text-inherit"
          >
            {children}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <BibleVersePopover osis={osis} enabled={isOpen} />
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop: HoverCard with click-through to BibleGateway
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={gatewayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bible-verse-link"
        >
          {children}
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <BibleVersePopover osis={osis} />
      </HoverCardContent>
    </HoverCard>
  );
}
