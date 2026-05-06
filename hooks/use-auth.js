"use client";

import { createContext, useContext } from "react";

/**
 * Contexto de autenticacion.
 *
 * Se inicializa en null y se provee via AuthProvider.
 */
export const AuthContext = createContext(null);

/**
 * Hook para consumir el estado de autenticacion.
 *
 * Retorna:
 *   {
 *     user: UsuarioPublico | null,
 *     loading: boolean,
 *     isAuthenticated: boolean,
 *     isAdmin: boolean,
 *     isCliente: boolean,
 *   }
 *
 * @throws {Error} Si se usa fuera de un AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return ctx;
}
