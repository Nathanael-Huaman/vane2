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
