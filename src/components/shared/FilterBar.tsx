import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDef {
  key: string;
  label: string;
  type: "select" | "search";
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

export function FilterBar({ filters, values, onChange, onClear }: FilterBarProps) {
  const hasActiveFilters = Object.values(values).some((v) => v && v !== "all");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((filter) =>
        filter.type === "select" ? (
          <Select
            key={filter.key}
            value={values[filter.key] || "all"}
            onValueChange={(v) => onChange(filter.key, v)}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.label}</SelectItem>
              {filter.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            key={filter.key}
            className="w-[200px] h-9"
            placeholder={filter.placeholder ?? filter.label}
            value={values[filter.key] || ""}
            onChange={(e) => onChange(filter.key, e.target.value)}
          />
        )
      )}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
