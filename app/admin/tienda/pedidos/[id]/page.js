import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ClipboardList, Package, Shield } from "lucide-react";
import { PageStateCard } from "@/components/auth/page-state-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOrderStatusAction } from "@/lib/actions/store-admin-orders";
import { resolvePageAuthContext } from "@/lib/server/session";
import { getAdminOrderDetailById } from "@/lib/server/store/admin-orders.js";

export const metadata = {
	title: "Detalle de pedido — Tienda Admin",
	description: "Detalle administrativo de un pedido de la tienda.",
};

function AccessState({ type }) {
	const states = {
		error: {
			Icon: AlertTriangle,
			iconTone: "destructive",
			cardTitle: "No se pudo cargar el pedido",
			cardDescription: "Ocurrió un problema al validar tu sesión.",
			body: "Intenta nuevamente en unos instantes.",
			ctaLabel: "Volver a pedidos",
			ctaHref: "/admin/tienda/pedidos",
			ctaVariant: "outline",
		},
		login: {
			Icon: Shield,
			cardTitle: "Acceso restringido",
			cardDescription: "Necesitas iniciar sesión para ver pedidos.",
			ctaLabel: "Iniciar sesión",
			ctaHref: "/login",
		},
		denied: {
			Icon: Shield,
			iconTone: "destructive",
			cardTitle: "Acceso denegado",
			cardDescription: "Solo administradores en vista administrador pueden acceder a pedidos.",
			ctaLabel: "Volver al inicio",
			ctaHref: "/",
			ctaVariant: "outline",
		},
	};
	return <PageStateCard heading="Detalle de pedido" {...states[type]} />;
}

function StatusBadge({ order }) {
	return order.status === "confirmed" ? (
		<Badge>{order.statusLabel}</Badge>
	) : (
		<Badge variant="secondary">{order.statusLabel}</Badge>
	);
}

function StatusForm({ order }) {
	return (
		<form action={updateOrderStatusAction} className="grid gap-2">
			<input type="hidden" name="id" value={order.id} />
			<input type="hidden" name="returnTo" value={order.detailPath} />
			<label className="grid gap-1 text-sm font-medium">
				Cambiar estado
				<select name="status" defaultValue={order.status} className="rounded-md border bg-background px-3 py-2 text-sm">
					<option value="pending">Pendiente</option>
					<option value="confirmed">Confirmado</option>
				</select>
			</label>
			<Button type="submit" size="sm" variant="outline">Actualizar estado</Button>
		</form>
	);
}

export default async function AdminStoreOrderDetailPage({ params }) {
	const { user, isAuthenticated, isAdmin, hasAuthError, isAdminView } =
		await resolvePageAuthContext();

	if (hasAuthError) return <AccessState type="error" />;
	if (!isAuthenticated) return <AccessState type="login" />;
	if (!isAdmin || !isAdminView) return <AccessState type="denied" />;

	const { id } = await params;
	const order = await getAdminOrderDetailById(id);
	if (!order) notFound();

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
				<header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary">
							<ClipboardList className="h-7 w-7" />
							Pedido {order.id}
						</h1>
						<p className="text-sm text-muted-foreground">Consulta de pedido — {user?.email}</p>
					</div>
					<Button variant="outline" asChild><Link href="/admin/tienda/pedidos">Volver a pedidos</Link></Button>
				</header>

				<div className="mb-6 grid gap-4 md:grid-cols-3">
					<Card>
						<CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
						<CardContent className="space-y-1 text-sm">
							<p className="font-medium">{order.customerName}</p>
							<p className="text-muted-foreground">{order.customerEmail}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader><CardTitle>Estado</CardTitle></CardHeader>
						<CardContent className="space-y-2 text-sm">
							<StatusBadge order={order} />
							<StatusForm order={order} />
							<p className="text-muted-foreground">Creado: {order.createdAtLabel}</p>
							<p className="text-muted-foreground">Actualizado: {order.updatedAtLabel}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader><CardTitle>Totales</CardTitle></CardHeader>
						<CardContent className="space-y-1 text-sm">
							<p>Subtotal: <span className="font-medium">{order.subtotalLabel}</span></p>
							<p>Total: <span className="font-semibold">{order.totalLabel}</span></p>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Items guardados</CardTitle></CardHeader>
					<CardContent className="grid gap-3">
						{order.items.map((item) => (
							<div key={item.id} className="rounded-lg border p-4">
								<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<p className="font-semibold">{item.productName}</p>
										<p className="text-sm text-muted-foreground">Slug: {item.productSlug}</p>
										<p className="text-xs text-muted-foreground">Producto original: {item.productId}</p>
									</div>
									<div className="text-sm sm:text-right">
										<p>Cantidad: {item.quantity}</p>
										<p>Unitario: {item.unitPriceLabel}</p>
										<p className="font-semibold">Línea: {item.lineTotalLabel}</p>
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
