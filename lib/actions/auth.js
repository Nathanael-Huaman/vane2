"use server";

import { successResponse, unauthorizedResponse } from "@/lib/server/response";
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
    const mockUser = {
      id: "usr_dev_01",
      email: "dev@obstedesign.com",
      role: "administrador",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return successResponse(toUsuarioPublico(mockUser));
  }

  return unauthorizedResponse("No hay sesion activa");
}
