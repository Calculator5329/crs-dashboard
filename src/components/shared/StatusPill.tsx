import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: number;
}

export function StatusPill({ status }: StatusPillProps) {
  const variant =
    status < 300
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : status < 400
        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
        : status < 500
          ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
          : "bg-red-500/15 text-red-700 dark:text-red-400";

  return (
    <Badge variant="outline" className={cn("border-0 font-mono text-xs", variant)}>
      {status}
    </Badge>
  );
}

interface MethodBadgeProps {
  method: string;
}

export function MethodBadge({ method }: MethodBadgeProps) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    POST: "bg-green-500/15 text-green-700 dark:text-green-400",
    PUT: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    PATCH: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    DELETE: "bg-red-500/15 text-red-700 dark:text-red-400",
  };

  return (
    <Badge
      variant="outline"
      className={cn("border-0 font-mono text-xs", colors[method] ?? "bg-muted")}
    >
      {method}
    </Badge>
  );
}
