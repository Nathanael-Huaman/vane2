import bcrypt from "bcryptjs";
import { logError, logInfo, logWarn } from "../logger.js";
import { successResponse } from "../response.js";
import {
  safeAuthErrorResponse,
  safeAuthServerErrorResponse,
} from "./auth-response.js";
import { validateEmail, validatePassword } from "../validation.js";
import { getUsuarioByEmailForAuth } from "../user/usuario.js";

function maskEmailForLog(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized.includes("@")) return normalized ? "[invalid-email]" : "[empty]";
  const [localPart, domain] = normalized.split("@");
  return `${localPart.slice(0, 2) || "*"}***@${domain || "unknown"}`;
}

export async function authenticateUserWithCredentials(email, password) {
  const normalizedEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  const normalizedPassword = String(password ?? "");
  const emailMasked = maskEmailForLog(normalizedEmail);

  const emailCheck = validateEmail(normalizedEmail);
  if (!emailCheck.valid) {
    logWarn("authenticateUserWithCredentials: email invalido", {
      action: "authenticateUserWithCredentials",
      emailMasked,
    });
    return safeAuthErrorResponse("credentials", 401, {
      action: "authenticateUserWithCredentials",
      reason: "invalid_email",
      emailMasked,
    });
  }

  const passwordCheck = validatePassword(normalizedPassword);
  if (!passwordCheck.valid) {
    logWarn("authenticateUserWithCredentials: password invalida", {
      action: "authenticateUserWithCredentials",
      emailMasked,
    });
    return safeAuthErrorResponse("credentials", 401, {
      action: "authenticateUserWithCredentials",
      reason: "invalid_password",
      emailMasked,
    });
  }

  try {
    const userResult = await getUsuarioByEmailForAuth(normalizedEmail);
    if (!userResult.ok) {
      logWarn("authenticateUserWithCredentials: usuario no disponible", {
        action: "authenticateUserWithCredentials",
        emailMasked,
        status: userResult.error?.status ?? null,
      });
      return safeAuthErrorResponse("credentials", 401, {
        action: "authenticateUserWithCredentials",
        reason: "user_not_available",
        emailMasked,
        status: userResult.error?.status ?? null,
      });
    }

    const user = userResult.data;
    if (!user.passwordHash) {
      logWarn("authenticateUserWithCredentials: usuario sin passwordHash", {
        action: "authenticateUserWithCredentials",
        emailMasked,
      });
      return safeAuthErrorResponse("credentials", 401, {
        action: "authenticateUserWithCredentials",
        reason: "missing_password_hash",
        emailMasked,
      });
    }

    const passwordMatches = await bcrypt.compare(
      normalizedPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      logWarn("authenticateUserWithCredentials: password incorrecta", {
        action: "authenticateUserWithCredentials",
        emailMasked,
      });
      return safeAuthErrorResponse("credentials", 401, {
        action: "authenticateUserWithCredentials",
        reason: "password_mismatch",
        emailMasked,
      });
    }

    logInfo("authenticateUserWithCredentials: credenciales validadas", {
      action: "authenticateUserWithCredentials",
      userId: user.id,
    });

    return successResponse(user);
  } catch (error) {
    logError("authenticateUserWithCredentials: error inesperado", {
      action: "authenticateUserWithCredentials",
      emailMasked,
      message: error.message,
    });

    return safeAuthServerErrorResponse("credentials", {
      action: "authenticateUserWithCredentials",
      emailMasked,
      message: error.message,
    });
  }
}
