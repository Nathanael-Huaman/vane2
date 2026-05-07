"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/lib/auth/auth-client";

export function SignOutButton({ callbackUrl = "/", className = "w-full", variant = "outline" }) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        try {
          await signOutUser({ callbackUrl });
        } finally {
          setIsSigningOut(false);
        }
      }}
    >
      {isSigningOut ? "Cerrando sesion..." : "Cerrar sesion"}
    </Button>
  );
}
