/**
 * Resolucion de sesion autenticada integrada con Auth.js.
 */

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma.js";
import { isRoleValid, toUsuarioPublico } from "@/lib/types.js";
import { getCurrentUserFromDb } from "@/lib/server/user/usuario";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/server/response";
import { logInfo } from "@/lib/server/logger";
import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { createSession, getSessionByToken } from "@/lib/server/session/sesion";

const AUTH_SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
  "next-auth.csrf-token",
];

const SESSION_TOKEN_COOKIE = "ob_session_token";
const AUTHJS_SESSION_COOKIE = "authjs.session-token";
const SESSION_DURATION_DAYS = 7;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

function getMockAuthenticatedUser() {
  const mockRoleRaw = process.env.MOCK_ROLE;
  const mockRole =
    mockRoleRaw === "administrador" || mockRoleRaw === "cliente"
      ? mockRoleRaw
      : "cliente";

  return {
    id: "usr_dev_01",
    email: "dev@obstedesign.com",
    role: mockRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getAuthenticatedSession() {
  if (process.env.NODE_ENV === "development" && process.env.MOCK_AUTH === "1") {
    return successResponse(getMockAuthenticatedUser());
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

export async function getOptionalAuthenticatedSession() {
  if (process.env.NODE_ENV === "development" && process.env.MOCK_AUTH === "1") {
    return getMockAuthenticatedUser();
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return null;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
    });

    if (!usuario) {
      return null;
    }

    const user = toUsuarioPublico(usuario);
    if (!isRoleValid(user.role)) {
      return null;
    }

    return {
      ...user,
      role: user.role || session.user.role,
    };
  } catch (error) {
    serverErrorResponse("No se pudo obtener la sesion autenticada opcional", {
      action: "getOptionalAuthenticatedSession",
      message: error.message,
    });
    return null;
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

export async function getCurrentPersistedSession() {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    return unauthorizedResponse("No hay sesion activa");
  }

  return getSessionByToken(sessionToken);
}

export async function getOptionalPersistedSession() {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    return null;
  }

  const sessionResult = await getSessionByToken(sessionToken);
  return sessionResult.ok ? sessionResult.data : null;
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

export async function createAuthJsSessionForUser(userId) {
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
    cookieStore.set(AUTHJS_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    logInfo("createAuthJsSessionForUser: sesion Auth.js compatible creada", {
      action: "createAuthJsSessionForUser",
      userId,
    });

    return successResponse({
      ...created.data,
      sessionToken,
      expiresAt,
    });
  } catch (error) {
    return serverErrorResponse("No se pudo iniciar la sesion", {
      action: "createAuthJsSessionForUser",
      userId,
      message: error.message,
    });
  }
}
