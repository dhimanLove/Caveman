import { cn } from "@/shared/lib/utils";

export function MacWindowDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-hidden="true">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
    </div>
  );
}
