"use client";

import { useContext } from "react";
import { AuthContext } from "@/hooks/use-auth";
import { isRoleValid } from "@/lib/types";

/**
 * Guarda de acceso por rol.
 *
 * Muestra children solo si el usuario autenticado tiene uno de los
 * roles permitidos. Mientras carga, no renderiza nada (o fallback).
 *
 * Props:
 *   allowedRoles: string[]  — lista de roles permitidos, ej. ["cliente", "administrador"]
 *   role?: string          — rol resuelto externamente, util para render server-side
 *   fallback?: ReactNode   — contenido alternativo cuando no hay acceso
 */
export function RoleGuard({ children, allowedRoles, role, fallback = null }) {
  const authState = useContext(AuthContext);
  const user = authState?.user;
  const resolvedRole = role ?? authState?.user?.role ?? null;
  const isLoading = role === undefined && authState?.loading;

  if (isLoading) return null;
  if (user?.role && !isRoleValid(user.role)) return fallback;
  if (!resolvedRole) return fallback;
  if (!isRoleValid(resolvedRole)) return fallback;
  if (!allowedRoles.includes(resolvedRole)) return fallback;

  return children;
}

/**
 * Guarda exclusiva para administradores.
 */
export function AdminOnly({ children, role, fallback = null }) {
  return (
    <RoleGuard allowedRoles={["administrador"]} role={role} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * Guarda exclusiva para clientes.
 */
export function ClienteOnly({ children, role, fallback = null }) {
  return (
    <RoleGuard allowedRoles={["cliente"]} role={role} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
