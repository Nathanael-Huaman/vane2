"use server";

import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/server/response";
import { getCurrentUserFromDb, getUsuarioByEmail } from "@/lib/server/usuario";
import {
  createSessionForUser,
  getAuthenticatedSession,
} from "@/lib/server/auth-session";
import { validateCredentials } from "@/lib/server/validation";

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
      return sessionResult;
    }

    return getCurrentUserFromDb(sessionResult.data.userId);
  } catch (error) {
    return serverErrorResponse("No se pudo obtener el usuario autenticado", {
      action: "getCurrentUser",
      message: error.message,
    });
  }
}

/**
 * Inicia sesion mock con persistencia real en BD (solo desarrollo).
 *
 * Uso intencional:
 * - Permite validar ticket 04 antes de integrar Auth.js completo (ticket 05+).
 * - Requiere NODE_ENV=development y MOCK_AUTH=1 para evitar exposicion en prod.
 *
 * @param {{ email: string, password: string }} input
 * @returns {Promise<
 *   { ok: true, data: { userId: string } } |
 *   { ok: false, error: { message: string, status: number } }
 * >}
 */
export async function signInWithMockCredentials(input) {
  if (!(process.env.NODE_ENV === "development" && process.env.MOCK_AUTH === "1")) {
    return errorResponse("Metodo no disponible en este entorno", 403);
  }

  const email = input?.email;
  const password = input?.password;
  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    return errorResponse(validation.error, 400);
  }

  try {
    const userResult = await getUsuarioByEmail(email);
    if (!userResult.ok) {
      // Mensaje uniforme para no facilitar enumeracion de usuarios.
      return errorResponse("Credenciales invalidas", 401);
    }

    const createdSession = await createSessionForUser(userResult.data.id);
    if (!createdSession.ok) {
      return createdSession;
    }

    return successResponse({ userId: userResult.data.id });
  } catch (error) {
    return serverErrorResponse("No se pudo iniciar sesion", {
      action: "signInWithMockCredentials",
      email,
      message: error.message,
    });
  }
}
