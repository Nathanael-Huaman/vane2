"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useAuth } from "@/hooks/use-auth";
import { signInWithGoogle } from "@/lib/auth/auth-client";
import {
  AUTH_FEEDBACK_MESSAGES,
  getSafeAuthErrorFromQuery,
} from "@/lib/auth/feedback";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isDev = process.env.NODE_ENV !== "production";

function logLoginDebug(message, details = null) {
  if (!isDev) return;
  console.info(`[login-page] ${message}`, details ?? "");
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleProviderEnabled, setGoogleProviderEnabled] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [ignoreAuthErrorParam, setIgnoreAuthErrorParam] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const authErrorFromQuery = getSafeAuthErrorFromQuery(searchParams.get("error"));
  const resolvedGlobalError =
    globalError || (ignoreAuthErrorParam ? "" : authErrorFromQuery);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/tienda");
    }
  }, [authLoading, isAuthenticated, router]);

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

  function validateField(name, value) {
    if (name === "email") {
      if (!value.trim()) return "El correo electronico es requerido";
      if (!EMAIL_REGEX.test(value.trim()))
        return "El formato del correo no es valido";
    }
    if (name === "password") {
      if (!value) return "La contrasena es requerida";
      if (value.length < 8)
        return "La contrasena debe tener al menos 8 caracteres";
    }
    return "";
  }

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
    const normalizedEmail = formData.email.trim().toLowerCase();

    const newErrors = {
      email: validateField("email", normalizedEmail),
      password: validateField("password", formData.password),
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
            description="Te redirigimos automaticamente si ya tienes una sesion activa."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Branding Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          OBSTEDESIGN
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bienvenido de nuevo a tu cuenta
        </p>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Iniciar sesion</CardTitle>
          <CardDescription>
            Ingresa tus datos para acceder a tu cuenta
          </CardDescription>
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
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="***************"
                value={formData.password}
                onChange={handleChange}
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                disabled={loading}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember + Forgot */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                Recordarme
              </label>
              <Link
                href="/recuperar-contrasena"
                className="text-sm text-primary underline underline-offset-4 hover:text-primary/80 cursor-pointer"
                tabIndex={loading ? -1 : undefined}
                aria-disabled={loading}
              >
                Olvidaste tu contrasena?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
              <LoadingButtonContent
                label={AUTH_FEEDBACK_MESSAGES.credentialsLoading}
              />
              ) : (
                "Iniciar sesion con correo"
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  o continuar con
                </span>
              </div>
            </div>

            {/* Google Button */}
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
                  Iniciar sesion con Google
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <p className="mt-6 text-center text-xs text-muted-foreground max-w-sm">
        Nota: Clientes y administradores ingresan desde esta misma pantalla. El
        sistema identifica el rol despues del acceso.
      </p>
    </div>
  );
}
