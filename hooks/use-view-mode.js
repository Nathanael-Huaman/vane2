"use client";

import { useState, useEffect } from "react";

export function useViewMode() {
  const [viewMode, setViewMode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/session/view-mode")
      .then(res => res.ok ? res.json() : null)
      .then(data => setViewMode(data?.viewMode))
      .catch(() => setViewMode(null))
      .finally(() => setLoading(false));
  }, []);

  return { viewMode, loading };
}
