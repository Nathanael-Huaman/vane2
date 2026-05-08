import bcrypt from "bcryptjs";
import { logError, logInfo, logWarn } from "./logger.js";
import { successResponse } from "./response.js";
import {
  safeAuthErrorResponse,
  safeAuthServerErrorResponse,
} from "./auth-response.js";
import { validateEmail, validatePassword } from "./validation.js";
import { getUsuarioByEmailForAuth } from "./usuario.js";

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
    return safeAuthErrorResponse("credentials", 401, {
      action: "authenticateUserWithCredentials",
      reason: "invalid_email",
      email: normalizedEmail,
    });
  }

  const passwordCheck = validatePassword(normalizedPassword);
  if (!passwordCheck.valid) {
    logWarn("authenticateUserWithCredentials: password invalida", {
      action: "authenticateUserWithCredentials",
      email: normalizedEmail,
    });
    return safeAuthErrorResponse("credentials", 401, {
      action: "authenticateUserWithCredentials",
      reason: "invalid_password",
      email: normalizedEmail,
    });
  }

  try {
    const userResult = await getUsuarioByEmailForAuth(normalizedEmail);
    if (!userResult.ok) {
      logWarn("authenticateUserWithCredentials: usuario no disponible", {
        action: "authenticateUserWithCredentials",
        email: normalizedEmail,
        status: userResult.error?.status ?? null,
      });
      return safeAuthErrorResponse("credentials", 401, {
        action: "authenticateUserWithCredentials",
        reason: "user_not_available",
        email: normalizedEmail,
        status: userResult.error?.status ?? null,
      });
    }

    const user = userResult.data;
    if (!user.passwordHash) {
      logWarn("authenticateUserWithCredentials: usuario sin passwordHash", {
        action: "authenticateUserWithCredentials",
        email: normalizedEmail,
        userId: user.id,
      });
      return safeAuthErrorResponse("credentials", 401, {
        action: "authenticateUserWithCredentials",
        reason: "missing_password_hash",
        email: normalizedEmail,
        userId: user.id,
      });
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
      return safeAuthErrorResponse("credentials", 401, {
        action: "authenticateUserWithCredentials",
        reason: "password_mismatch",
        email: normalizedEmail,
        userId: user.id,
      });
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

    return safeAuthServerErrorResponse("credentials", {
      action: "authenticateUserWithCredentials",
      email: normalizedEmail,
      message: error.message,
    });
  }
}
