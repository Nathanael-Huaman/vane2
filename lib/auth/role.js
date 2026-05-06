/**
 * Resolucion de rol desde base de datos propia.
 *
 * El rol del usuario es un dato de negocio almacenado en la tabla usuarios.
 * Este modulo lo consulta directamente desde la BD, sin depender del
 * proveedor de autenticacion (credenciales, Google, etc.).
 *
 * Contratos:
 *
 *   resolveRoleFromDb(email) → "cliente" | "administrador"
 *     Consulta el rol desde la BD propia. Lanza si el usuario no existe.
 *
 *   isAdmin(role) → boolean
 *     Retorna true si el rol es "administrador".
 *
 *   isCliente(role) → boolean
 *     Retorna true si el rol es "cliente".
 */

import prisma from "@/lib/prisma";
import { ROLES_PERMITIDOS } from "@/lib/types";

export async function resolveRoleFromDb(email) {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { role: true },
  });

  if (!usuario) {
    throw new Error(`Usuario con email ${email} no encontrado en base de datos`);
  }

  if (!ROLES_PERMITIDOS.includes(usuario.role)) {
    throw new Error(`Rol invalido en base de datos: ${usuario.role}`);
  }

  return usuario.role;
}

export function isAdmin(role) {
  return role === "administrador";
}

export function isCliente(role) {
  return role === "cliente";
}
