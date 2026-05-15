import { logInfo, logWarn } from "../logger.js";
import { successResponse } from "../response.js";

export const PASSWORD_RESET_SEND_LIMITS = Object.freeze({
  maxAttempts: 5,
  windowMinutes: 15,
  cooldownMinutes: 15,
});

export const PASSWORD_RESET_TOKEN_USE_LIMITS = Object.freeze({
  maxAttempts: 5,
  windowMinutes: 30,
  cooldownMinutes: 30,
});

export const PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE =
  "Si existe una cuenta asociada a ese correo, enviaremos un enlace de recuperacion en unos minutos.";

export const PASSWORD_RESET_SECURITY_BACKLOG = Object.freeze({
  sendRateLimit: {
    key: "password-reset:send",
    ...PASSWORD_RESET_SEND_LIMITS,
  },
  tokenUseRateLimit: {
    key: "password-reset:token-use",
    ...PASSWORD_RESET_TOKEN_USE_LIMITS,
  },
  auditEvents: [
    "password_reset_requested",
    "password_reset_request_throttled",
    "password_reset_token_validated",
    "password_reset_token_rejected",
    "password_reset_completed",
    "password_reset_link_throttled",
  ],
});

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function sanitizeAuditEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) {
    return normalized || "[empty]";
  }

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) {
    return "[invalid-email]";
  }

  const visiblePrefix = localPart.slice(0, 2);
  return `${visiblePrefix || "*"}***@${domain}`;
}

export function buildPasswordResetSecurityMeta(overrides = {}) {
  return {
    backlog: PASSWORD_RESET_SECURITY_BACKLOG,
    neutralLimitMessage: PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE,
    rateLimitReady: true,
    auditReady: true,
    enforced: false,
    ...overrides,
  };
}

export function getPasswordResetRequestFeedbackMeta() {
  return buildPasswordResetSecurityMeta({
    scope: "request-password-reset",
  });
}

export function getPasswordResetTokenFeedbackMeta() {
  return buildPasswordResetSecurityMeta({
    scope: "token-validation",
  });
}

export async function assessPasswordResetSendRisk(email, context = {}) {
  logInfo("password-reset-security: evaluacion de envio preparada", {
    action: "assessPasswordResetSendRisk",
    email: sanitizeAuditEmail(email),
    ip: context.ip ?? null,
    userAgent: context.userAgent ?? null,
    limits: PASSWORD_RESET_SEND_LIMITS,
  });

  return successResponse(
    {
      allow: true,
      message: PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE,
      reason: "prepared_for_future_rate_limiting",
    },
    getPasswordResetRequestFeedbackMeta()
  );
}

export async function assessPasswordResetTokenRisk(email, context = {}) {
  logInfo("password-reset-security: evaluacion de uso de enlace preparada", {
    action: "assessPasswordResetTokenRisk",
    email: sanitizeAuditEmail(email),
    ip: context.ip ?? null,
    userAgent: context.userAgent ?? null,
    limits: PASSWORD_RESET_TOKEN_USE_LIMITS,
  });

  return successResponse(
    {
      allow: true,
      message: PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE,
      reason: "prepared_for_future_token_rate_limiting",
    },
    getPasswordResetTokenFeedbackMeta()
  );
}

export function auditPasswordResetEvent(eventName, details = {}) {
  if (!PASSWORD_RESET_SECURITY_BACKLOG.auditEvents.includes(eventName)) {
    logWarn("password-reset-security: evento de auditoria no registrado", {
      action: "auditPasswordResetEvent",
      eventName,
    });
  }

  logInfo(`password-reset-security: ${eventName}`, {
    action: "auditPasswordResetEvent",
    ...details,
  });
}
