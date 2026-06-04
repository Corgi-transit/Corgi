"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className, children, ...rest }) => {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden bg-neutral-900 dark:bg-neutral-800 shadow-lg text-white",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
