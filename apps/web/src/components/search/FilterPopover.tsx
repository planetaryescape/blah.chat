"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Bot, Calendar, MessageSquare, User } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { PopoverContent } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SearchFilters } from "@/hooks/useSearchFilters";

interface FilterPopoverProps {
  filters: SearchFilters;
  onFilterChange: (key: keyof SearchFilters, value: string | null) => void;
}

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "Last 90 days", value: "90days" },
] as const;

export function FilterPopover({ filters, onFilterChange }: FilterPopoverProps) {
  const conversations = useQuery(api.conversations.list, {});

  const [datePreset, setDatePreset] = useState<string>("all");
  const [messageType, setMessageType] = useState<string>(
    filters.messageType || "all",
  );

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);

    if (value === "all") {
      onFilterChange("dateFrom", null);
      onFilterChange("dateTo", null);
      return;
    }

    const now = Date.now();
    let dateFrom = now;

    switch (value) {
      case "today":
        dateFrom = new Date().setHours(0, 0, 0, 0);
        break;
      case "7days":
        dateFrom = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30days":
        dateFrom = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "90days":
        dateFrom = now - 90 * 24 * 60 * 60 * 1000;
        break;
    }

    onFilterChange("dateFrom", dateFrom.toString());
    onFilterChange("dateTo", now.toString());
  };

  const handleMessageTypeChange = (value: string) => {
    setMessageType(value);

    if (value === "all") {
      onFilterChange("messageType", null);
    } else {
      onFilterChange("messageType", value);
    }
  };

  return (
    <PopoverContent className="w-80 p-4" align="start" side="bottom">
      <div className="space-y-4">
        <h4 className="font-medium text-sm">Filter Search Results</h4>

        {/* Conversation Filter */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Conversation
          </Label>
          <Select
            value={filters.conversationId || "all"}
            onValueChange={(value) =>
              onFilterChange("conversationId", value === "all" ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All conversations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conversations</SelectItem>
              {conversations?.map((conv: any) => (
                <SelectItem key={conv._id} value={conv._id}>
                  {conv.title || "Untitled"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Date Range
          </Label>
          <RadioGroup value={datePreset} onValueChange={handleDatePresetChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="date-all" />
              <Label htmlFor="date-all" className="text-sm cursor-pointer">
                All time
              </Label>
            </div>
            {DATE_PRESETS.map((preset: any) => (
              <div key={preset.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={preset.value}
                  id={`date-${preset.value}`}
                />
                <Label
                  htmlFor={`date-${preset.value}`}
                  className="text-sm cursor-pointer"
                >
                  {preset.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Message Type Filter */}
        <div className="space-y-2">
          <Label className="text-xs">Message Type</Label>
          <RadioGroup
            value={messageType}
            onValueChange={handleMessageTypeChange}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="type-all" />
              <Label htmlFor="type-all" className="text-sm cursor-pointer">
                All messages
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="user" id="type-user" />
              <Label
                htmlFor="type-user"
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5" />
                User messages
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="assistant" id="type-assistant" />
              <Label
                htmlFor="type-assistant"
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <Bot className="w-3.5 h-3.5" />
                AI responses
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </PopoverContent>
  );
}
