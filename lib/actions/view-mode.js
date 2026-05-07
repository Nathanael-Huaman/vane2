"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/lib/server/authorization";
import { getCurrentPersistedSession } from "@/lib/server/auth-session";
import { updateSessionViewMode } from "@/lib/server/sesion";
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/server/response";
import { isViewModeValid } from "@/lib/types";

/**
 * Actualiza el modo de vista de la sesion actual para un administrador.
 *
 * Contrato de salida:
 *   { ok: true, data: { viewMode: "cliente" | "administrador" } }
 *   { ok: false, error: { message: string, status: number } }
 *
 * El role real del usuario NO cambia; solo cambia la experiencia visual
 * asociada a la sesion actual.
 *
 * @param {string} nextViewMode
 */
export async function setCurrentViewMode(nextViewMode) {
  if (!isViewModeValid(nextViewMode)) {
    return errorResponse("Modo de vista invalido", 400);
  }

  try {
    const accessResult = await requireAdminAccess();
    if (!accessResult.ok) {
      return accessResult;
    }

    const persistedSessionResult = await getCurrentPersistedSession();
    if (!persistedSessionResult.ok) {
      return persistedSessionResult;
    }

    const updatedSessionResult = await updateSessionViewMode(
      persistedSessionResult.data.id,
      accessResult.data.id,
      nextViewMode
    );

    if (!updatedSessionResult.ok) {
      return updatedSessionResult;
    }

    revalidatePath("/tienda");
    revalidatePath("/perfil");

    return successResponse({ viewMode: updatedSessionResult.data.viewMode });
  } catch (error) {
    return serverErrorResponse("No se pudo cambiar la vista actual", {
      action: "setCurrentViewMode",
      nextViewMode,
      message: error.message,
    });
  }
}
