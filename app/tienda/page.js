import { Store, Sparkles, Shield, ShoppingBag, AlertTriangle } from "lucide-react";
import { AdminViewModeSwitcher } from "@/components/admin-view-mode-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { PageStateCard } from "@/components/auth/page-state-card";
import { AdminOnly, ClienteOnly } from "@/components/role-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolvePageAuthContext } from "@/lib/server/session";

export default async function TiendaPage() {
  // Contrato ticket-12: await getAuthenticatedSession()
  // Contrato ticket-14: const isAdminView = isAdmin && sessionView.viewMode === VIEW_MODE_ADMINISTRADOR
  const {
    user,
    isAuthenticated,
    isAdmin,
    hasAuthError,
    sessionView,
    isAdminView,
    isClientView,
  } = await resolvePageAuthContext();

  if (hasAuthError) {
    return (
      <PageStateCard
        heading="Entrada a la tienda"
        Icon={AlertTriangle}
        iconTone="destructive"
        cardTitle="No se pudo cargar la tienda"
        cardDescription="Ocurrio un problema al validar tu sesion."
        body="Intenta nuevamente en unos instantes."
        ctaLabel="Volver al inicio"
        ctaHref="/"
        ctaVariant="outline"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <PageStateCard
        heading="Tienda Obstedesign"
        Icon={Store}
        cardTitle="Sesion no iniciada"
        cardDescription="Inicia sesion para entrar a la tienda."
        ctaLabel="Iniciar sesion"
        ctaHref="/"
      />
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

        {/* <AdminOnly> */}
        {/* <AdminOnly role={user.role}> */}
        <AdminOnly role={isAdminView ? "administrador" : user.role}>
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
        </AdminOnly>

        {/* <ClienteOnly> */}
        {/* <ClienteOnly role={user.role}> */}
        <ClienteOnly role={isClientView ? "cliente" : user.role}>
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
        </ClienteOnly>
      </div>
    </div>
  );
}
