import { cookies } from "next/headers";
import { unauthorizedResponse } from "@/lib/server/response";
import { getSessionByToken } from "@/lib/server/sesion";

export const SESSION_TOKEN_COOKIE = "ob_session_token";

/**
 * Resuelve la sesion autenticada desde cookie httpOnly y base de datos.
 *
 * Flujo:
 * 1) Lee el token de sesion desde cookie segura.
 * 2) Busca la sesion persistida en base de datos.
 * 3) Verifica expiracion para evitar uso de sesiones vencidas.
 *
 * Nunca confia en un userId enviado por cliente.
 *
 * @returns {Promise<
 *   { ok: true, data: import("@/lib/types").SesionPublica } |
 *   { ok: false, error: { message: string, status: number } }
 * >}
 */
export async function getAuthenticatedSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_TOKEN_COOKIE)?.value;

  if (!sessionToken) {
    return unauthorizedResponse("No hay sesion activa");
  }

  const sessionResult = await getSessionByToken(sessionToken);
  if (!sessionResult.ok) {
    return unauthorizedResponse("No hay sesion activa");
  }

  const expiresAt = new Date(sessionResult.data.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return unauthorizedResponse("La sesion ha expirado");
  }

  return sessionResult;
}
