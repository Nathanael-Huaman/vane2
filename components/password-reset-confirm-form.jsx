"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
} from "lucide-react";
import { resetPasswordWithTokenAction } from "@/lib/actions/password-reset";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function validatePassword(password) {
  if (!password) {
    return "La contrasena es requerida";
  }

  if (password.length < 8) {
    return "La contrasena debe tener al menos 8 caracteres";
  }

  return "";
}

export function PasswordResetConfirmForm({ email, token, expiresAt }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const expiresAtLabel = useMemo(() => {
    if (!expiresAt) return "";
    const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [expiresAt]);

  function handleSubmit(event) {
    event.preventDefault();
    setFieldError("");
    setGlobalError("");
    setSuccessMessage("");

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFieldError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFieldError("Las contrasenas no coinciden");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordWithTokenAction({
        email,
        token,
        password,
      });

      if (!result.ok) {
        if (result.error?.status === 400) {
          setFieldError(result.error.message);
          return;
        }

        setGlobalError("No se pudo actualizar la contrasena. Intenta nuevamente.");
        return;
      }

      setSuccessMessage(result.data?.message || "Contrasena actualizada correctamente.");
      setPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Configura tu nueva contrasena</CardTitle>
        <CardDescription>
          Usa una clave segura y diferente a las anteriores.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 text-sm text-muted-foreground">
          <p>Cuenta: {email}</p>
          {expiresAtLabel && <p>El enlace expira: {expiresAtLabel}</p>}
          <p>
            Si el sistema detecta demasiados intentos en el futuro, mantendra
            mensajes minimos para proteger la cuenta.
          </p>
        </div>

        {successMessage && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <AlertTitle>Contrasena actualizada</AlertTitle>
            <AlertDescription>
              <p>{successMessage}</p>
              <p className="text-xs text-muted-foreground">
                Ya puedes volver al login e iniciar sesion con tu nueva clave.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {globalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>No se pudo completar el restablecimiento</AlertTitle>
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contrasena</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldError) setFieldError("");
              }}
              disabled={isPending || Boolean(successMessage)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contrasena</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (fieldError) setFieldError("");
              }}
              disabled={isPending || Boolean(successMessage)}
            />
          </div>

          {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isPending || Boolean(successMessage)}
            aria-busy={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Actualizando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Guardar nueva contrasena
              </span>
            )}
          </Button>
        </form>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio de sesion
        </Link>
      </CardContent>
    </Card>
  );
}
