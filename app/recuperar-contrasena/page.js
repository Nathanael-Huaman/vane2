"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RecuperarContrasenaPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          OBSTEDESIGN
        </h1>
        <p className="mt-2 text-muted-foreground">
          Recuperacion de contrasena
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Proximamente</CardTitle>
          <CardDescription>
            La recuperacion de contrasena estara disponible pronto.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Si necesitas restablecer tu contrasena, contacta al administrador.
          </p>

          <Link
            href="/"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Volver al inicio de sesion
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}