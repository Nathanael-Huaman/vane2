"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ShoppingBag, Home, LayoutDashboard } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useViewMode } from "@/hooks/use-view-mode";
import { AuthButtons } from "@/components/auth-buttons";
import { UserMenu } from "@/components/user-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VIEW_MODE_ADMINISTRADOR } from "@/lib/types";

const baseNavLinks = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/tienda", label: "Tienda", icon: ShoppingBag },
];

const adminNavLinks = [
  { href: "/admin", label: "Panel Admin", icon: LayoutDashboard },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { viewMode, loading: viewModeLoading } = useViewMode();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      const nav = document.getElementById("mobile-menu");
      const button = document.getElementById("hamburger-button");
      if (
        nav &&
        button &&
        !nav.contains(event.target) &&
        !button.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-16" />
      </header>
    );
  }

  const isLoading = authLoading || viewModeLoading;
  const isAdminView = isAdmin && viewMode === VIEW_MODE_ADMINISTRADOR;
  const navLinks = isAdminView ? [...baseNavLinks, ...adminNavLinks] : baseNavLinks;

  function renderNavLinks(links, isMobile = false) {
    return links.map((link) => {
      const Icon = link.icon;
      const isActive = pathname === link.href;
      return (
        <Link key={link.href} href={link.href}>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={`gap-2 ${isMobile ? "w-full justify-start" : ""}`}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Button>
        </Link>
      );
    });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-primary">
              OBSTEDESIGN
            </span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-1">
            {renderNavLinks(navLinks)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : user ? (
            <UserMenu currentViewMode={viewMode} />
          ) : (
            <AuthButtons />
          )}

          <button
            id="hamburger-button"
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? "max-h-96 border-b" : "max-h-0"
        }`}
      >
        <div className="space-y-1 px-4 py-2">
          {renderNavLinks(navLinks, true)}
          <div className="pt-2">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : user ? (
              <UserMenu currentViewMode={viewMode} />
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
