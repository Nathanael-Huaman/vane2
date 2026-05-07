"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthContext } from "@/hooks/use-auth";
import { getCurrentUser } from "@/lib/actions/auth";
import { isAdmin, isCliente } from "@/lib/auth/flags";

/**
 * Proveedor de autenticacion para toda la aplicacion.
 *
 * Gestiona:
 *   - Carga inicial del usuario autenticado.
 *   - Estados de loading, error y sin sesion.
 *   - Flags derivados de rol (isAdmin, isCliente).
 *
 * Uso: envolver la app en layout.js junto a ThemeProvider.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setUser(res.data);
          setError(false);
        } else {
          setUser(null);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: !!user,
      isAdmin: isAdmin(user?.role),
      isCliente: isCliente(user?.role),
    }),
    [user, loading, error]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
