import { cn } from "@/lib/utils";

/**
 * Componente Skeleton para estados de carga.
 *
 * Usa animate-pulse y bg-muted para indicar contenido en espera
 * sin layout shift.
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
