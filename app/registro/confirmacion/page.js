"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { AuthFeedbackBanner } from "@/components/auth-feedback-banner";
import { LoadingButtonContent } from "@/components/loading-button-content";

export default function RegistroConfirmacionPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [resendLoading, setResendLoading] = useState(false);
  const [feedback, setFeedback] = useState({ tone: "success", message: "" });

  async function handleResend() {
    if (!email) {
      setFeedback({
        tone: "error",
        message: "No pudimos identificar tu correo. Vuelve a registrarte o inicia sesion.",
      });
      return;
    }

    setFeedback({ tone: "success", message: "" });
    setResendLoading(true);

    try {
      const res = await fetch("/api/auth/reenviar-verificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFeedback({
          tone: "error",
          message: data?.error || "No se pudo reenviar el correo. Intenta nuevamente.",
        });
        return;
      }

      setFeedback({
        tone: "success",
        message: "Te enviamos un nuevo correo de verificacion.",
      });
    } catch {
      setFeedback({
        tone: "error",
        message: "No se pudo reenviar el correo. Intenta nuevamente.",
      });
    } finally {
      setResendLoading(false);
    }
  }

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
          <CardTitle>¡Cuenta creada con exito!</CardTitle>
          <CardDescription>
            Te enviamos un correo para verificar tu direccion. Puedes hacerlo cuando quieras.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          {feedback.message ? (
            <AuthFeedbackBanner
              tone={feedback.tone}
              message={feedback.message}
              className="text-left"
            />
          ) : null}

          <Button variant="outline" className="w-full" asChild>
            <Link href="/">Ir al inicio de sesion</Link>
          </Button>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              ¿No recibiste el correo?
            </p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? (
                <LoadingButtonContent label="Reenviando" />
              ) : (
                "Reenviar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
