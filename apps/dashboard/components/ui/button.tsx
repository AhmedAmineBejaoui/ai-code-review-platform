import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-pro-sm hover:shadow-pro-md hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 shadow-pro-sm hover:shadow-pro-md focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/80 hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-pro-sm hover:shadow-pro-md hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        // Professional variants
        gradient:
          "bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-pro-md hover:shadow-glow hover:scale-105 hover:-translate-y-1 active:scale-100 active:translate-y-0",
        gradientAccent:
          "bg-gradient-to-br from-orange-500 to-teal-500 text-white shadow-pro-md hover:shadow-glow hover:scale-105 hover:-translate-y-1 active:scale-100 active:translate-y-0",
        glass:
          "glass-pro text-primary hover:bg-card-hover dark:hover:bg-card-hover border border-border hover:border-border/80",
        shine:
          "relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-pro-md hover:shadow-glow before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700 hover:scale-105 hover:-translate-y-1 active:scale-100 active:translate-y-0",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-xl px-7 text-base has-[>svg]:px-5",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
      loading?: boolean;
    }
>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      disabled,
      loading,
      children,
      ...props
    },
    ref,
  ) => {
    const hasSingleChildElement =
      React.Children.count(children) === 1 && React.isValidElement(children);
    const useSlot = asChild && hasSingleChildElement && !loading;
    const Comp = useSlot ? Slot : "button";

    return (
      <Comp
        data-slot="button"
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {useSlot ? (
          children
        ) : (
          <>
            {loading ? (
              <svg
                className="animate-spin-smooth-infinite h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
