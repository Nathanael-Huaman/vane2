"use client";

import { useAuth } from "@/hooks/use-auth";
import { isAdmin, isCliente } from "@/lib/auth/flags";

/**
 * Guarda de acceso por rol.
 *
 * Muestra children solo si el usuario autenticado tiene uno de los
 * roles permitidos. Mientras carga, no renderiza nada (o fallback).
 *
 * Props:
 *   allowedRoles: string[]  — lista de roles permitidos, ej. ["cliente", "administrador"]
 *   fallback?: ReactNode    — contenido alternativo cuando no hay acceso
 */
export function RoleGuard({ children, allowedRoles, fallback = null }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return fallback;
  if (!allowedRoles.includes(user.role)) return fallback;

  return children;
}

/**
 * Guarda exclusiva para administradores.
 */
export function AdminOnly({ children, fallback = null }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || !isAdmin(user.role)) return fallback;

  return children;
}

/**
 * Guarda exclusiva para clientes.
 */
export function ClienteOnly({ children, fallback = null }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || !isCliente(user.role)) return fallback;

  return children;
}
