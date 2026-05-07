"use server";

import { cookies } from "next/headers";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/server/response";
import { listSessionsByUser } from "@/lib/server/sesion";
import { toActiveSessionView } from "@/lib/types";

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
    const cookieStore = await cookies();
    const userId = cookieStore.get("ob_session_user_id")?.value;

    if (!userId) {
      return unauthorizedResponse("No hay sesion activa");
    }

    const result = await listSessionsByUser(userId, userId);

    if (!result.ok) {
      return result;
    }

    return successResponse(result.data.map(toActiveSessionView));
  } catch (error) {
    return serverErrorResponse("No se pudieron obtener las sesiones activas", {
      action: "getActiveSessions",
      message: error.message,
    });
  }
}
