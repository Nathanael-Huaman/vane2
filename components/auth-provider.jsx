"use client";

import { useEffect, useMemo } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { AuthContext } from "@/hooks/use-auth";
import { isAdmin, isCliente } from "@/lib/auth/flags";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Proveedor interno que lee la sesion de Auth.js y expone
 * el estado de autenticacion via AuthContext.
 */
function AuthStateProvider({ children }) {
  const { data: session, status } = useSession();

  const loading = status === "loading";
  const user = session?.user || null;
  const error = status === "error";

  useEffect(() => {
    if (!isDev) return;
    console.info("[auth-provider] Estado de sesion", {
      status,
      hasSession: Boolean(session),
      hasUser: Boolean(session?.user),
      userEmail: session?.user?.email ?? null,
      userRole: session?.user?.role ?? null,
    });
  }, [session, status]);

  const value = useMemo(
    () => ({
      user: user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
            emailVerificado: user.emailVerificado ?? false,
            createdAt: null,
            updatedAt: null,
          }
        : null,
      loading,
      error: status !== "loading" && error,
      isAuthenticated: status === "authenticated" && !!user,
      isAdmin: isAdmin(user?.role),
      isCliente: isCliente(user?.role),
    }),
    [user, loading, error, status]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/**
 * Proveedor de autenticacion para toda la aplicacion.
 *
 * Gestiona:
 *   - SessionProvider de Auth.js (next-auth/react).
 *   - Estados de loading, error y sin sesion.
 *   - Flags derivados de rol (isAdmin, isCliente).
 *
 * Uso: envolver la app en layout.js junto a ThemeProvider.
 */
export function AuthProvider({ children }) {
  return (
    <SessionProvider>
      <AuthStateProvider>{children}</AuthStateProvider>
    </SessionProvider>
  );
}
