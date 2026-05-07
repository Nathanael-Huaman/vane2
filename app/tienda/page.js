import Link from "next/link";
import { Store, Sparkles, Shield, ShoppingBag, AlertTriangle } from "lucide-react";
import { AdminViewModeSwitcher } from "@/components/admin-view-mode-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthenticatedSession } from "@/lib/server/auth-session";
import { isAdmin as isAdminRole } from "@/lib/auth/flags";
import { resolveSessionViewMode } from "@/lib/server/view-mode";
import {
  VIEW_MODE_ADMINISTRADOR,
  VIEW_MODE_CLIENTE,
} from "@/lib/types";

export default async function TiendaPage() {
  const sessionResult = await getAuthenticatedSession();
  const user = sessionResult.ok ? sessionResult.data : null;
  const isAuthenticated = sessionResult.ok;
  const isAdmin = isAdminRole(user?.role);
  const hasAuthError = !sessionResult.ok && sessionResult.error.status !== 401;
  const sessionView = isAuthenticated
    ? await resolveSessionViewMode(user)
    : { viewMode: VIEW_MODE_CLIENTE, canToggleViewMode: false };
  const isAdminView = isAdmin && sessionView.viewMode === VIEW_MODE_ADMINISTRADOR;
  const isClientView = !isAdmin || sessionView.viewMode === VIEW_MODE_CLIENTE;

  if (hasAuthError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Entrada a la tienda</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>No se pudo cargar la tienda</CardTitle>
              <CardDescription>
                Ocurrio un problema al validar tu sesion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Intenta nuevamente en unos instantes.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">Volver al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Tienda Obstedesign</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sesion no iniciada</CardTitle>
              <CardDescription>
                Inicia sesion para entrar a la tienda.
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
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Tienda Obstedesign
            </h1>
            <p className="text-sm text-muted-foreground">
              Bienvenido, {user?.email}. Tu experiencia fue cargada segun tu rol.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? "administrador" : "cliente"}
            </Badge>
            {isAdmin && (
              <Badge variant="outline">
                {isAdminView ? "vista administrador" : "vista cliente"}
              </Badge>
            )}
            <SignOutButton className="w-auto" />
          </div>
        </header>

        {sessionView.canToggleViewMode && (
          <AdminViewModeSwitcher currentViewMode={sessionView.viewMode} />
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle>Catalogo principal</CardTitle>
            </div>
            <CardDescription>
              Seccion compartida para clientes y administradores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Desde aqui ambos roles pueden explorar la tienda y continuar con su flujo.
            </p>
          </CardContent>
        </Card>

        {isAdminView && (
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle>Opciones extra de administrador</CardTitle>
              </div>
              <CardDescription>
                Solo visible para usuarios con rol administrador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-primary/5 p-3 text-sm text-muted-foreground">
                Aqui se habilitan acciones administrativas dentro de la misma experiencia de tienda.
              </div>
            </CardContent>
          </Card>
        )}

        {isClientView && (
          <Card className="border-secondary/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-secondary-foreground" aria-hidden="true" />
                <CardTitle>Experiencia cliente activa</CardTitle>
              </div>
              {isAdmin && (
                <CardDescription>
                  Estas navegando como cliente dentro de tu sesion de administrador.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Estas en la vista base de compra. Las opciones administrativas se
                mantienen ocultas en esta experiencia.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
