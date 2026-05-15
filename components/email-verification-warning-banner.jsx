"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { TriangleAlert, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingButtonContent } from "@/components/loading-button-content";

export function EmailVerificationWarningBanner() {
  const { data: session, status } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const shouldShow =
    status === "authenticated" && session?.user?.emailVerificado === false && !dismissed;

  async function handleResend() {
    if (loading) return;
    setFeedback("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reenviar-verificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFeedback(data?.error || "No se pudo reenviar la verificacion.");
        return;
      }

      setFeedback("Te enviamos un nuevo correo de verificacion.");
    } catch {
      setFeedback("No se pudo reenviar la verificacion.");
    } finally {
      setLoading(false);
    }
  }

  if (!shouldShow) return null;

  return (
    <div className="px-8 pt-4">
      <div className="mx-auto max-w-3xl">
        <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-50">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="space-y-1">
            <p>Tu correo electronico no esta verificado.</p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-amber-950 dark:text-amber-50"
              onClick={handleResend}
              disabled={loading}
            >
              {loading ? (
                <LoadingButtonContent label="Reenviando verificacion" />
              ) : (
                "Reenviar verificacion"
              )}
            </Button>
            {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setDismissed(true)}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </AlertAction>
        </Alert>
      </div>
    </div>
  );
}
