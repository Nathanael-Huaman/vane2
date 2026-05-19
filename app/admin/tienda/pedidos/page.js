import Link from "next/link";
import { AlertTriangle, ClipboardList, Shield } from "lucide-react";
import { PageStateCard } from "@/components/auth/page-state-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateOrderStatusAction } from "@/lib/actions/store-admin-orders";
import { resolvePageAuthContext } from "@/lib/server/session";
import {
	getAdminOrderSummaries,
	parseAdminOrderFilters,
} from "@/lib/server/store/admin-orders.js";

export const metadata = {
	title: "Pedidos — Tienda Admin",
	description: "Lista administrativa de pedidos de la tienda.",
};

function AccessState({ type }) {
	const states = {
		error: {
			Icon: AlertTriangle,
			iconTone: "destructive",
			cardTitle: "No se pudieron cargar los pedidos",
			cardDescription: "Ocurrió un problema al validar tu sesión.",
			body: "Intenta nuevamente en unos instantes.",
			ctaLabel: "Volver al panel de tienda",
			ctaHref: "/admin/tienda",
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
	return <PageStateCard heading="Pedidos — Tienda Admin" {...states[type]} />;
}

function StatusBadge({ order }) {
	return order.status === "confirmed" ? (
		<Badge>{order.statusLabel}</Badge>
	) : (
		<Badge variant="secondary">{order.statusLabel}</Badge>
	);
}

function toReturnPath(params) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params ?? {})) {
		const fieldValue = Array.isArray(value) ? value[0] : value;
		if (["status", "q"].includes(key) && fieldValue) query.set(key, fieldValue);
	}
	const suffix = query.toString();
	return suffix ? `/admin/tienda/pedidos?${suffix}` : "/admin/tienda/pedidos";
}

function StatusForm({ order, returnTo }) {
	return (
		<form action={updateOrderStatusAction} className="mt-3 flex items-end gap-2 sm:justify-end">
			<input type="hidden" name="id" value={order.id} />
			<input type="hidden" name="returnTo" value={returnTo} />
			<label className="grid gap-1 text-xs font-medium text-muted-foreground">
				Cambiar estado
				<select name="status" defaultValue={order.status} className="rounded-md border bg-background px-2 py-1 text-sm text-foreground">
					<option value="pending">Pendiente</option>
					<option value="confirmed">Confirmado</option>
				</select>
			</label>
			<Button type="submit" size="sm" variant="outline">Actualizar</Button>
		</form>
	);
}

export default async function AdminStoreOrdersPage({ searchParams }) {
	const { user, isAuthenticated, isAdmin, hasAuthError, isAdminView } =
		await resolvePageAuthContext();

	if (hasAuthError) return <AccessState type="error" />;
	if (!isAuthenticated) return <AccessState type="login" />;
	if (!isAdmin || !isAdminView) return <AccessState type="denied" />;

	const resolvedSearchParams = await searchParams;
	const filters = parseAdminOrderFilters(resolvedSearchParams);
	const returnTo = toReturnPath(resolvedSearchParams);
	const orders = await getAdminOrderSummaries(filters);

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
				<header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary">
							<ClipboardList className="h-7 w-7" />
							Pedidos — Tienda Admin
						</h1>
						<p className="text-sm text-muted-foreground">Consulta de pedidos — {user?.email}</p>
					</div>
					<Button variant="outline" asChild><Link href="/admin/tienda">Volver a tienda</Link></Button>
				</header>

				<Card className="mb-6">
					<CardContent className="py-4">
						<form method="GET" className="grid gap-3 sm:grid-cols-[180px_1fr_auto_auto]">
							<label className="grid gap-1 text-sm font-medium">
								Estado
								<select name="status" defaultValue={filters.status ?? ""} className="rounded-md border bg-background px-3 py-2 text-sm">
									<option value="">Todos</option>
									<option value="pending">Pendiente</option>
									<option value="confirmed">Confirmado</option>
								</select>
							</label>
							<label className="grid gap-1 text-sm font-medium">
								Buscar cliente
								<input name="q" defaultValue={filters.q} placeholder="Nombre o email" className="rounded-md border bg-background px-3 py-2 text-sm" />
							</label>
							<Button type="submit" className="self-end">Filtrar</Button>
							<Button type="button" variant="outline" className="self-end" asChild><Link href="/admin/tienda/pedidos">Limpiar</Link></Button>
						</form>
					</CardContent>
				</Card>

				<p className={filters.invalidStatus ? "mb-4 text-sm text-destructive" : "mb-4 text-sm text-muted-foreground"}>
					{filters.invalidStatus
						? "El filtro de estado no es válido. Usa pending o confirmed."
						: `${orders.length} pedido${orders.length === 1 ? "" : "s"} encontrado${orders.length === 1 ? "" : "s"}`}
				</p>

				{orders.length === 0 ? (
					<Card className="border-dashed"><CardContent className="py-14 text-center text-lg font-medium text-muted-foreground">No hay pedidos para mostrar.</CardContent></Card>
				) : (
					<div className="grid gap-3">
						{orders.map((order) => (
							<Card key={order.id}>
								<CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="min-w-0 space-y-1">
										<div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Pedido {order.id}</h2><StatusBadge order={order} /></div>
										<p className="text-sm text-muted-foreground">{order.customerName} — {order.customerEmail}</p>
										<p className="text-xs text-muted-foreground">Creado: {order.createdAtLabel} · Actualizado: {order.updatedAtLabel}</p>
									</div>
									<div className="text-left sm:text-right"><p className="text-sm text-muted-foreground">Total</p><p className="text-lg font-semibold">{order.totalLabel}</p><Button variant="link" className="h-auto p-0" asChild><Link href={order.detailPath}>Ver detalle</Link></Button><StatusForm order={order} returnTo={returnTo} /></div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
