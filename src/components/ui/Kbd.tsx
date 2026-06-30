import { cn } from "@/lib/utils"

export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center h-5 min-w-[20px] rounded-md px-1.5 text-[11px] font-mono font-medium bg-surface-2 text-muted border border-subtle shadow-soft",
        className
      )}
    >
      {children}
    </kbd>
  )
}
