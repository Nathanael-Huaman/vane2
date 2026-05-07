import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/server/response";
import { createSession, getSessionByToken } from "@/lib/server/sesion";

export const SESSION_TOKEN_COOKIE = "ob_session_token";
const SESSION_DURATION_DAYS = 7;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

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

/**
 * Crea una sesion persistida y registra la cookie httpOnly asociada.
 *
 * Nota de seguridad:
 * - El token se genera criptograficamente en servidor.
 * - Nunca se expone token al cliente en la respuesta.
 * - La cookie solo se marca secure en produccion para compatibilidad local.
 *
 * @param {string} userId
 * @returns {Promise<
 *   { ok: true, data: import("@/lib/types").SesionPublica } |
 *   { ok: false, error: { message: string, status: number } }
 * >}
 */
export async function createSessionForUser(userId) {
  if (!userId || typeof userId !== "string") {
    return errorResponse("El identificador es requerido", 400);
  }

  try {
    const requestHeaders = await headers();
    const userAgent = requestHeaders.get("user-agent");
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() : null;

    const sessionToken = randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const created = await createSession(userId, sessionToken, expiresAt, userAgent, ip);
    if (!created.ok) {
      return created;
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_TOKEN_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return successResponse(created.data);
  } catch (error) {
    return serverErrorResponse("No se pudo iniciar la sesion", {
      action: "createSessionForUser",
      userId,
      message: error.message,
    });
  }
}
