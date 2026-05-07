"use server";

import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/server/response";
import { getCurrentUserFromDb, getUsuarioByEmail } from "@/lib/server/usuario";
import {
  getAuthenticatedSession,
  createSessionForUser,
} from "@/lib/server/auth-session";
import { validateCredentials } from "@/lib/server/validation";
import { signIn as authSignIn } from "@/lib/auth";
import { logError, logInfo } from "@/lib/server/logger";

export async function getCurrentUser() {
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
    return await getAuthenticatedSession();
  } catch (error) {
    return serverErrorResponse("No se pudo obtener el usuario autenticado", {
      action: "getCurrentUser",
      message: error.message,
    });
  }
}

export async function signInWithCredentials(input) {
  const email = input?.email;
  const password = input?.password;
  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    return errorResponse(validation.error, 400);
  }

  try {
    const result = await authSignIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      logError("signInWithCredentials: error de Auth.js", {
        action: "signInWithCredentials",
        error: result.error,
      });
      return errorResponse("Credenciales invalidas", 401);
    }

    logInfo("signInWithCredentials: inicio de sesion exitoso", {
      action: "signInWithCredentials",
    });

    return successResponse({ redirect: true });
  } catch (error) {
    if (error?.type === "CredentialsSignin") {
      return errorResponse("Credenciales invalidas", 401);
    }

    return serverErrorResponse("No se pudo iniciar sesion", {
      action: "signInWithCredentials",
      message: error.message,
    });
  }
}

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