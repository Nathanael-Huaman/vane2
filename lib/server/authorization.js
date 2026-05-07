import { ROLE_ADMINISTRADOR, isRoleValid } from "@/lib/types";
import { getAuthenticatedSession } from "@/lib/server/auth-session";
import {
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/server/response";
import { logWarn } from "@/lib/server/logger";

/**
 * Valida que la sesion autenticada tenga uno de los roles permitidos.
 *
 * Retorna el mismo contrato estandarizado del proyecto:
 *   - { ok: true, data: UsuarioPublico }
 *   - { ok: false, error: { message, status } }
 *
 * @param {string[]} allowedRoles
 * @param {{ forbiddenMessage?: string }} [options]
 */
export async function requireRole(allowedRoles, options = {}) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return serverErrorResponse("No se pudo validar el acceso", {
      action: "requireRole",
      reason: "allowedRoles vacio o invalido",
    });
  }

  const sessionResult = await getAuthenticatedSession();
  if (!sessionResult.ok) {
    return sessionResult;
  }

  const role = sessionResult.data?.role;
  if (!isRoleValid(role)) {
    return forbiddenResponse(options.forbiddenMessage || "Acceso denegado");
  }

  if (!allowedRoles.includes(role)) {
    logWarn("requireRole: acceso denegado por rol", {
      action: "requireRole",
      userId: sessionResult.data.id,
      role,
      allowedRoles,
    });

    return forbiddenResponse(options.forbiddenMessage || "Acceso denegado");
  }

  return sessionResult;
}

/**
 * Shortcut para recursos reservados a administradores.
 *
 * @param {{ forbiddenMessage?: string }} [options]
 */
export async function requireAdminAccess(options = {}) {
  return requireRole([ROLE_ADMINISTRADOR], options);
}
