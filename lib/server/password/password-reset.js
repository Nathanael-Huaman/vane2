import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "../../prisma.js";
import { logError, logInfo } from "../logger.js";
import { errorResponse, successResponse, serverErrorResponse } from "../response.js";
import { validateEmail, validatePassword } from "../validation.js";
import { sendTransactionalEmail } from "../mailer.js";
import {
  assessPasswordResetSendRisk,
  assessPasswordResetTokenRisk,
  auditPasswordResetEvent,
  getPasswordResetRequestFeedbackMeta,
  getPasswordResetTokenFeedbackMeta,
  PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE,
} from "./password-reset-security.js";
import { buildThrottleResponse } from "../security/rate-limit.js";

export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
export const PASSWORD_RESET_SUCCESS_MESSAGE =
  PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE;
export const PASSWORD_RESET_INVALID_MESSAGE =
  "El enlace de recuperacion no es valido o ya expiro.";
export const PASSWORD_RESET_COMPLETED_MESSAGE =
  "Tu contrasena se actualizo correctamente. Ya puedes iniciar sesion con la nueva clave.";
const PASSWORD_RESET_SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function hashPasswordResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function resolveAppBaseUrl(baseUrl) {
  const resolved =
    baseUrl ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";

  return resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
}

function buildPasswordResetUrl({ baseUrl, email, token }) {
  const url = new URL("/restablecer-contrasena", resolveAppBaseUrl(baseUrl));
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
}

function buildPasswordResetEmail({ resetUrl, expiresAt }) {
  const expiresLabel = expiresAt.toLocaleString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    subject: "Recupera tu contrasena de Obstedesign",
    text: [
      "Recibimos una solicitud para recuperar tu contrasena en Obstedesign.",
      "",
      `Usa este enlace para continuar: ${resetUrl}`,
      "",
      `El enlace expirara el ${expiresLabel}.`,
      "Si no solicitaste este cambio, puedes ignorar este mensaje.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h1 style="margin-bottom: 12px; color: #d946ef;">Obstedesign</h1>
        <p>Recibimos una solicitud para recuperar tu contrasena.</p>
        <p>
          <a
            href="${resetUrl}"
            style="display: inline-block; margin: 12px 0; padding: 12px 20px; border-radius: 999px; background: #ec4899; color: white; text-decoration: none; font-weight: 600;"
          >
            Continuar recuperacion
          </a>
        </p>
        <p>Tambien puedes copiar y pegar este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #db2777;">${resetUrl}</p>
        <p>El enlace expirara el ${expiresLabel}.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
      </div>
    `,
  };
}

function buildPasswordResetThrottleResult(riskResult, fallbackMeta) {
  const response = buildThrottleResponse(
    riskResult.meta?.rateLimit ?? {},
    PASSWORD_RESET_SUCCESS_MESSAGE
  );
  return {
    ...response,
    meta: {
      ...(riskResult.meta ?? fallbackMeta),
      retryAfterSeconds: response.meta.retryAfterSeconds,
    },
  };
}

async function findUserForPasswordReset(email) {
  return prisma.usuario.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
    },
  });
}

async function findVerificationTokenByIdentifier(identifier) {
  return prisma.verificationToken.findUnique({
    where: { identifier },
  });
}

export async function issuePasswordResetForUser(user, options = {}) {
  const email = normalizeEmail(user?.email);
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    return errorResponse(emailCheck.error, 400);
  }

  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000
  );
  const resetUrl = buildPasswordResetUrl({
    baseUrl: options.baseUrl,
    email,
    token: rawToken,
  });

  try {
    await prisma.verificationToken.upsert({
      where: { identifier: email },
      update: {
        token: hashedToken,
        expires: expiresAt,
      },
      create: {
        identifier: email,
        token: hashedToken,
        expires: expiresAt,
      },
    });

    const emailPayload = buildPasswordResetEmail({ resetUrl, expiresAt });
    const emailSender = options.emailSender ?? sendTransactionalEmail;
    const deliveryResult = await emailSender({
      to: email,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
    });

    if (!deliveryResult?.ok) {
      return deliveryResult;
    }

    return successResponse({
      identifier: email,
      expiresAt,
      resetUrl,
      transport: deliveryResult.data?.transport ?? null,
    });
  } catch (error) {
    return serverErrorResponse("No se pudo emitir el enlace de recuperacion", {
      action: "issuePasswordResetForUser",
      userId: user?.id ?? null,
      message: error.message,
    });
  }
}

export async function requestPasswordReset(email, options = {}) {
  const normalizedEmail = normalizeEmail(email);
  const sendRiskResult = await assessPasswordResetSendRisk(
    normalizedEmail,
    options.context ?? {}
  );
  if (!sendRiskResult.ok) {
    return sendRiskResult;
  }
  if (sendRiskResult.data?.allow === false) {
    auditPasswordResetEvent("password_reset_request_throttled", {
      rateLimit: sendRiskResult.meta?.rateLimit ?? null,
    });
    return buildPasswordResetThrottleResult(
      sendRiskResult,
      getPasswordResetRequestFeedbackMeta()
    );
  }

  const emailCheck = validateEmail(normalizedEmail);
  if (!emailCheck.valid) {
    return errorResponse(emailCheck.error, 400);
  }

  try {
    auditPasswordResetEvent("password_reset_requested", {
      rateLimit: sendRiskResult.meta?.rateLimit ?? null,
    });

    const user = await findUserForPasswordReset(normalizedEmail);

    if (!user) {
      logInfo("requestPasswordReset: solicitud neutra para correo inexistente", {
        action: "requestPasswordReset",
      });
      auditPasswordResetEvent("password_reset_request_throttled", {
        reason: "neutral_response_for_unknown_account",
      });

      return successResponse(
        {
          message: PASSWORD_RESET_SUCCESS_MESSAGE,
        },
        sendRiskResult.meta ?? getPasswordResetRequestFeedbackMeta()
      );
    }

    const issueResult = await issuePasswordResetForUser(user, options);
    if (!issueResult.ok) {
      logError(
        "requestPasswordReset: fallo interno al procesar recuperacion",
        {
          action: "requestPasswordReset",
          status: issueResult.error?.status ?? null,
        }
      );
    }

    return successResponse(
      {
        message: PASSWORD_RESET_SUCCESS_MESSAGE,
      },
      sendRiskResult.meta ?? getPasswordResetRequestFeedbackMeta()
    );
  } catch (error) {
    logError("requestPasswordReset: fallo inesperado", {
      action: "requestPasswordReset",
      message: error.message,
    });

    return successResponse(
      {
        message: PASSWORD_RESET_SUCCESS_MESSAGE,
      },
      getPasswordResetRequestFeedbackMeta()
    );
  }
}

export async function validatePasswordResetToken(email, token) {
  return validatePasswordResetTokenInternal(email, token);
}

async function validatePasswordResetTokenInternal(email, token, options = {}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedToken = String(token ?? "").trim();
  let tokenRiskMeta = options.riskMeta ?? null;
  if (!options.skipRateLimit) {
    const tokenRiskResult = await assessPasswordResetTokenRisk(normalizedEmail, {
      ...(options.context ?? {}),
      token: normalizedToken,
    });
    if (!tokenRiskResult.ok) {
      return tokenRiskResult;
    }
    tokenRiskMeta = tokenRiskResult.meta ?? getPasswordResetTokenFeedbackMeta();
    if (tokenRiskResult.data?.allow === false) {
      auditPasswordResetEvent("password_reset_link_throttled", {
        rateLimit: tokenRiskResult.meta?.rateLimit ?? null,
      });
      return buildPasswordResetThrottleResult(
        tokenRiskResult,
        getPasswordResetTokenFeedbackMeta()
      );
    }
  }

  const emailCheck = validateEmail(normalizedEmail);
  if (!emailCheck.valid) {
    return errorResponse(PASSWORD_RESET_INVALID_MESSAGE, 400);
  }

  if (!normalizedToken) {
    return errorResponse(PASSWORD_RESET_INVALID_MESSAGE, 400);
  }

  try {
    const [user, verificationToken] = await Promise.all([
      findUserForPasswordReset(normalizedEmail),
      findVerificationTokenByIdentifier(normalizedEmail),
    ]);

    if (!user || !verificationToken) {
      auditPasswordResetEvent("password_reset_token_rejected", {
        reason: "token_or_user_missing",
      });
      return errorResponse(PASSWORD_RESET_INVALID_MESSAGE, 400);
    }

    if (verificationToken.expires.getTime() <= Date.now()) {
      auditPasswordResetEvent("password_reset_token_rejected", {
        reason: "token_expired",
      });
      return errorResponse(PASSWORD_RESET_INVALID_MESSAGE, 400);
    }

    const hashedToken = hashPasswordResetToken(normalizedToken);
    if (verificationToken.token !== hashedToken) {
      auditPasswordResetEvent("password_reset_token_rejected", {
        reason: "token_mismatch",
      });
      return errorResponse(PASSWORD_RESET_INVALID_MESSAGE, 400);
    }

    auditPasswordResetEvent("password_reset_token_validated", {
      userId: user.id,
    });

    return successResponse(
      {
        email: normalizedEmail,
        userId: user.id,
        expiresAt: verificationToken.expires,
      },
      tokenRiskMeta ?? getPasswordResetTokenFeedbackMeta()
    );
  } catch (error) {
    return serverErrorResponse("No se pudo validar el enlace de recuperacion", {
      action: "validatePasswordResetToken",
      message: error.message,
    });
  }
}

export async function resetPasswordWithToken({ email, token, password, context } = {}, options = {}) {
  const normalizedToken = String(token ?? "").trim();
  const tokenRiskResult = await assessPasswordResetTokenRisk(email, {
    ...(options.context ?? {}),
    ...(context ?? {}),
    token: normalizedToken,
  });
  if (!tokenRiskResult.ok) {
    return tokenRiskResult;
  }
  if (tokenRiskResult.data?.allow === false) {
    auditPasswordResetEvent("password_reset_link_throttled", {
      rateLimit: tokenRiskResult.meta?.rateLimit ?? null,
    });
    return buildPasswordResetThrottleResult(
      tokenRiskResult,
      getPasswordResetTokenFeedbackMeta()
    );
  }

  const normalizedPassword = String(password ?? "");
  const passwordCheck = validatePassword(normalizedPassword);
  if (!passwordCheck.valid) {
    return errorResponse(passwordCheck.error, 400);
  }

  try {
    const validationResult = await validatePasswordResetTokenInternal(email, normalizedToken, {
      skipRateLimit: true,
      riskMeta: tokenRiskResult.meta,
    });
    if (!validationResult.ok) {
      return validationResult;
    }

    const passwordHash = await bcrypt.hash(
      normalizedPassword,
      PASSWORD_RESET_SALT_ROUNDS
    );

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: validationResult.data.userId },
        data: { passwordHash },
      }),
      prisma.verificationToken.delete({
        where: { identifier: validationResult.data.email },
      }),
    ]);

    logInfo("resetPasswordWithToken: contrasena actualizada", {
      action: "resetPasswordWithToken",
      userId: validationResult.data.userId,
    });
    auditPasswordResetEvent("password_reset_completed", {
      userId: validationResult.data.userId,
    });

    return successResponse(
      {
        email: validationResult.data.email,
        message: PASSWORD_RESET_COMPLETED_MESSAGE,
      },
      validationResult.meta ?? getPasswordResetTokenFeedbackMeta()
    );
  } catch (error) {
    return serverErrorResponse("No se pudo actualizar la contrasena", {
      action: "resetPasswordWithToken",
      message: error.message,
    });
  }
}
