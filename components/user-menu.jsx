"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { setCurrentViewMode } from "@/lib/actions/view-mode";
import {
  VIEW_MODE_ADMINISTRADOR,
  VIEW_MODE_CLIENTE,
} from "@/lib/types";

export function UserMenu({ currentViewMode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [isChangingMode, setIsChangingMode] = useState(false);

  if (loading) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!user) {
    return null;
  }

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  async function handleChangeViewMode(viewMode) {
    if (isChangingMode || viewMode === currentViewMode) return;

    setIsChangingMode(true);
    try {
      const result = await setCurrentViewMode(viewMode);
      if (result.ok) {
        window.dispatchEvent(new Event("obste:viewmode"));
        router.refresh();
      }
    } finally {
      setIsChangingMode(false);
    }
  }

  const displayName = user.name || user.email || "Usuario";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-0 hover:bg-primary/10"
          aria-label="Menu de usuario"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initials}
          </div>
          <span className="hidden sm:inline">{displayName}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil" className="cursor-pointer hover:bg-primary/10">
            <User className="mr-2 h-4 w-4" />
            Mi cuenta
          </Link>
        </DropdownMenuItem>
        {isAdmin && currentViewMode === VIEW_MODE_CLIENTE && (
          <DropdownMenuItem
            onSelect={() => handleChangeViewMode(VIEW_MODE_ADMINISTRADOR)}
            disabled={isChangingMode}
            className="cursor-pointer hover:bg-primary/10"
          >
            <Settings className="mr-2 h-4 w-4" />
            {isChangingMode ? "Cambiando..." : "Cambiar a vista admin"}
          </DropdownMenuItem>
        )}
        {isAdmin && currentViewMode === VIEW_MODE_ADMINISTRADOR && (
          <DropdownMenuItem
            onSelect={() => handleChangeViewMode(VIEW_MODE_CLIENTE)}
            disabled={isChangingMode}
            className="cursor-pointer hover:bg-primary/10"
          >
            <Settings className="mr-2 h-4 w-4" />
            {isChangingMode ? "Cambiando..." : "Cambiar a vista cliente"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive hover:bg-primary/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
