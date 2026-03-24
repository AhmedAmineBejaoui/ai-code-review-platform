"use client";

import * as React from "react";
import { cn } from "./utils";

interface AnimatedCounterProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
}

export function AnimatedCounter({
  value,
  duration = 2000,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = ",",
  className,
  ...props
}: AnimatedCounterProps) {
  const [count, setCount] = React.useState(0);
  const countRef = React.useRef(0);
  const rafRef = React.useRef<number>();

  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = countRef.current;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Ease out cubic
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easeOutCubic;
      countRef.current = currentValue;
      setCount(currentValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(decimals);
    const [int, dec] = fixed.split(".");

    // Add thousand separators
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

    return decimals > 0 ? `${formattedInt}.${dec}` : formattedInt;
  };

  return (
    <span className={cn("tabular-nums", className)} {...props}>
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  );
}
