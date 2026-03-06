"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ReactNode;
};

export function ChartContainer({ config, className, children, ...props }: ChartContainerProps) {
  const style = React.useMemo(() => {
    return Object.entries(config).reduce<React.CSSProperties>((acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}` as keyof React.CSSProperties] = value.color;
      }
      return acc;
    }, {});
  }, [config]);

  return (
    <div
      className={cn(
        "flex aspect-square justify-center text-xs [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border/50 [&_.recharts-sector]:outline-none",
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
