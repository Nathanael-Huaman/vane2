/**
 * Helpers de acceso a usuarios para Server Actions.
 *
 * Todas las funciones consultan la base de datos propia via Prisma,
 * sanitizan el resultado con toUsuarioPublico (eliminando passwordHash)
 * y retornan el contrato estandarizado de respuesta:
 *   { ok: true, data } o { ok: false, error: { message, status } }
 *
 * Contratos:
 *
 *   getUsuarioByEmail(email) → { ok: true, data: UsuarioPublico }
 *                           → { ok: false, error: { message, status } }
 *     Busca un usuario por email. Nunca expone passwordHash.
 *     Si no existe retorna 404 generico sin revelar si el email esta registrado.
 *
 *   getUsuarioById(id) → { ok: true, data: UsuarioPublico }
 *                      → { ok: false, error: { message, status } }
 *     Busca un usuario por id. Misma sanitizacion y manejo de errores.
 */

import prisma from "@/lib/prisma";
import { toUsuarioPublico } from "@/lib/types";
import { notFoundResponse, serverErrorResponse } from "@/lib/server/response";

export async function getUsuarioByEmail(email) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return notFoundResponse("Usuario no encontrado");
    }

    return {
      ok: true,
      data: toUsuarioPublico(usuario),
    };
  } catch (error) {
    return serverErrorResponse("Error al buscar el usuario", {
      action: "getUsuarioByEmail",
      email,
      message: error.message,
    });
  }
}

export async function getUsuarioById(id) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      return notFoundResponse("Usuario no encontrado");
    }

    return {
      ok: true,
      data: toUsuarioPublico(usuario),
    };
  } catch (error) {
    return serverErrorResponse("Error al buscar el usuario", {
      action: "getUsuarioById",
      id,
      message: error.message,
    });
  }
}
