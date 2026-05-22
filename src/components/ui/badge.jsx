import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground shadow",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/20 text-destructive border-destructive/30",
        outline:     "border-border text-foreground bg-transparent",
        success:     "border-transparent bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        warning:     "border-transparent bg-amber-500/20 text-amber-400 border-amber-500/30",
        info:        "border-transparent bg-blue-500/20 text-blue-400 border-blue-500/30",
        muted:       "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }