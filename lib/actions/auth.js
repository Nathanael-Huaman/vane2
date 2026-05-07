"use server";

import {
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/server/response";
import { getCurrentUserFromDb } from "@/lib/server/usuario";
import { getAuthenticatedSession } from "@/lib/server/auth-session";

/**
 * Obtiene el usuario autenticado actual.
 *
 * Contrato de salida (exito):
 *   { ok: true, data: UsuarioPublico }
 *
 * Contrato de salida (sin sesion):
 *   { ok: false, error: { message: string, status: 401 } }
 *
 * Resuelve la identidad desde una sesion persistida validada por token.
 * No confia en userId enviado por cliente.
 */
export async function getCurrentUser() {
  // En desarrollo se puede activar un mock para validar el contrato
  // sin depender de autenticacion real.
  if (process.env.NODE_ENV === "development" && process.env.MOCK_AUTH === "1") {
    const mockRoleRaw = process.env.MOCK_ROLE;
    const mockRole =
      mockRoleRaw === "administrador" || mockRoleRaw === "cliente"
        ? mockRoleRaw
        : "cliente";

    const mockUser = {
      id: "usr_dev_01",
      email: "dev@obstedesign.com",
      role: mockRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return successResponse(mockUser);
  }

  try {
    const sessionResult = await getAuthenticatedSession();
    if (!sessionResult.ok) {
      return unauthorizedResponse("No hay sesion activa");
    }

    return getCurrentUserFromDb(sessionResult.data.userId);
  } catch (error) {
    return serverErrorResponse("No se pudo obtener el usuario autenticado", {
      action: "getCurrentUser",
      message: error.message,
    });
  }
}
