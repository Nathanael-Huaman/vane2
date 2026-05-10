"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MailCheck, MailX } from "lucide-react";
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

export default function VerificarEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState({ tone: "success", message: "" });

  useEffect(() => {
    let isMounted = true;

    async function runVerification() {
      if (!token) {
        router.replace("/");
        return;
      }

      setStatus("loading");
      setMessage("");

      try {
        const res = await fetch(
          `/api/auth/verificar-email?token=${encodeURIComponent(token)}`,
          { method: "GET" }
        );
        const data = await res.json().catch(() => ({}));

        if (!isMounted) return;

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error || "No pudimos verificar tu correo.");
          return;
        }

        setStatus("success");
        setMessage(data?.message || "Correo verificado correctamente.");
      } catch {
        if (!isMounted) return;
        setStatus("error");
        setMessage("No pudimos verificar tu correo.");
      }
    }

    runVerification();
    return () => {
      isMounted = false;
    };
  }, [router, token]);

  async function handleResend() {
    if (resendLoading) return;
    setResendFeedback({ tone: "success", message: "" });
    setResendLoading(true);

    try {
      const res = await fetch("/api/auth/reenviar-verificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email ? { email } : {}),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResendFeedback({
          tone: "error",
          message: data?.error || "No se pudo reenviar el correo. Intenta nuevamente.",
        });
        return;
      }

      setResendFeedback({
        tone: "success",
        message: "Te enviamos un nuevo correo de verificacion.",
      });
    } catch {
      setResendFeedback({
        tone: "error",
        message: "No se pudo reenviar el correo. Intenta nuevamente.",
      });
    } finally {
      setResendLoading(false);
    }
  }

  const isSuccess = status === "success";
  const isError = status === "error";
  const Icon = isSuccess ? MailCheck : MailX;
  const title = isSuccess ? "Correo verificado" : isError ? "No se pudo verificar" : "Verificando";
  const description = isSuccess
    ? "Tu cuenta ya esta lista para usarse."
    : isError
      ? "El enlace puede ser invalido o haber expirado."
      : "Estamos confirmando tu enlace...";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">OBSTEDESIGN</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Icon
              className={`h-10 w-10 ${isSuccess ? "text-primary" : isError ? "text-destructive" : "text-muted-foreground"}`}
              aria-hidden="true"
            />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          {message ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {message}
            </p>
          ) : null}

          {resendFeedback.message ? (
            <AuthFeedbackBanner
              tone={resendFeedback.tone}
              message={resendFeedback.message}
              className="text-left"
            />
          ) : null}

          {isSuccess ? (
            <Button className="w-full" asChild>
              <Link href="/tienda">Ir a la tienda</Link>
            </Button>
          ) : null}

          {isError ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? (
                <LoadingButtonContent label="Reenviando" />
              ) : (
                "Reenviar correo de verificacion"
              )}
            </Button>
          ) : null}

          {status === "loading" ? (
            <Button type="button" variant="outline" className="w-full" disabled>
              <LoadingButtonContent label="Verificando..." />
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

