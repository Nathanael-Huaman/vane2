import Link from "next/link";
import {
	AlertTriangle,
	Package,
	Pencil,
	Plus,
	Shield,
	Tag,
} from "lucide-react";
import { resolvePageAuthContext } from "@/lib/server/session";
import { getAdminProducts } from "@/lib/server/store/admin-products.js";
import { PageStateCard } from "@/components/auth/page-state-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
	title: "Tienda — Panel Admin",
	description: "Administración de productos de la tienda.",
};

function StatusBadge({ status }) {
	if (status === "active") return <Badge>Activo</Badge>;
	if (status === "archived")
		return <Badge variant="destructive">Archivado</Badge>;
	return <Badge variant="secondary">Borrador</Badge>;
}

export default async function AdminStorePage() {
	const { user, isAuthenticated, isAdmin, hasAuthError, isAdminView } =
		await resolvePageAuthContext();

	if (hasAuthError) {
		return (
			<PageStateCard
				heading="Tienda Admin"
				Icon={AlertTriangle}
				iconTone="destructive"
				cardTitle="No se pudo cargar el inventario"
				cardDescription="Ocurrió un problema al validar tu sesión."
				body="Intenta nuevamente en unos instantes."
				ctaLabel="Volver al inicio"
				ctaHref="/"
				ctaVariant="outline"
			/>
		);
	}

	if (!isAuthenticated) {
		return (
			<PageStateCard
				heading="Tienda Admin"
				Icon={Shield}
				cardTitle="Acceso restringido"
				cardDescription="Necesitas iniciar sesión para administrar productos."
				ctaLabel="Iniciar sesión"
				ctaHref="/login"
			/>
		);
	}

	if (!isAdmin || !isAdminView) {
		return (
			<PageStateCard
				heading="Tienda Admin"
				Icon={Shield}
				iconTone="destructive"
				cardTitle="Acceso denegado"
				cardDescription="Solo administradores en vista administrador pueden acceder a esta sección."
				ctaLabel="Volver al inicio"
				ctaHref="/"
				ctaVariant="outline"
			/>
		);
	}

	const products = await getAdminProducts();

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
				<header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary">
							<Package className="h-7 w-7" />
							Tienda Admin
						</h1>
						<p className="text-sm text-muted-foreground">
							Inventario de productos — {user?.email}
						</p>
					</div>
					<Link
						href="/admin/tienda/nuevo"
						className="inline-flex cursor-pointer"
					>
						<Button className="gap-2">
							<Plus className="h-4 w-4" />
							Nuevo producto
						</Button>
					</Link>
				</header>

				{products.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="py-14 text-center">
							<p className="text-lg font-medium text-muted-foreground">
								No hay productos todavía
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-3">
						{products.map((product) => (
							<Link
								key={product.id}
								href={`/admin/tienda/${product.id}`}
								className="block cursor-pointer"
							>
								<Card className="transition-shadow hover:shadow-md">
									<CardContent className="flex items-center justify-between gap-4 py-4">
										<div className="min-w-0 flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<h2 className="truncate font-semibold">
													{product.name}
												</h2>
												<StatusBadge status={product.status} />
											</div>
											<p className="truncate text-xs text-muted-foreground">
												/{product.slug}
											</p>
											<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
												<span>{product.priceLabel}</span>
												<span>Stock: {product.stockQuantity}</span>
												<span className="inline-flex items-center gap-1">
													<Tag className="h-3 w-3" />
													{product.category?.name}
												</span>
											</div>
										</div>
										<Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
