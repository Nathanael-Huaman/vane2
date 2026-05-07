/**
 * Resolucion de sesion autenticada integrada con Auth.js.
 *
 * Este modulo proporciona helpers para interactuar con sesiones desde
 * Server Actions y API routes, complementando Auth.js con logica de
 * negocio propia (captura de userAgent/ip, listado y revocacion).
 *
 * Auth.js gestiona el ciclo de vida de la sesion (creacion, validacion,
 * eliminacion via cookie). Este modulo agrega:
 *   - getAuthenticatedSession(): Resuelve la sesion desde Auth.js y
 *     retorna datos del usuario con rol resuelto desde BD.
 *   - getSessionToken(): Lee el token de sesion de Auth.js desde cookies.
 *   - createSessionForUser(): Insercion de sesion extendida con userAgent/ip.
 *     Solo se usa en flujo mock (MOCK_AUTH=1).
 *
 * Contratos:
 *
 *   getAuthenticatedSession() → { ok: true, data: { userId, email, role } }
 *                              → { ok: false, error: { message, status } }
 *     Resuelve la sesion actual via Auth.js. Incluye el rol del usuario
 *     consultado directamente desde la base de datos propia.
 *
 *   getSessionToken() → string | null
 *     Lee el token de sesion de la cookie de Auth.js.
 *     Util para correlacionar sesiones en la tabla sesiones.
 */

import { auth } from "@/lib/auth";
import { getCurrentUserFromDb, getUsuarioById } from "@/lib/server/usuario";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/server/response";
import { logError, logInfo } from "@/lib/server/logger";
import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { createSession } from "@/lib/server/sesion";

const AUTH_SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Host-next-auth.session-token",
  "next-auth.csrf-token",
];

const SESSION_TOKEN_COOKIE = "ob_session_token";
const SESSION_DURATION_DAYS = 7;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

export async function getAuthenticatedSession() {
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
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedResponse("No hay sesion activa");
    }

    const userId = session.user.id;
    const userResult = await getCurrentUserFromDb(userId);
    if (!userResult.ok) {
      return userResult;
    }

    return successResponse({
      ...userResult.data,
      role: userResult.data.role || session.user.role,
    });
  } catch (error) {
    return serverErrorResponse("No se pudo obtener la sesion autenticada", {
      action: "getAuthenticatedSession",
      message: error.message,
    });
  }
}

export async function getSessionToken() {
  try {
    const cookieStore = await cookies();
    for (const name of AUTH_SESSION_COOKIE_NAMES) {
      const cookie = cookieStore.get(name);
      if (cookie?.value) return cookie.value;
    }
    const customCookie = cookieStore.get(SESSION_TOKEN_COOKIE);
    return customCookie?.value ?? null;
  } catch {
    return null;
  }
}

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

    logInfo("createSessionForUser: sesion extendida creada", {
      action: "createSessionForUser",
      userId,
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