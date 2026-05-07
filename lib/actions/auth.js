"use server";

import { cookies } from "next/headers";
import {
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/server/response";
import { getCurrentUserFromDb } from "@/lib/server/usuario";
import { toUsuarioPublico } from "@/lib/types";

/**
 * Obtiene el usuario autenticado actual.
 *
 * Contrato de salida (exito):
 *   { ok: true, data: UsuarioPublico }
 *
 * Contrato de salida (sin sesion):
 *   { ok: false, error: { message: string, status: 401 } }
 *
 * TODO: Integrar con sistema de sesiones persistentes (Ticket 04+)
 * cuando las cookies / JWT esten disponibles.
 */
export async function getCurrentUser() {
  // En desarrollo se puede activar un mock para validar el contrato
  // sin depender de autenticacion real. En produccion siempre retorna
  // unauthorized hasta que se implemente la sesion.
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
    return successResponse(toUsuarioPublico(mockUser));
  }

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("ob_session_user_id")?.value;

    if (!userId) {
      return unauthorizedResponse("No hay sesion activa");
    }

    return getCurrentUserFromDb(userId);
  } catch (error) {
    return serverErrorResponse("No se pudo obtener el usuario autenticado", {
      action: "getCurrentUser",
      message: error.message,
    });
  }
}
