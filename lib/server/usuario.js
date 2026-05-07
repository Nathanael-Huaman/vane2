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
 *     Busca un usuario por email. Valida formato de email antes de consultar.
 *     Nunca expone passwordHash. Si no existe retorna 404 generico.
 *     Si el input es invalido retorna 400.
 *
 *   getUsuarioById(id) → { ok: true, data: UsuarioPublico }
 *                      → { ok: false, error: { message, status } }
 *     Busca un usuario por id. Valida que id no sea vacio antes de consultar.
 *     Misma sanitizacion y manejo de errores que getUsuarioByEmail.
 *
 *   getCurrentUserFromDb(userId) → { ok: true, data: UsuarioPublico }
 *                                → { ok: false, error: { message, status } }
 *     Puente para resolucion de usuario autenticado desde BD.
 *     Diseñado para integrarse con tickets 04/05 cuando la sesion este disponible.
 *     Valida userId y retorna el usuario sanitizado o error controlado.
 */

import prisma from "@/lib/prisma";
import { toUsuarioPublico } from "@/lib/types";
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/server/response";
import { validateEmail, validateId } from "@/lib/server/validation";

export async function getUsuarioByEmail(email) {
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    return errorResponse(emailCheck.error, 400);
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
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
  const idCheck = validateId(id);
  if (!idCheck.valid) {
    return errorResponse(idCheck.error, 400);
  }

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

/**
 * Obtiene el usuario autenticado actual desde la base de datos propia.
 *
 * Punto de integracion para tickets 04 (sesion persistida) y 05 (Auth.js).
 * Cuando la sesion este disponible, el caller pasara el userId obtenido
 * desde la cookie/JWT y esta funcion retornara el usuario sanitizado.
 *
 * Mientras no exista sesion real, retorna 401 indicando que no hay
 * usuario autenticado.
 */
export async function getCurrentUserFromDb(userId) {
  if (!userId) {
    return errorResponse("No hay sesion activa", 401);
  }

  return getUsuarioById(userId);
}
