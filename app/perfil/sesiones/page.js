"use client";

import { useAuth } from "@/hooks/use-auth";
import { useActiveSessions } from "@/hooks/use-active-sessions";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert";
import {
  Monitor,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Activity,
} from "lucide-react";

export default function ActiveSessionsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { sessions, loading, error, refetch } = useActiveSessions();

  const isPageLoading = authLoading || loading;

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Sesiones activas
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sesion no iniciada</CardTitle>
              <CardDescription>
                Debes iniciar sesion para ver tus sesiones activas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" asChild>
                <Link href="/">Iniciar sesion</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Monitor
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Sesiones activas
          </h1>
        </div>

        {isPageLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!isPageLoading && error && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Error al cargar sesiones</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </Button>
            </AlertAction>
          </Alert>
        )}

        {!isPageLoading && !error && sessions && sessions.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No hay sesiones activas</CardTitle>
              <CardDescription>
                No encontramos sesiones asociadas a tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Si crees que esto es un error, intenta cerrar sesion y volver a
                iniciarla.
              </p>
            </CardContent>
          </Card>
        )}

        {!isPageLoading &&
          !error &&
          sessions &&
          sessions.length > 0 && (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        <CardTitle className="text-base">
                          Sesion {session.id.slice(-6)}
                        </CardTitle>
                      </div>
                      <Badge
                        variant={
                          session.status === "activa" ? "default" : "secondary"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      ID completo: {session.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-muted-foreground">
                        Creada el
                      </span>
                      <span className="text-sm font-medium">
                        {session.createdAtFormatted}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-muted-foreground">
                        Expira el
                      </span>
                      <span className="text-sm font-medium">
                        {session.expiresAtFormatted}
                      </span>
                    </div>

                    {/* TODO: Implementar revocacion de sesion individual (ticket futuro) */}
                    {/* <Button variant="destructive" size="sm" className="w-full mt-2">
                      Cerrar sesion
                    </Button> */}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        <Button variant="outline" className="w-full gap-1" asChild>
          <Link href="/perfil">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al perfil
          </Link>
        </Button>
      </div>
    </div>
  );
}
