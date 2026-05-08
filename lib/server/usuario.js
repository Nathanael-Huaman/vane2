/**
 * Helpers de acceso a usuarios para Server Actions.
 *
 * Todas las funciones consultan la base de datos propia via Prisma,
 * sanitizan el resultado con toUsuarioPublico (eliminando passwordHash)
 * y retornan el contrato estandarizado de respuesta:
 *   { ok: true, data } o { ok: false, error: { message, status } }
 *
 * Excepcion: getUsuarioByEmailForAuth retorna el registro completo
 * incluyendo passwordHash, exclusivamente para verificacion de
 * credenciales en el flujo de autenticacion.
 *
 * Contratos:
 *
 *   getUsuarioByEmail(email) → { ok: true, data: UsuarioPublico }
 *                           → { ok: false, error: { message, status } }
 *     Busca un usuario por email. Valida formato de email antes de consultar.
 *     Nunca expone passwordHash. Si no existe retorna 404 generico.
 *     Si el input es invalido retorna 400.
 *
 *   getUsuarioByEmailForAuth(email) → { ok: true, data: UsuarioConHash }
 *                                   → { ok: false, error: { message, status } }
 *     Busca un usuario por email incluyendo passwordHash.
 *     Exclusivo para verificacion de credenciales en el flujo de autenticacion.
 *     No sanitiza passwordHash del resultado.
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
 *     El rol se toma del mismo registro de usuario para evitar consultas redundantes.
 */

import prisma from "../prisma.js";
import { isRoleValid, toUsuarioPublico } from "../types.js";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
} from "./response.js";
import { validateEmail, validateId } from "./validation.js";

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

export async function getUsuarioByEmailForAuth(email) {
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
      data: usuario,
    };
  } catch (error) {
    return serverErrorResponse("Error al buscar el usuario para autenticacion", {
      action: "getUsuarioByEmailForAuth",
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

  const result = await getUsuarioById(userId);
  if (!result.ok) {
    return result;
  }

  if (!isRoleValid(result.data.role)) {
    return serverErrorResponse("No se pudo resolver el rol del usuario", {
      action: "getCurrentUserFromDb",
      userId,
      message: "Rol invalido en registro de usuario",
    });
  }

  return successResponse(result.data);
}
