"use client";

import { useQuery } from "convex/react";
import { Bot, Calendar, MessageSquare, Pin, Plus, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { SearchFilters as Filters } from "@/hooks/useSearchFilters";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  filters: Filters;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onFilterChange: (key: keyof Filters, value: string | null) => void;
}

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "Last 90 days", value: "90days" },
] as const;

// Debounce helper for search input
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function SearchFilters({
  filters,
  onClearFilters,
  hasActiveFilters,
  onFilterChange,
}: SearchFiltersProps) {
  const [conversationSearch, setConversationSearch] = useState("");
  const debouncedSearch = useDebouncedValue(conversationSearch, 300);

  const conversations = useQuery(api.conversations.list, {
    searchQuery: debouncedSearch || undefined,
    limit: 20,
  });

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

  // Count active filters for badge
  const activeFiltersCount = [
    filters.conversationId,
    filters.dateFrom,
    filters.messageType,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Filter button + Active chips */}
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {/* Add filter button (now first in DOM order) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 whitespace-nowrap h-7 text-xs"
            >
              <Plus className="w-3 h-3" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 px-1.5 text-[10px]"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start" side="bottom">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filter Search Results</h4>

              {/* Conversation Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Conversation
                </Label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left font-normal"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-2" />
                      {filters.conversationId
                        ? conversations?.find(
                            (c: any) => c._id === filters.conversationId,
                          )?.title || "Unknown"
                        : "All conversations"}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search conversations..."
                        value={conversationSearch}
                        onValueChange={setConversationSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {conversationSearch
                            ? `No conversations matching "${conversationSearch}"`
                            : "No conversations yet"}
                        </CommandEmpty>

                        <CommandGroup
                          heading={
                            conversationSearch
                              ? "Search Results"
                              : "Recent Conversations"
                          }
                        >
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              onFilterChange("conversationId", null);
                              setConversationSearch("");
                            }}
                          >
                            All conversations
                          </CommandItem>

                          {!conversations && (
                            <CommandItem disabled>
                              Loading conversations...
                            </CommandItem>
                          )}

                          {conversations?.map((conv: any) => (
                            <CommandItem
                              key={conv._id}
                              value={conv._id}
                              onSelect={() => {
                                onFilterChange("conversationId", conv._id);
                                setConversationSearch("");
                              }}
                            >
                              {conv.pinned && (
                                <Pin className="w-3 h-3 mr-2 text-muted-foreground" />
                              )}
                              <span className="truncate">
                                {conv.title || "Untitled"}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Date Range
                </Label>
                <RadioGroup
                  value={datePreset}
                  onValueChange={handleDatePresetChange}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="date-all" />
                    <Label
                      htmlFor="date-all"
                      className="text-sm cursor-pointer"
                    >
                      All time
                    </Label>
                  </div>
                  {DATE_PRESETS.map((preset: any) => (
                    <div
                      key={preset.value}
                      className="flex items-center space-x-2"
                    >
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
                    <Label
                      htmlFor="type-all"
                      className="text-sm cursor-pointer"
                    >
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
        </Popover>

        {/* Active filter chips (after button with separator) */}
        {activeFiltersCount > 0 && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Active:</span>
              {filters.conversationId && (
                <FilterChip
                  label="Conversation"
                  value={
                    conversations?.find(
                      (c: any) => c._id === filters.conversationId,
                    )?.title || "Unknown"
                  }
                  onRemove={() => onClearFilters()}
                />
              )}
              {filters.dateFrom && (
                <FilterChip
                  label="Date Range"
                  value="Custom"
                  onRemove={() => onClearFilters()}
                />
              )}
              {filters.messageType && (
                <FilterChip
                  label="Type"
                  value={
                    filters.messageType === "user"
                      ? "User Messages"
                      : "AI Responses"
                  }
                  onRemove={() => onClearFilters()}
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className="h-7 pl-2 pr-1 text-xs gap-1 bg-primary/10 text-primary border-primary/20"
    >
      <span className="font-medium">{label}:</span>
      <span className="truncate max-w-[100px]">{value}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-4 w-4 p-0 hover:bg-primary/20 ml-1"
      >
        <X className="w-3 h-3" />
      </Button>
    </Badge>
  );
}
