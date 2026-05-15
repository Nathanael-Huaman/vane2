"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CONFIG = {
  error: {
    icon: AlertCircle,
    variant: "destructive",
  },
  success: {
    icon: CheckCircle2,
    variant: "default",
  },
  info: {
    icon: Info,
    variant: "default",
  },
  warning: {
    icon: TriangleAlert,
    variant: "default",
  },
};

export function AuthFeedbackBanner({
  tone = "info",
  title,
  message,
  description = null,
  className = "",
}) {
  if (!message) return null;

  const config = CONFIG[tone] || CONFIG.info;
  const Icon = config.icon;

  return (
    <Alert variant={config.variant} className={className}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription className={description ? "space-y-2" : undefined}>
        <p>{message}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </AlertDescription>
    </Alert>
  );
}
