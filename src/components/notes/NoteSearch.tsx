import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface NoteSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function NoteSearch({ value, onChange, onClear }: NoteSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search notes..."
        className="pl-9 pr-9 bg-background/50 border-input/50 focus:bg-background transition-colors"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
        </Button>
      )}
    </div>
  );
}
