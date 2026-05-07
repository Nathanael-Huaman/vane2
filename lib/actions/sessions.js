"use server";

import {
  successResponse,
  serverErrorResponse,
} from "@/lib/server/response";
import { listSessionsByUser, revokeSession } from "@/lib/server/sesion";
import { toActiveSessionView } from "@/lib/types";
import { getAuthenticatedSession } from "@/lib/server/auth-session";

/**
 * Obtiene las sesiones activas del usuario autenticado.
 *
 * Contrato de salida (exito):
 *   { ok: true, data: ActiveSessionView[] }
 *
 * Contrato de salida (sin sesion):
 *   { ok: false, error: { message: string, status: 401 } }
 *
 * Contrato de salida (error servidor):
 *   { ok: false, error: { message: string, status: 500 } }
 *
 * En desarrollo con MOCK_AUTH=1 retorna sesiones de prueba
 * para validar la UI sin depender de autenticacion real.
 */
export async function getActiveSessions() {
  if (process.env.NODE_ENV === "development" && process.env.MOCK_AUTH === "1") {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockSessions = [
      {
        id: "sess_dev_01",
        userId: "usr_dev_01",
        expiresAt: tomorrow,
        createdAt: now,
      },
      {
        id: "sess_dev_02",
        userId: "usr_dev_01",
        expiresAt: yesterday,
        createdAt: yesterday,
      },
    ];

    return successResponse(mockSessions.map(toActiveSessionView));
  }

  try {
    const sessionResult = await getAuthenticatedSession();
    if (!sessionResult.ok) {
      return sessionResult;
    }

    const userId = sessionResult.data.userId;
    const currentSessionId = sessionResult.data.id;

    const result = await listSessionsByUser(userId, userId);

    if (!result.ok) {
      return result;
    }

    return successResponse(
      result.data.map((session) =>
        toActiveSessionView(session, { currentSessionId })
      )
    );
  } catch (error) {
    return serverErrorResponse("No se pudieron obtener las sesiones activas", {
      action: "getActiveSessions",
      message: error.message,
    });
  }
}

/**
 * Revoca una sesion activa del usuario autenticado.
 *
 * Solo permite revocar sesiones del propio usuario. Si la sesion objetivo
 * no pertenece al usuario autenticado, la capa de servidor responde 403.
 *
 * @param {string} sessionId
 * @returns {Promise<
 *   { ok: true } |
 *   { ok: false, error: { message: string, status: number } }
 * >}
 */
export async function revokeActiveSession(sessionId) {
  try {
    const sessionResult = await getAuthenticatedSession();
    if (!sessionResult.ok) {
      return sessionResult;
    }

    return revokeSession(sessionId, sessionResult.data.userId);
  } catch (error) {
    return serverErrorResponse("No se pudo revocar la sesion", {
      action: "revokeActiveSession",
      sessionId,
      message: error.message,
    });
  }
}
