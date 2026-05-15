"use client";

import { useState, useEffect } from "react";

export function useViewMode() {
  const [viewMode, setViewMode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchViewMode() {
      try {
        const res = await fetch("/api/session/view-mode");
        if (!active) return;
        if (!res.ok) {
          setViewMode(null);
          return;
        }
        const data = await res.json();
        setViewMode(data?.viewMode ?? null);
      } catch {
        if (!active) return;
        setViewMode(null);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    fetchViewMode();

    function handleViewModeChanged() {
      setLoading(true);
      fetchViewMode();
    }

    window.addEventListener("obste:viewmode", handleViewModeChanged);
    return () => {
      active = false;
      window.removeEventListener("obste:viewmode", handleViewModeChanged);
    };
  }, []);

  return { viewMode, loading };
}
