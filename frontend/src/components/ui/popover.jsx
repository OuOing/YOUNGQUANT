import * as React from "react"
import { cn } from "@/lib/utils"

function Popover({ children }) {
  return (
    <div className="relative w-full">
      {children}
    </div>
  );
}

function PopoverTrigger({ children }) {
  return children;
}

function PopoverContent({ className, children }) {
  return (
    <div
      className={cn(
        "absolute z-[150] mt-2 w-full origin-top-left rounded-xl bg-popover p-1 text-popover-foreground shadow-2xl ring-1 ring-white/10 focus:outline-none animate-in fade-in zoom-in-95 duration-150",
        className
      )}
    >
      {children}
    </div>
  );
}

export { Popover, PopoverTrigger, PopoverContent }
