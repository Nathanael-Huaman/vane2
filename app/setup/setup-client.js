"use client";

import { useState, useTransition } from "react";
import { checkDatabaseStatus } from "@/lib/actions/db-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

/**
 * @param {Object} props
 * @param {{ ok: boolean, data?: { connected: boolean, engine: string }, error?: { message: string, status: number } } | null} props.initial
 */
export default function SetupClient({ initial }) {
  const [result, setResult] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    startTransition(async () => {
      const next = await checkDatabaseStatus();
      setResult(next);
    });
  }

  const status = isPending
    ? "loading"
    : result?.ok
      ? "success"
      : result
        ? "error"
        : "loading";

  const engine = result?.data?.engine || null;
  const errorMessage = result?.error?.message || "";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Database className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Estado de la base de datos
        </h1>
        <p className="mt-2 text-muted-foreground">
          Verifica la conexion y el motor de persistencia configurado.
        </p>
      </div>

      {/* Status Card */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Diagnostico de conexion</CardTitle>
          <CardDescription>
            Resultado de la verificacion con Prisma
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Loading */}
          {status === "loading" && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 py-6"
            >
              <Loader2
                className="h-8 w-8 animate-spin text-primary"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                Verificando conexion con la base de datos...
              </p>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div role="status" aria-live="polite" className="space-y-4">
              <Alert>
                <CheckCircle
                  className="h-4 w-4 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <AlertTitle>Conexion exitosa</AlertTitle>
                <AlertDescription>
                  La base de datos responde correctamente.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">
                  Motor detectado
                </span>
                <Badge variant="secondary">
                  {engine === "postgresql" ? "PostgreSQL" : "SQLite"}
                </Badge>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div role="status" aria-live="assertive" className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Error de conexion</AlertTitle>
                <AlertDescription>
                  {errorMessage ||
                    "Ocurrio un error al verificar la base de datos."}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Retry Button */}
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleRetry}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Verificando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reintentar verificacion
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <p className="mt-6 text-center text-xs text-muted-foreground max-w-sm">
        Nota: Este diagnostico solo confirma conectividad. No expone credenciales
        ni detalles internos del servidor.
      </p>
    </div>
  );
}
