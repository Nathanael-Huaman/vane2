/**
 * Logger seguro para el servidor.
 *
 * - En desarrollo escribe timestamp + mensaje + detalles sanitizados a consola.
 * - En produccion solo escribe timestamp + mensaje (sin detalles).
 * - Sanitiza claves sensibles (password, token, secret, etc.) reemplazandolas
 *   por "[REDACTED]" antes de cualquier escritura.
 *
 * Contratos:
 *
 *   sanitize(obj) → Object | Array | primitivo
 *     Recorre un objeto en profundidad y reemplaza valores en claves sensibles
 *     por "[REDACTED]". No modifica el objeto original.
 *
 *   logError(message, details?) → void
 *     Registra un error. details es opcional y se sanitiza automaticamente.
 *     En produccion no se escriben detalles.
 *
 *   logInfo(message, details?) → void
 *     Registro informativo. Solo visible en desarrollo.
 *
 *   logWarn(message, details?) → void
 *     Registro de advertencia. Solo visible en desarrollo.
 */

const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apiKey",
];

function sanitize(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k))) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitize(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

const isDev = process.env.NODE_ENV !== "production";

export function logError(message, details = null) {
  const timestamp = new Date().toISOString();
  const safeDetails = details ? sanitize(details) : null;

  if (isDev) {
    console.error(`[${timestamp}] ERROR: ${message}`, safeDetails ?? "");
  } else {
    console.error(`[${timestamp}] ERROR: ${message}`);
  }
}

export function logInfo(message, details = null) {
  const timestamp = new Date().toISOString();
  if (isDev) {
    console.log(`[${timestamp}] INFO: ${message}`, details ?? "");
  }
}

export function logWarn(message, details = null) {
  const timestamp = new Date().toISOString();
  if (isDev) {
    console.warn(`[${timestamp}] WARN: ${message}`, details ?? "");
  }
}
