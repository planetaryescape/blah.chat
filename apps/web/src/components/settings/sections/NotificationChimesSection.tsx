"use client";

import type {
  NotificationChimeEvent,
  NotificationChimeId,
  NotificationChimeSounds,
} from "@blah-chat/shared/preferences";
import { Volume2 } from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  NOTIFICATION_CHIME_OPTIONS,
  playNotificationChime,
} from "@/lib/audio/notificationChimes";

interface NotificationChimesSectionProps {
  enabled: boolean;
  sounds: NotificationChimeSounds;
  onEnabledChange: (checked: boolean) => Promise<void>;
  onSoundChange: (
    event: NotificationChimeEvent,
    sound: NotificationChimeId,
  ) => Promise<void>;
}

const CHIME_EVENTS: { event: NotificationChimeEvent; label: string }[] = [
  { event: "emailReceived", label: "New email" },
  { event: "emailSent", label: "Sent email" },
  { event: "emailArchived", label: "Archived email" },
  { event: "messageSent", label: "Chat sent" },
  { event: "conversationArchived", label: "Conversation archived" },
  { event: "notification", label: "Other notification" },
];

export function NotificationChimesSection({
  enabled,
  sounds,
  onEnabledChange,
  onSoundChange,
}: NotificationChimesSectionProps) {
  return (
    <AccordionItem value="audio-feedback">
      <AccordionTrigger>Audio Feedback</AccordionTrigger>
      <AccordionContent className="space-y-5 pt-4">
        <div
          id="setting-notificationChimesEnabled"
          className="flex items-center justify-between gap-4 rounded-lg"
        >
          <div className="space-y-0.5">
            <Label htmlFor="notification-chimes">Notification chimes</Label>
            <p className="text-sm text-muted-foreground">
              Play short sounds for email, notification, and chat actions
            </p>
          </div>
          <Switch
            id="notification-chimes"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        <TooltipProvider>
          <div id="setting-notificationChimeSounds" className="space-y-3">
            {CHIME_EVENTS.map(({ event, label }) => {
              const sound = sounds[event];

              return (
                <div
                  key={event}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,10rem)_2rem] items-center gap-3"
                >
                  <Label className="min-w-0 text-sm" htmlFor={`chime-${event}`}>
                    {label}
                  </Label>
                  <Select
                    value={sound}
                    onValueChange={(value) =>
                      onSoundChange(event, value as NotificationChimeId)
                    }
                  >
                    <SelectTrigger id={`chime-${event}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_CHIME_OPTIONS.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={sound === "none"}
                        onClick={() => playNotificationChime(sound)}
                        aria-label={`Preview ${label} chime`}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview chime</TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </AccordionContent>
    </AccordionItem>
  );
}
