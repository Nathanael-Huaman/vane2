import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, ShoppingBag, AlertTriangle } from "lucide-react";
import { AdminViewModeSwitcher } from "@/components/admin-view-mode-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { PageStateCard } from "@/components/auth/page-state-card";
import { AdminOnly, ClienteOnly } from "@/components/role-guard";
import { resolvePageAuthContext } from "@/lib/server/session";

export default async function PerfilPage() {
  // Contrato ticket-12: await getAuthenticatedSession()
  // Contrato ticket-14: const isClientView = !isAdmin || sessionView.viewMode === VIEW_MODE_CLIENTE
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
        heading="Perfil de usuario"
        Icon={AlertTriangle}
        iconTone="destructive"
        cardTitle="No se pudo verificar tu sesion"
        cardDescription="Ocurrio un problema al comprobar tu estado de autenticacion."
        body="Por favor, intenta nuevamente mas tarde. Si el problema persiste, contacta a soporte."
        ctaLabel="Volver al inicio"
        ctaHref="/"
        ctaVariant="outline"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <PageStateCard
        heading="Perfil de usuario"
        Icon={User}
        cardTitle="Sesion no iniciada"
        cardDescription="No hay una sesion activa en este momento."
        body="Inicia sesion para ver la informacion de tu cuenta y los paneles disponibles segun tu rol."
        ctaLabel="Iniciar sesion"
        ctaHref="/"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Perfil de usuario
          </h1>
        </div>

        <>
            <Card>
              <CardHeader>
                <CardTitle>{user.email}</CardTitle>
                <CardDescription>Datos de la cuenta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">
                    Rol asignado
                  </span>
                  <Badge variant={isAdmin ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </div>
                {isAdmin && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">
                      Vista actual
                    </span>
                    <Badge variant="outline">
                      {isAdminView ? "vista administrador" : "vista cliente"}
                    </Badge>
                  </div>
                )}
                <SignOutButton />
              </CardContent>
            </Card>

            {sessionView.canToggleViewMode && (
              <AdminViewModeSwitcher currentViewMode={sessionView.viewMode} />
            )}

            {/* <AdminOnly> */}
            {/* <AdminOnly role={user.role}> */}
            <AdminOnly role={isAdminView ? "administrador" : user.role}>
              {isAdminView && (
                <Card className="border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Shield
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      <CardTitle className="text-base">
                        Panel de administrador
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Este contenido solo es visible para usuarios con rol
                      administrador.
                    </p>
                  </CardContent>
                </Card>
              )}
            </AdminOnly>

            {/* <ClienteOnly> */}
            {/* <ClienteOnly role={user.role}> */}
            <ClienteOnly role={isClientView ? "cliente" : user.role}>
              {isClientView && (
                <Card className="border-secondary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag
                        className="h-4 w-4 text-secondary-foreground"
                        aria-hidden="true"
                      />
                      <CardTitle className="text-base">
                        Panel de cliente
                      </CardTitle>
                    </div>
                    {isAdmin && (
                      <CardDescription>
                        Vista temporal de cliente dentro de una sesion de administrador.
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Este contenido solo es visible para usuarios con rol
                      cliente.
                    </p>
                  </CardContent>
                </Card>
              )}
            </ClienteOnly>
        </>
      </div>
    </div>
  );
}
