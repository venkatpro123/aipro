import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[var(--space-2)] whitespace-nowrap rounded-[var(--radius-md)] text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-lift active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
           "bg-[var(--text)] text-[var(--bg)] border border-transparent shadow-sm hover:bg-[var(--cyan)] hover:text-black",
        destructive:
          "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
        outline:
          "border border-[var(--border-2)] bg-transparent text-[var(--text)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-dim)]",
        secondary:
          "bg-[var(--bg-raised)] text-[var(--text)] border border-[var(--border-2)] hover:border-[var(--text-3)]",
        ghost: "border border-transparent hover:bg-white/5",
        link: "text-[var(--cyan)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[var(--tap-min)] px-[var(--space-4)]", /* 48px height, 16px padding */
        sm: "h-11 rounded-[var(--radius-sm)] px-[var(--space-4)] text-xs", /* 44px height — WCAG touch target */
        lg: "h-[var(--tap-min)] rounded-[var(--radius-lg)] px-[var(--space-6)] text-base",
        icon: "h-[var(--tap-min)] w-[var(--tap-min)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
