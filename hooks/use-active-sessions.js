"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getActiveSessions,
  normalizeSessionError,
  revokeActiveSession,
} from "@/lib/client/sessions";

/**
 * Hook para gestionar el estado de sesiones activas del usuario.
 *
 * Estados expuestos:
 *   - sessions: {ActiveSessionView[] | null} Lista de sesiones o null si aun no se ha cargado.
 *   - loading: {boolean} Indica si hay una peticion en curso.
 *   - error: {string | null} Mensaje de error normalizado para la UI, o null.
 *
 * Acciones expuestas:
 *   - refetch: {() => void} Dispara una nueva peticion manualmente.
 *
 * @returns {{
 *   sessions: import("@/lib/types").ActiveSessionView[] | null,
 *   loading: boolean,
 *   error: string | null,
 *   revokingSessionId: string | null,
 *   refetch: () => void,
 *   revokeById: (sessionId: string) => Promise<{ ok: boolean, error?: string }>,
 * }}
 */
export function useActiveSessions() {
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revokingSessionId, setRevokingSessionId] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getActiveSessions();

      if (result.ok) {
        setSessions(result.data);
      } else {
        setSessions(null);
        setError(normalizeSessionError(result.error));
      }
    } catch (err) {
      setSessions(null);
      setError(normalizeSessionError({ message: err.message, status: 500 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data fetching en efecto: patrón estándar para carga inicial.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions();
  }, [fetchSessions]);

  const revokeById = useCallback(
    async (sessionId) => {
      if (!sessionId || typeof sessionId !== "string") {
        return { ok: false, error: "Sesion invalida" };
      }

      setRevokingSessionId(sessionId);
      try {
        const result = await revokeActiveSession(sessionId);
        if (!result.ok) {
          return { ok: false, error: normalizeSessionError(result.error) };
        }

        await fetchSessions();
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: normalizeSessionError({ message: err.message, status: 500 }),
        };
      } finally {
        setRevokingSessionId(null);
      }
    },
    [fetchSessions]
  );

  return {
    sessions,
    loading,
    error,
    revokingSessionId,
    refetch: fetchSessions,
    revokeById,
  };
}
