"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/" className="cursor-pointer">
        <Button variant="ghost" size="sm" className="hover:bg-primary/10">
          Iniciar sesion
        </Button>
      </Link>
      <Link href="/registro" className="cursor-pointer">
        <Button size="sm">
          Registrarse
        </Button>
      </Link>
    </div>
  );
}
