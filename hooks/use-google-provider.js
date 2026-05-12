"use client";

import { useEffect, useState } from "react";
import { getProviders } from "next-auth/react";

export function useGoogleProvider() {
  const [googleProviderEnabled, setGoogleProviderEnabled] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      try {
        const providers = await getProviders();
        if (!isMounted) return;
        setGoogleProviderEnabled(Boolean(providers?.google));
      } catch {
        if (!isMounted) return;
        setGoogleProviderEnabled(false);
      } finally {
        if (isMounted) setProvidersLoading(false);
      }
    }

    loadProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    googleProviderEnabled,
    providersLoading,
  };
}
