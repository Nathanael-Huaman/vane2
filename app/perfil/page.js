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
import { AdminOnly, ClienteOnly } from "@/components/role-guard";
import { User, Shield, ShoppingBag, AlertTriangle } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { getAuthenticatedSession } from "@/lib/server/auth-session";
import { isAdmin as isAdminRole } from "@/lib/auth/flags";

export default async function PerfilPage() {
  const sessionResult = await getAuthenticatedSession();
  const user = sessionResult.ok ? sessionResult.data : null;
  const isAuthenticated = sessionResult.ok;
  const isAdmin = isAdminRole(user?.role);
  const hasAuthError = !sessionResult.ok && sessionResult.error.status !== 401;

  if (hasAuthError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle
                className="h-5 w-5 text-destructive"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Perfil de usuario
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>No se pudo verificar tu sesion</CardTitle>
              <CardDescription>
                Ocurrio un problema al comprobar tu estado de autenticacion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Por favor, intenta nuevamente mas tarde. Si el problema persiste,
                contacta a soporte.
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

        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle>Sesion no iniciada</CardTitle>
              <CardDescription>
                No hay una sesion activa en este momento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Inicia sesion para ver la informacion de tu cuenta y los paneles
                disponibles segun tu rol.
              </p>
              <Button className="w-full" asChild>
                <Link href="/">Iniciar sesion</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
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
                <SignOutButton />
              </CardContent>
            </Card>

            <AdminOnly role={user.role}>
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
            </AdminOnly>

            <ClienteOnly role={user.role}>
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
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Este contenido solo es visible para usuarios con rol
                    cliente.
                  </p>
                </CardContent>
              </Card>
            </ClienteOnly>
          </>
        )}
      </div>
    </div>
  );
}
