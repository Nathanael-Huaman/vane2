import {
  VIEW_MODE_ADMINISTRADOR,
  VIEW_MODE_CLIENTE,
  isViewModeValid,
} from "@/lib/types";
import { getCurrentPersistedSession } from "@/lib/server/auth/auth-session";
import { logWarn } from "@/lib/server/logger";
import { isAdmin } from "@/lib/auth/flags";

export async function resolveSessionViewMode(user) {
  if (!isAdmin(user?.role)) {
    return {
      viewMode: VIEW_MODE_CLIENTE,
      canToggleViewMode: false,
    };
  }

  const persistedSessionResult = await getCurrentPersistedSession();
  if (!persistedSessionResult.ok) {
    logWarn("resolveSessionViewMode: sin sesion persistida, se usa modo admin por defecto", {
      action: "resolveSessionViewMode",
      status: persistedSessionResult.error?.status ?? null,
    });

    return {
      viewMode: VIEW_MODE_ADMINISTRADOR,
      canToggleViewMode: true,
    };
  }

  return {
    viewMode: isViewModeValid(persistedSessionResult.data.viewMode)
      ? persistedSessionResult.data.viewMode
      : VIEW_MODE_ADMINISTRADOR,
    canToggleViewMode: true,
  };
}
