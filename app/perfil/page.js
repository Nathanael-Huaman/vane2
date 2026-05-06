"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminOnly, ClienteOnly } from "@/components/role-guard";
import { User, Shield, ShoppingBag } from "lucide-react";

export default function PerfilPage() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-40 w-full max-w-md" />
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
          <h1 className="text-2xl font-bold tracking-tight">Perfil de usuario</h1>
        </div>

        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle>Sesion no iniciada</CardTitle>
              <CardDescription>
                No hay una sesion activa en este momento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Inicia sesion para ver la informacion de tu cuenta y los paneles
                disponibles segun tu rol.
              </p>
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
                  <span className="text-sm text-muted-foreground">Rol asignado</span>
                  <Badge variant={isAdmin ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  ID de usuario: <span className="font-mono">{user.id}</span>
                </div>
              </CardContent>
            </Card>

            <AdminOnly>
              <Card className="border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle className="text-base">Panel de administrador</CardTitle>
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

            <ClienteOnly>
              <Card className="border-secondary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag
                      className="h-4 w-4 text-secondary-foreground"
                      aria-hidden="true"
                    />
                    <CardTitle className="text-base">Panel de cliente</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Este contenido solo es visible para usuarios con rol cliente.
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
