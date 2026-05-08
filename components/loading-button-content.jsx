"use client";

import { Loader2 } from "lucide-react";

export function LoadingButtonContent({ label }) {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}
