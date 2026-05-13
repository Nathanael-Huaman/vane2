"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { AuthGoogleButton } from "@/components/auth-google-button";
import { AuthFeedbackBanner } from "@/components/auth-feedback-banner";
import { LoadingButtonContent } from "@/components/loading-button-content";
import { useGoogleProvider } from "@/hooks/use-google-provider";
import { useAuth } from "@/hooks/use-auth";
import { signInWithGoogle } from "@/lib/auth/auth-client";
import {
  AUTH_FEEDBACK_MESSAGES,
  getSafeAuthErrorFromQuery,
} from "@/lib/auth/feedback";
import {
  normalizeEmail,
  validateEmailInput,
  validatePasswordInput,
} from "@/lib/auth/client-validation";

const isDev = process.env.NODE_ENV !== "production";

function logLoginDebug(message, details = null) {
  if (!isDev) return;
  console.info(`[login-page] ${message}`, details ?? "");
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { googleProviderEnabled, providersLoading } = useGoogleProvider();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [ignoreAuthErrorParam, setIgnoreAuthErrorParam] = useState(false);
  const authErrorFromQuery = getSafeAuthErrorFromQuery(searchParams.get("error"));
  const resolvedGlobalError =
    globalError || (ignoreAuthErrorParam ? "" : authErrorFromQuery);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/tienda");
    }
  }, [authLoading, isAuthenticated, router]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIgnoreAuthErrorParam(true);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (globalError) setGlobalError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIgnoreAuthErrorParam(true);
    setGlobalError("");
    const normalizedEmail = normalizeEmail(formData.email);

    const newErrors = {
      email: validateEmailInput(normalizedEmail),
      password: validatePasswordInput(formData.password),
    };

    setErrors(newErrors);

    if (newErrors.email || newErrors.password) {
      return;
    }

    setLoading(true);
    e.currentTarget.elements.email.value = normalizedEmail;
    logLoginDebug("Enviando formulario nativo de credenciales", {
      email: normalizedEmail,
    });
    e.currentTarget.submit();
  }

  async function handleGoogleSignIn() {
    setIgnoreAuthErrorParam(true);
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

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm px-4">
          <AuthFeedbackBanner
            tone="info"
            title="Cargando acceso"
            message={AUTH_FEEDBACK_MESSAGES.authChecking}
            description="Te redirigimos automáticamente si ya tienes una sesión activa."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">OBSTEDESIGN</h1>
        <p className="mt-2 text-muted-foreground">Bienvenido de nuevo a tu cuenta</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Ingresa tus datos para acceder a tu cuenta</CardDescription>
        </CardHeader>

        <CardContent>
          {loading && (
            <AuthFeedbackBanner
              tone="info"
              title="Validando credenciales"
              message={AUTH_FEEDBACK_MESSAGES.credentialsLoading}
              description="Mantenemos el feedback minimo mientras el servidor confirma el acceso."
              className="mb-4"
            />
          )}

          {resolvedGlobalError && (
            <AuthFeedbackBanner
              tone="error"
              title="No se pudo iniciar sesion"
              message={resolvedGlobalError}
              description="Verifica tus datos o intenta nuevamente."
              className="mb-4"
            />
          )}

          <form
            onSubmit={handleSubmit}
            action="/api/auth/credentials-login"
            method="POST"
            className="space-y-4"
            noValidate
          >
            <input type="hidden" name="callbackUrl" value="/tienda" />
            <div className="space-y-2">
               <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="usuario@correo.com"
                value={formData.email}
                onChange={handleChange}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={loading}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
               <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="***************"
                value={formData.password}
                onChange={handleChange}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={loading}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex justify-end text-sm">
              <Link
                href="/recuperar-contrasena"
                className="text-sm text-primary underline underline-offset-4 hover:text-primary/80 cursor-pointer"
                tabIndex={loading ? -1 : undefined}
                aria-disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <LoadingButtonContent label={AUTH_FEEDBACK_MESSAGES.credentialsLoading} />
              ) : (
                "Iniciar sesión con correo"
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o continuar con</span>
              </div>
            </div>

            <AuthGoogleButton
              onClick={handleGoogleSignIn}
              loading={googleLoading}
              providersLoading={providersLoading}
              googleProviderEnabled={googleProviderEnabled}
              disabled={
                loading ||
                googleLoading ||
                providersLoading ||
                !googleProviderEnabled
              }
              idleLabel="Iniciar sesión con Google"
            />
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground max-w-sm">
        Nota: clientes y administradores ingresan desde esta misma pantalla. El sistema identifica el rol después del acceso.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-full max-w-sm px-4">
            <AuthFeedbackBanner
              tone="info"
              title="Cargando acceso"
              message={AUTH_FEEDBACK_MESSAGES.authChecking}
              description="Preparamos el formulario de acceso."
            />
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
