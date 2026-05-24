import { logInfo, logWarn } from "../logger.js";
import { successResponse } from "../response.js";
import { buildRateLimitLogContext, checkRateLimit } from "../security/rate-limit.js";

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

function buildRiskActorParts(email, context = {}) {
  return {
    email: normalizeEmail(email),
    ip: context.ip ?? "unknown",
    userAgent: context.userAgent ?? "unknown",
    token: context.token ?? undefined,
  };
}

function buildRiskMeta({ scope, result }) {
  return buildPasswordResetSecurityMeta({
    scope,
    enforced: true,
    rateLimit: buildRateLimitLogContext(result),
  });
}

function buildRiskData(result) {
  return {
    allow: result.allowed,
    message: PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE,
    reason: result.allowed ? "rate_limit_allowed" : result.decision,
  };
}

async function assessPasswordResetRisk({ email, context, surface, limit, scope, action }) {
  const rateLimitOptions = context.rateLimit ?? {};
  const result = await checkRateLimit({
    ...rateLimitOptions,
    surface,
    actorParts: rateLimitOptions.actorParts ?? buildRiskActorParts(email, context),
    limit: rateLimitOptions.limit ?? limit,
  });
  const logContext = {
    action,
    ...buildRateLimitLogContext(result),
  };

  if (result.allowed) {
    logInfo("password-reset-security: evaluacion permitida", logContext);
  } else {
    logWarn("password-reset-security: evaluacion limitada", logContext);
  }

  return successResponse(buildRiskData(result), buildRiskMeta({ scope, result }));
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
  return assessPasswordResetRisk({
    email,
    context,
    surface: "password-reset:send",
    limit: PASSWORD_RESET_SEND_LIMITS,
    scope: "request-password-reset",
    action: "assessPasswordResetSendRisk",
  });
}

export async function assessPasswordResetTokenRisk(email, context = {}) {
  return assessPasswordResetRisk({
    email,
    context,
    surface: "password-reset:token-use",
    limit: PASSWORD_RESET_TOKEN_USE_LIMITS,
    scope: "token-validation",
    action: "assessPasswordResetTokenRisk",
  });
}

function sanitizeAuditDetails(details = {}) {
  if (!details || typeof details !== "object") return details;

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("email")) return [key, sanitizeAuditEmail(value)];
      if (lowerKey.includes("token") || lowerKey.includes("password")) {
        return [key, "[REDACTED]"];
      }
      if (lowerKey === "ip" || lowerKey === "useragent") {
        return [key, "[REDACTED]"];
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return [key, sanitizeAuditDetails(value)];
      }
      return [key, value];
    })
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
    ...sanitizeAuditDetails(details),
  });
}
