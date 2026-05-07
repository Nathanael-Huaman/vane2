/**
 * Helpers de acceso a sesiones para Server Actions.
 *
 * Todas las funciones consultan la base de datos propia via Prisma,
 * sanitizan el resultado con toSesionPublica (eliminando sessionToken,
 * userAgent e ip) y retornan el contrato estandarizado de respuesta:
 *   { ok: true, data } o { ok: false, error: { message, status } }
 *
 * Contratos:
 *
 *   getSessionByToken(token) → { ok: true, data: SesionPublica }
 *                            → { ok: false, error: { message, status } }
 *     Busca una sesion por sessionToken. Valida que el token no este vacio
 *     antes de consultar. Nunca expone sessionToken, userAgent ni ip.
 *     Si no existe retorna 404 generico.
 *
 *   listSessionsByUser(userId, requestingUserId) → { ok: true, data: SesionPublica[] }
 *                                                 → { ok: false, error: { message, status } }
 *     Lista todas las sesiones de un usuario. Solo el propio usuario puede
 *     listar sus sesiones. Si requestingUserId no coincide con userId
 *     retorna 403. Cada sesion se sanitiza con toSesionPublica.
 *
 *   revokeSession(sessionId, requestingUserId) → { ok: true }
 *                                               → { ok: false, error: { message, status } }
 *     Revoca (elimina) una sesion por su id. Solo el dueño de la sesion
 *     puede revocarla. Si la sesion no existe retorna 404.
 *     Si requestingUserId no es el dueño retorna 403.
 *
 *   updateSessionViewMode(sessionId, requestingUserId, viewMode) → { ok: true, data: SesionPublica }
 *                                                                 → { ok: false, error: { message, status } }
 *     Actualiza el modo de vista asociado a una sesion. Solo el dueño
 *     de la sesion puede cambiarlo. No altera el role real del usuario.
 *
 *   createSession(userId, sessionToken, expiresAt, userAgent?, ip?) → { ok: true, data: SesionPublica }
 *                                                                    → { ok: false, error: { message, status } }
 *     Crea una nueva sesion persistida. Valida que userId, sessionToken
 *     y expiresAt esten presentes. Retorna la sesion sanitizada.
 */

import prisma from "@/lib/prisma";
import { toSesionPublica, VIEW_MODES_PERMITIDOS } from "@/lib/types";
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/server/response";
import { validateId, validateRequired } from "@/lib/server/validation";

export async function getSessionByToken(token) {
  const tokenCheck = validateRequired(token, "sessionToken");
  if (!tokenCheck.valid) {
    return errorResponse(tokenCheck.error, 400);
  }

  try {
    const sesion = await prisma.sesion.findUnique({
      where: { sessionToken: token },
    });

    if (!sesion) {
      return notFoundResponse("Sesion no encontrada");
    }

    return {
      ok: true,
      data: toSesionPublica(sesion),
    };
  } catch (error) {
    return serverErrorResponse("Error al buscar la sesion", {
      action: "getSessionByToken",
      message: error.message,
    });
  }
}

export async function listSessionsByUser(userId, requestingUserId) {
  const idCheck = validateId(userId);
  if (!idCheck.valid) {
    return errorResponse(idCheck.error, 400);
  }

  if (!requestingUserId || requestingUserId !== userId) {
    return forbiddenResponse("No tienes permiso para listar estas sesiones");
  }

  try {
    const sesiones = await prisma.sesion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(sesiones.map(toSesionPublica));
  } catch (error) {
    return serverErrorResponse("Error al listar las sesiones", {
      action: "listSessionsByUser",
      userId,
      message: error.message,
    });
  }
}

export async function revokeSession(sessionId, requestingUserId) {
  const idCheck = validateId(sessionId);
  if (!idCheck.valid) {
    return errorResponse(idCheck.error, 400);
  }

  try {
    const sesion = await prisma.sesion.findUnique({
      where: { id: sessionId },
    });

    if (!sesion) {
      return notFoundResponse("Sesion no encontrada");
    }

    if (sesion.userId !== requestingUserId) {
      return forbiddenResponse("No tienes permiso para revocar esta sesion");
    }

    await prisma.sesion.delete({
      where: { id: sessionId },
    });

    return successResponse(null);
  } catch (error) {
    return serverErrorResponse("Error al revocar la sesion", {
      action: "revokeSession",
      sessionId,
      message: error.message,
    });
  }
}

export async function updateSessionViewMode(sessionId, requestingUserId, viewMode) {
  const idCheck = validateId(sessionId);
  if (!idCheck.valid) {
    return errorResponse(idCheck.error, 400);
  }

  if (!VIEW_MODES_PERMITIDOS.includes(viewMode)) {
    return errorResponse("Modo de vista invalido", 400);
  }

  try {
    const sesion = await prisma.sesion.findUnique({
      where: { id: sessionId },
    });

    if (!sesion) {
      return notFoundResponse("Sesion no encontrada");
    }

    if (sesion.userId !== requestingUserId) {
      return forbiddenResponse("No tienes permiso para actualizar esta sesion");
    }

    const updated = await prisma.sesion.update({
      where: { id: sessionId },
      data: { viewMode },
    });

    return successResponse(toSesionPublica(updated));
  } catch (error) {
    return serverErrorResponse("Error al actualizar el modo de vista", {
      action: "updateSessionViewMode",
      sessionId,
      requestingUserId,
      message: error.message,
    });
  }
}

export async function createSession(userId, sessionToken, expiresAt, userAgent, ip) {
  const userIdCheck = validateId(userId);
  if (!userIdCheck.valid) {
    return errorResponse(userIdCheck.error, 400);
  }

  const tokenCheck = validateRequired(sessionToken, "sessionToken");
  if (!tokenCheck.valid) {
    return errorResponse(tokenCheck.error, 400);
  }

  if (!expiresAt) {
    return errorResponse("expiresAt es requerido", 400);
  }

  try {
    const sesion = await prisma.sesion.create({
      data: {
        userId,
        sessionToken,
        expiresAt: new Date(expiresAt),
        userAgent: userAgent || null,
        ip: ip || null,
      },
    });

    return {
      ok: true,
      data: toSesionPublica(sesion),
    };
  } catch (error) {
    return serverErrorResponse("Error al crear la sesion", {
      action: "createSession",
      userId,
      message: error.message,
    });
  }
}
