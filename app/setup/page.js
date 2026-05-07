import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { checkDatabaseStatus } from "@/lib/actions/db-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SetupClient from "./setup-client";

export const metadata = {
  title: "Obstedesign - Estado de la base de datos",
  description: "Verifica la conexion y el motor de persistencia configurado.",
};

export default async function SetupPage() {
  const initial = await checkDatabaseStatus();

  if (!initial.ok && [401, 403].includes(initial.error.status)) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldAlert className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              Acceso restringido
            </h1>
            <p className="mt-2 text-muted-foreground">
              Esta verificacion solo esta disponible para usuarios autorizados.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>No puedes acceder a esta seccion</CardTitle>
              <CardDescription>
                Si necesitas continuar, inicia sesion con una cuenta autorizada
                o vuelve a una seccion disponible para tu perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href="/perfil">Volver al perfil</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">Ir al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <SetupClient initial={initial} />;
}
