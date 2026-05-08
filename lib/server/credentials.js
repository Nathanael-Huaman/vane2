import bcrypt from "bcryptjs";
import { logError, logInfo, logWarn } from "./logger.js";
import { errorResponse, successResponse, serverErrorResponse } from "./response.js";
import { validateEmail, validatePassword } from "./validation.js";
import { getUsuarioByEmailForAuth } from "./usuario.js";

const GENERIC_CREDENTIALS_ERROR = "Credenciales invalidas";

export async function authenticateUserWithCredentials(email, password) {
  const normalizedEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  const normalizedPassword = String(password ?? "");

  const emailCheck = validateEmail(normalizedEmail);
  if (!emailCheck.valid) {
    logWarn("authenticateUserWithCredentials: email invalido", {
      action: "authenticateUserWithCredentials",
      email: normalizedEmail,
    });
    return errorResponse(GENERIC_CREDENTIALS_ERROR, 401);
  }

  const passwordCheck = validatePassword(normalizedPassword);
  if (!passwordCheck.valid) {
    logWarn("authenticateUserWithCredentials: password invalida", {
      action: "authenticateUserWithCredentials",
      email: normalizedEmail,
    });
    return errorResponse(GENERIC_CREDENTIALS_ERROR, 401);
  }

  try {
    const userResult = await getUsuarioByEmailForAuth(normalizedEmail);
    if (!userResult.ok) {
      logWarn("authenticateUserWithCredentials: usuario no disponible", {
        action: "authenticateUserWithCredentials",
        email: normalizedEmail,
        status: userResult.error?.status ?? null,
      });
      return errorResponse(GENERIC_CREDENTIALS_ERROR, 401);
    }

    const user = userResult.data;
    if (!user.passwordHash) {
      logWarn("authenticateUserWithCredentials: usuario sin passwordHash", {
        action: "authenticateUserWithCredentials",
        email: normalizedEmail,
        userId: user.id,
      });
      return errorResponse(GENERIC_CREDENTIALS_ERROR, 401);
    }

    const passwordMatches = await bcrypt.compare(
      normalizedPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      logWarn("authenticateUserWithCredentials: password incorrecta", {
        action: "authenticateUserWithCredentials",
        email: normalizedEmail,
        userId: user.id,
      });
      return errorResponse(GENERIC_CREDENTIALS_ERROR, 401);
    }

    logInfo("authenticateUserWithCredentials: credenciales validadas", {
      action: "authenticateUserWithCredentials",
      email: normalizedEmail,
      userId: user.id,
    });

    return successResponse(user);
  } catch (error) {
    logError("authenticateUserWithCredentials: error inesperado", {
      action: "authenticateUserWithCredentials",
      email: normalizedEmail,
      message: error.message,
    });

    return serverErrorResponse("No se pudo validar el acceso", {
      action: "authenticateUserWithCredentials",
      email: normalizedEmail,
      message: error.message,
    });
  }
}
