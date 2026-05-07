import { getActiveSessions } from "@/lib/actions/sessions";

/**
 * Cliente API minimo para sesiones activas.
 *
 * Re-exporta el Server Action con un contrato documentado
 * para que la capa de presentacion no dependa directamente
 * de la ubicacion del action.
 *
 * @returns {Promise<
 *   { ok: true, data: import("@/lib/types").ActiveSessionView[] } |
 *   { ok: false, error: { message: string, status: number } }
 * >}
 */
export { getActiveSessions };

/**
 * Normaliza un error de API de sesiones a un mensaje usable en UI.
 *
 * @param {{ message: string, status: number }} error
 * @returns {string}
 */
export function normalizeSessionError(error) {
  if (!error) return "Ocurrio un error inesperado";

  if (error.status === 401) {
    return "Tu sesion ha expirado. Inicia sesion nuevamente.";
  }

  if (error.status >= 500) {
    return "Error del servidor. Intenta nuevamente mas tarde.";
  }

  return error.message || "No se pudieron cargar las sesiones activas";
}
