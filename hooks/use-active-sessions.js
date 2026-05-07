"use client";

import { useState, useEffect, useCallback } from "react";
import { getActiveSessions, normalizeSessionError } from "@/lib/client/sessions";

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
 *   refetch: () => void,
 * }}
 */
export function useActiveSessions() {
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
  };
}
