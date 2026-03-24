import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-300 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-pro-sm [a&]:hover:bg-primary/90 [a&]:hover:shadow-pro-md",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white shadow-pro-sm [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/80",
        outline:
          "text-foreground border-border [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Professional variants
        gradient:
          "border-transparent bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-glow",
        gradientAccent:
          "border-transparent bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-glow",
        success:
          "border-transparent bg-gradient-to-br from-green-500 to-green-600 text-white shadow-pro-sm",
        warning:
          "border-transparent bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-pro-sm",
        error:
          "border-transparent bg-gradient-to-br from-red-500 to-red-600 text-white shadow-pro-sm",
        pulse:
          "border-transparent bg-gradient-to-br from-blue-600 to-blue-800 text-white animate-pulse-glow shadow-glow",
        glass:
          "glass-pro border-primary/20 text-primary backdrop-blur-md",
        outlinePrimary:
          "border-2 border-primary/50 text-primary bg-primary/5 [a&]:hover:bg-primary/10",
      },
      size: {
        default: "px-2.5 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
