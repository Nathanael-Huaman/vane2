"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/">
        <Button variant="ghost" size="sm">
          Iniciar sesion
        </Button>
      </Link>
      <Link href="/registro">
        <Button size="sm">
          Registrarse
        </Button>
      </Link>
    </div>
  );
}
