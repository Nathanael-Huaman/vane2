import Link from "next/link";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function RestablecerContrasenaPage({ searchParams }) {
  const params = await searchParams;
  const hasToken = Boolean(params?.token);
  const hasEmail = Boolean(params?.email);
  const isLinkComplete = hasToken && hasEmail;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Restablecer contrasena
        </h1>
        <p className="mt-2 text-muted-foreground">
          Confirmamos la apertura del enlace de recuperacion.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {isLinkComplete ? "Enlace recibido" : "Enlace incompleto"}
          </CardTitle>
          <CardDescription>
            {isLinkComplete
              ? "Tu solicitud de recuperacion ya contiene los datos necesarios para el siguiente paso."
              : "Vuelve a solicitar un nuevo enlace desde la pantalla de recuperacion."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Estado del enlace</span>
            <Badge variant={isLinkComplete ? "default" : "outline"}>
              {isLinkComplete ? "listo" : "incompleto"}
            </Badge>
          </div>

          {hasEmail && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 p-3 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              Correo asociado: {params.email}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-primary/10 bg-primary/5 p-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <p>
              Este acceso confirma la recepcion del enlace sin exponer detalles
              internos del sistema.
            </p>
          </div>

          <Link
            href="/recuperar-contrasena"
            className="inline-flex text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Solicitar otro enlace
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
