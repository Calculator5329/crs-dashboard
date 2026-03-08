import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/formatters";

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Record<string, unknown> | null;
}

export function DetailDrawer({ open, onOpenChange, title, data }: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-6rem)] mt-4">
          {data && (
            <div className="space-y-3 pr-4">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="border-b pb-2">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {key}
                  </dt>
                  <dd className="mt-1 text-sm font-mono break-all">
                    {formatValue(key, value)}
                  </dd>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (key.toLowerCase().includes("timestamp") || key.toLowerCase().includes("date")) {
    try {
      return formatDateTime(value as string);
    } catch {
      return String(value);
    }
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
