"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

type Category =
  | "identity"
  | "preference"
  | "project"
  | "context"
  | "relationship";
type SortBy = "date" | "importance" | "confidence";

interface MemoryFiltersProps {
  category: Category | null;
  setCategory: (val: Category | null) => void;
  sortBy: SortBy | null;
  setSortBy: (val: SortBy) => void;
  searchQuery: string | null;
  setSearchQuery: (val: string) => void;
}

export function MemoryFilters({
  category,
  setCategory,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
}: MemoryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search memories..."
          value={searchQuery || ""}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Category */}
      <Select
        value={category || "all"}
        onValueChange={(val) =>
          setCategory(val === "all" ? null : (val as Category))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          <SelectItem value="identity">Identity</SelectItem>
          <SelectItem value="preference">Preferences</SelectItem>
          <SelectItem value="project">Projects</SelectItem>
          <SelectItem value="context">Context</SelectItem>
          <SelectItem value="relationship">Relationships</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={sortBy || "date"}
        onValueChange={(val) => setSortBy(val as SortBy)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Recent first</SelectItem>
          <SelectItem value="importance">Most important</SelectItem>
          <SelectItem value="confidence">Most confident</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
