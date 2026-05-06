import { logError } from "@/lib/server/logger";

export function successResponse(data = null, meta = null) {
  const response = { ok: true };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return response;
}

export function errorResponse(message, status = 400, details = null) {
  logError(message, details);
  return {
    ok: false,
    error: { message, status },
  };
}

export function unauthorizedResponse(message = "No autorizado") {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = "Acceso denegado") {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = "Recurso no encontrado") {
  return errorResponse(message, 404);
}

export function serverErrorResponse(message = "Error interno del servidor", details = null) {
  logError(message, details);
  return {
    ok: false,
    error: { message, status: 500 },
  };
}
