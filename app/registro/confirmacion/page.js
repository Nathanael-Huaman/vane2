import Link from "next/link";
import { MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegistroConfirmacionPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          OBSTEDESIGN
        </h1>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <MailCheck
              className="h-10 w-10 text-primary"
              aria-hidden="true"
            />
          </div>
          <CardTitle>Revisa tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace para verificar tu cuenta.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Haz clic en el enlace del correo que te enviamos para activar tu
            cuenta. Revisa tambien la carpeta de spam si no lo encuentras en tu
            bandeja principal.
          </p>

          <Button variant="outline" className="w-full" asChild>
            <Link href="/">Volver al inicio de sesion</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
