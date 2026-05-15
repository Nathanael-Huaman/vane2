"use client";

import {
	useState,
	useEffect,
	useCallback,
	useSyncExternalStore,
	startTransition,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Menu,
	X,
	ShoppingBag,
	Home,
	LayoutDashboard,
	BookOpen,
	FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useViewMode } from "@/hooks/use-view-mode";
import { AuthButtons } from "@/components/auth-buttons";
import { UserMenu } from "@/components/user-menu";
import { VIEW_MODE_ADMINISTRADOR } from "@/lib/types";

const baseNavLinks = [
	{ href: "/", label: "Inicio", icon: Home },
	{ href: "/tienda", label: "Tienda", icon: ShoppingBag },
	{ href: "/blog", label: "Blog", icon: BookOpen },
];

const adminNavLinks = [
	{ href: "/admin", label: "Panel Admin", icon: LayoutDashboard },
	{ href: "/admin/blog", label: "Blog Admin", icon: FileText },
	{ href: "/admin/tienda", label: "Tienda Admin", icon: ShoppingBag },
];

export function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();
	const { user, loading: authLoading, isAdmin } = useAuth();
	const { viewMode, loading: viewModeLoading } = useViewMode();

	const isMounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);

	const closeMenu = useCallback(() => {
		setIsOpen(false);
	}, []);

	useEffect(() => {
		startTransition(() => {
			closeMenu();
		});
	}, [pathname, closeMenu]);

	useEffect(() => {
		if (!isOpen) return;

		function handleKeyDown(event) {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]);

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

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isMounted) {
		return (
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
				<div className="h-16" />
			</header>
		);
	}

	const isLoading = authLoading || viewModeLoading;
	const isAdminView = isAdmin && viewMode === VIEW_MODE_ADMINISTRADOR;
	const navLinks = isAdminView
		? [...baseNavLinks, ...adminNavLinks]
		: baseNavLinks;

	function renderNavLinks(links, isMobile = false) {
		return links.map((link) => {
			const Icon = link.icon;
			const isActive = pathname === link.href;
			return (
				<Link key={link.href} href={link.href} className="block cursor-pointer">
					<Button
						variant={isActive ? "secondary" : "ghost"}
						size="sm"
						className={`gap-2 hover:bg-primary/10 ${isMobile ? "w-full justify-start" : ""}`}
						onClick={() => isMobile && setIsOpen(false)}
					>
						<Icon className="h-4 w-4" />
						{link.label}
					</Button>
				</Link>
			);
		});
	}

	return (
		<header
			className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
			role="banner"
		>
			<nav
				className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
				role="navigation"
				aria-label="Navegacion principal"
			>
				<div className="flex items-center gap-8">
					<Link href="/" className="flex items-center gap-2 cursor-pointer">
						<span className="text-lg font-bold tracking-tight text-primary">
							OBSTEDESIGN
						</span>
					</Link>

					<div className="hidden md:flex md:items-center md:gap-1">
						{renderNavLinks(navLinks)}
					</div>
				</div>

				<div className="flex items-center gap-4">
					<div className="hidden md:block">
						{isLoading ? (
							<Skeleton className="h-9 w-24" />
						) : user ? (
							<UserMenu currentViewMode={viewMode} />
						) : (
							<AuthButtons />
						)}
					</div>

					<button
						id="hamburger-button"
						type="button"
						className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
						onClick={() => setIsOpen(!isOpen)}
						aria-expanded={isOpen}
						aria-controls="mobile-menu"
						aria-label={
							isOpen ? "Cerrar menu de navegacion" : "Abrir menu de navegacion"
						}
					>
						{isOpen ? (
							<X className="h-5 w-5" aria-hidden="true" />
						) : (
							<Menu className="h-5 w-5" aria-hidden="true" />
						)}
					</button>
				</div>
			</nav>

			<div
				id="mobile-menu"
				className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${
					isOpen ? "max-h-screen border-b" : "max-h-0"
				}`}
				aria-hidden={!isOpen}
			>
				{isOpen && (
					<div className="absolute inset-x-0 top-16 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
						<div className="max-w-7xl px-4 py-4 space-y-1">
							{renderNavLinks(navLinks, true)}
							<div className="pt-3 border-t mt-3">
								{isLoading ? (
									<Skeleton className="h-10 w-full" />
								) : user ? (
									<UserMenu currentViewMode={viewMode} />
								) : (
									<div className="space-y-2">
										<Link href="/login" className="block cursor-pointer">
											<Button
												variant="ghost"
												size="sm"
												className="w-full hover:bg-primary/10"
												onClick={() => setIsOpen(false)}
											>
												Iniciar sesion
											</Button>
										</Link>
										<Link href="/registro" className="block cursor-pointer">
											<Button
												size="sm"
												className="w-full hover:bg-primary/10"
												onClick={() => setIsOpen(false)}
											>
												Registrarse
											</Button>
										</Link>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{isOpen && (
				<div
					className="fixed inset-0 top-16 z-30 bg-black/50 md:hidden"
					onClick={() => setIsOpen(false)}
					aria-hidden="true"
				/>
			)}
		</header>
	);
}
