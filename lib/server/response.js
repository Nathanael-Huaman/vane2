/**
 * Helpers de respuesta estandarizada para Server Actions y API Routes.
 *
 * Todas las respuestas siguen el contrato:
 *   Exito:  { ok: true,  data?: *, meta?: * }
 *   Error:  { ok: false, error: { message: string, status: number } }
 *
 * Los detalles tecnicos (details) se registran en log pero NUNCA se exponen
 * al cliente. El mensaje de error que recibe el frontend es siempre seguro.
 *
 * Contratos:
 *
 *   successResponse(data?, meta?) → { ok: true, data?: *, meta?: * }
 *     Respuesta de exito. data y meta son opcionales.
 *
 *   errorResponse(message, status?, details?) → { ok: false, error: { message, status } }
 *     Respuesta de error generica. Registra details en log internamente.
 *     details NO se envia al cliente.
 *
 *   unauthorizedResponse(message?) → { ok: false, error: { message, status: 401 } }
 *     Error 401. Usar cuando el usuario no esta autenticado.
 *
 *   forbiddenResponse(message?) → { ok: false, error: { message, status: 403 } }
 *     Error 403. Usar cuando el usuario esta autenticado pero no tiene permisos.
 *
 *   notFoundResponse(message?) → { ok: false, error: { message, status: 404 } }
 *     Error 404. Usar cuando un recurso no existe.
 *
 *   serverErrorResponse(message?, details?) → { ok: false, error: { message, status: 500 } }
 *     Error 500. Para fallos inesperados. details se registra en log.
 */

import { logError } from "./logger.js";

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
