"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { setCurrentViewMode } from "@/lib/actions/view-mode";
import {
  VIEW_MODE_ADMINISTRADOR,
  VIEW_MODE_CLIENTE,
} from "@/lib/types";
import { MonitorCog, Sparkles, AlertTriangle } from "lucide-react";

export function AdminViewModeSwitcher({ currentViewMode }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleChange(nextViewMode) {
    if (nextViewMode === currentViewMode || isPending) {
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const result = await setCurrentViewMode(nextViewMode);
      if (!result.ok) {
        setError(result.error.message || "No se pudo cambiar la vista");
        return;
      }

      window.location.reload();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Selector de vista del administrador
          </p>
          <p className="text-sm text-muted-foreground">
            Cambia entre experiencia cliente y experiencia administrador sin
            perder permisos reales.
          </p>
        </div>
        <Badge variant="outline">
          Modo actual:{" "}
          {currentViewMode === VIEW_MODE_ADMINISTRADOR
            ? "vista administrador"
            : "vista cliente"}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant={
            currentViewMode === VIEW_MODE_CLIENTE ? "default" : "outline"
          }
          className="gap-2"
          disabled={isPending}
          onClick={() => handleChange(VIEW_MODE_CLIENTE)}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {isPending && currentViewMode !== VIEW_MODE_CLIENTE
            ? "Cambiando..."
            : "Vista cliente"}
        </Button>
        <Button
          type="button"
          variant={
            currentViewMode === VIEW_MODE_ADMINISTRADOR ? "default" : "outline"
          }
          className="gap-2"
          disabled={isPending}
          onClick={() => handleChange(VIEW_MODE_ADMINISTRADOR)}
        >
          <MonitorCog className="h-4 w-4" aria-hidden="true" />
          {isPending && currentViewMode !== VIEW_MODE_ADMINISTRADOR
            ? "Cambiando..."
            : "Vista administrador"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>No se pudo cambiar la vista</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
