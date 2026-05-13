"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { Button } from "@/components/ui/button";
import { AuthFeedbackBanner } from "@/components/auth-feedback-banner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButtonContent } from "@/components/loading-button-content";
import { AUTH_FEEDBACK_MESSAGES } from "@/lib/auth/feedback";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FALLBACK_SUCCESS_MESSAGE =
  "Si existe una cuenta asociada a ese correo, enviaremos un enlace de recuperacion en unos minutos.";
const SECURITY_NEUTRAL_NOTE =
  "Por seguridad, mostraremos la misma confirmacion aunque el correo no exista en el sistema o el flujo entre en enfriamiento futuro.";

function validateEmail(value) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "El correo electronico es requerido";
  }

  if (!EMAIL_REGEX.test(normalized)) {
    return "El formato del correo no es valido";
  }

  return "";
}

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const nextError = validateEmail(normalizedEmail);

    setError(nextError);
    setGlobalError("");
    setSuccessMessage("");

    if (nextError) {
      return;
    }

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email: normalizedEmail });

      if (!result.ok) {
        if (result.error?.status === 400) {
          setError(result.error.message || "El formato del correo no es valido");
          return;
        }

        setGlobalError(AUTH_FEEDBACK_MESSAGES.passwordResetRequestError);
        return;
      }

      setSubmittedEmail(normalizedEmail);
      setSuccessMessage(result.data?.message || FALLBACK_SUCCESS_MESSAGE);
      setEmail("");
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Recuperar contrasena</CardTitle>
        <CardDescription>
          Ingresa tu correo y te enviaremos un enlace seguro para continuar.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {successMessage && (
          <AuthFeedbackBanner
            tone="success"
            title="Solicitud registrada"
            message={successMessage}
            description={
              submittedEmail
                ? `Revisa spam o promociones si no lo ves pronto. Correo ingresado: ${submittedEmail}`
                : "Revisa tambien spam o promociones si no lo ves en tu bandeja."
            }
          />
        )}

        {globalError && (
          <AuthFeedbackBanner
            tone="error"
            title="No se pudo continuar"
            message={globalError}
            description="Intenta nuevamente en unos segundos."
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@correo.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError("");
                if (globalError) setGlobalError("");
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "password-reset-email-error" : undefined}
              disabled={isPending}
            />
            {error && (
              <p
                id="password-reset-email-error"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
            <LoadingButtonContent
              label={AUTH_FEEDBACK_MESSAGES.passwordResetRequestLoading}
            />
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" aria-hidden="true" />
                Enviar enlace de recuperacion
              </span>
            )}
          </Button>
        </form>

        <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {SECURITY_NEUTRAL_NOTE}
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4 hover:text-primary/80 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio de sesion
        </Link>
      </CardContent>
    </Card>
  );
}
