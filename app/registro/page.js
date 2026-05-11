"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProviders } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthFeedbackBanner } from "@/components/auth-feedback-banner";
import { LoadingButtonContent } from "@/components/loading-button-content";
import { signInWithGoogle } from "@/lib/auth/auth-client";
import { AUTH_FEEDBACK_MESSAGES } from "@/lib/auth/feedback";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleProviderEnabled, setGoogleProviderEnabled] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      try {
        const providers = await getProviders();
        if (!isMounted) return;
        setGoogleProviderEnabled(Boolean(providers?.google));
      } catch {
        if (!isMounted) return;
        setGoogleProviderEnabled(false);
      } finally {
        if (isMounted) setProvidersLoading(false);
      }
    }

    loadProviders();
    return () => {
      isMounted = false;
    };
  }, []);

  function validateFields(data) {
    const newErrors = {};

    if (!data.email.trim()) {
      newErrors.email = "El correo electronico es requerido";
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      newErrors.email = "El formato del correo no es valido";
    }

    if (!data.password) {
      newErrors.password = "La contrasena es requerida";
    } else if (data.password.length < 8) {
      newErrors.password = "La contrasena debe tener al menos 8 caracteres";
    }

    if (!data.confirmPassword) {
      newErrors.confirmPassword = "Confirma tu contrasena";
    } else if (data.confirmPassword !== data.password) {
      newErrors.confirmPassword = "Las contrasenas no coinciden";
    }

    return newErrors;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (globalError) setGlobalError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGlobalError("");

    const normalizedData = {
      ...formData,
      email: formData.email.trim().toLowerCase(),
    };

    const newErrors = validateFields(normalizedData);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedData.email,
          password: normalizedData.password,
          confirmPassword: normalizedData.confirmPassword,
        }),
      });

      if (res.status === 201) {
        router.push(
          `/registro/confirmacion?email=${encodeURIComponent(normalizedData.email)}`
        );
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setGlobalError(data.error || AUTH_FEEDBACK_MESSAGES.registroError);
        setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
        return;
      }

      setGlobalError(AUTH_FEEDBACK_MESSAGES.registroError);
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
    } catch {
      setGlobalError(AUTH_FEEDBACK_MESSAGES.registroError);
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGlobalError("");
    if (providersLoading) return;
    if (!googleProviderEnabled) {
      setGlobalError(AUTH_FEEDBACK_MESSAGES.googleUnavailable);
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        setGlobalError(result.error || AUTH_FEEDBACK_MESSAGES.googleError);
      }
    } catch {
      setGlobalError(AUTH_FEEDBACK_MESSAGES.googleError);
    } finally {
      setGoogleLoading(false);
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
        <p className="mt-2 text-muted-foreground">
          Crea tu cuenta y empieza a explorar
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Crear una cuenta</CardTitle>
          <CardDescription>
            Ingresa tus datos para registrarte
          </CardDescription>
        </CardHeader>

        <CardContent>
          {globalError && (
            <AuthFeedbackBanner
              tone="error"
              title="No se pudo crear la cuenta"
              message={globalError}
              description="Verifica tus datos o intenta nuevamente."
              className="mb-4"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="usuario@correo.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={loading}
              />
              {errors.email && (
                <p
                  id="email-error"
                  className="text-sm text-destructive"
                  aria-live="polite"
                >
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimo 8 caracteres"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={loading}
              />
              {errors.password && (
                <p
                  id="password-error"
                  className="text-sm text-destructive"
                  aria-live="polite"
                >
                  {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repite tu contrasena"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword ? "confirm-password-error" : undefined
                }
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p
                  id="confirm-password-error"
                  className="text-sm text-destructive"
                  aria-live="polite"
                >
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <LoadingButtonContent
                  label={AUTH_FEEDBACK_MESSAGES.registroLoading}
                />
              ) : (
                "Crear cuenta"
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={
                loading ||
                googleLoading ||
                providersLoading ||
                !googleProviderEnabled
              }
              aria-busy={googleLoading || providersLoading}
            >
              {googleLoading ? (
                <LoadingButtonContent
                  label={AUTH_FEEDBACK_MESSAGES.googleLoading}
                />
              ) : providersLoading ? (
                AUTH_FEEDBACK_MESSAGES.providersLoading
              ) : !googleProviderEnabled ? (
                "Google no disponible"
              ) : (
                <>
                  <svg
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Registrarse con Google
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/"
              className="text-primary underline underline-offset-4 hover:text-primary/80 cursor-pointer"
            >
              Inicia sesion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
