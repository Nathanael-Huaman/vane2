import { isAdmin as isAdminRole } from "@/lib/auth/flags";
import { getAuthenticatedSession } from "@/lib/server/auth/auth-session";
import { resolveSessionViewMode } from "@/lib/server/session/view-mode";
import { VIEW_MODE_ADMINISTRADOR, VIEW_MODE_CLIENTE } from "@/lib/types";

export async function resolvePageAuthContext() {
  const sessionResult = await getAuthenticatedSession();
  const user = sessionResult.ok ? sessionResult.data : null;
  const isAuthenticated = sessionResult.ok;
  const isAdmin = isAdminRole(user?.role);
  const hasAuthError = !sessionResult.ok && sessionResult.error.status !== 401;

  const sessionView = isAuthenticated
    ? await resolveSessionViewMode(user)
    : { viewMode: VIEW_MODE_CLIENTE, canToggleViewMode: false };

  const isAdminView =
    isAdmin && sessionView.viewMode === VIEW_MODE_ADMINISTRADOR;
  const isClientView = !isAdmin || sessionView.viewMode === VIEW_MODE_CLIENTE;

  return {
    user,
    isAuthenticated,
    isAdmin,
    hasAuthError,
    sessionView,
    isAdminView,
    isClientView,
  };
}
