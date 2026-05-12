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
 *     Consulta el rol desde la BD propia. Valida el email antes de consultar.
 *     Lanza errores genericos (sin exponer datos). Registra detalles tecnicos
 *     en el logger seguro para diagnostico interno.
 *
 *   isAdmin(role) → boolean
 *     Retorna true si el rol es "administrador".
 *
 *   isCliente(role) → boolean
 *     Retorna true si el rol es "cliente".
 */

import prisma from "@/lib/prisma";
import { ROLES_PERMITIDOS } from "@/lib/types";
import { logError, validateEmail } from "@/lib/server/shared";

export async function resolveRoleFromDb(email) {
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    logError("resolveRoleFromDb: email invalido", { email });
    throw new Error("Email invalido");
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { role: true },
    });

    if (!usuario) {
      logError("resolveRoleFromDb: usuario no encontrado", {
        action: "resolveRoleFromDb",
        email,
      });
      throw new Error("Usuario no encontrado");
    }

    if (!ROLES_PERMITIDOS.includes(usuario.role)) {
      logError("resolveRoleFromDb: rol invalido en BD", {
        action: "resolveRoleFromDb",
        email,
        role: usuario.role,
      });
      throw new Error("Rol no autorizado");
    }

    return usuario.role;
  } catch (error) {
    if (error.message === "Usuario no encontrado" ||
        error.message === "Rol no autorizado" ||
        error.message === "Email invalido") {
      throw error;
    }

    logError("resolveRoleFromDb: error inesperado", {
      action: "resolveRoleFromDb",
      email,
      message: error.message,
    });
    throw new Error("Error al resolver el rol del usuario");
  }
}

export function isAdmin(role) {
  return role === "administrador";
}

export function isCliente(role) {
  return role === "cliente";
}
