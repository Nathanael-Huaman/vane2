const SENSITIVE_KEYS = ["password", "passwordHash", "secret", "token", "authorization", "cookie", "apiKey"];

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
