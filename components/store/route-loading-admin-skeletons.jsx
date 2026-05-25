import {
	Card,
	CardContent,
	CardHeader,
	DetailCardsSkeleton,
	formFieldSkeletons,
	listRowSkeletons,
	LoadingShell,
	OrderItemsCardSkeleton,
	OrderListCardSkeleton,
	SkeletonBlock,
} from "@/components/store/route-loading-primitives";

function ProductInventoryCardSkeleton() {
	return (
		<Card aria-hidden="true">
			<CardContent className="flex items-center justify-between gap-4 py-4">
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex items-center gap-2">
						<SkeletonBlock className="h-5 w-44" />
						<SkeletonBlock className="h-6 w-20 rounded-full" />
					</div>
					<SkeletonBlock className="h-3 w-36" />
					<div className="flex flex-wrap items-center gap-3">
						<SkeletonBlock className="h-4 w-20" />
						<SkeletonBlock className="h-4 w-24" />
						<SkeletonBlock className="h-4 w-28" />
					</div>
				</div>
				<SkeletonBlock className="h-4 w-4 shrink-0" />
			</CardContent>
		</Card>
	);
}

function ProductFormSkeleton() {
	return (
		<Card aria-hidden="true">
			<CardHeader className="space-y-2">
				<SkeletonBlock className="h-6 w-40" />
				<SkeletonBlock className="h-4 w-72 max-w-full" />
			</CardHeader>
			<CardContent className="space-y-4">
				{formFieldSkeletons.slice(0, 4).map((field) => (
					<div key={field} className="space-y-2">
						<SkeletonBlock className="h-4 w-32" />
						<SkeletonBlock className={field === 3 ? "h-24 w-full" : "h-10 w-full"} />
					</div>
				))}
				<div className="grid gap-4 sm:grid-cols-2">
					{formFieldSkeletons.slice(4).map((field) => (
						<div key={field} className="space-y-2">
							<SkeletonBlock className="h-4 w-28" />
							<SkeletonBlock className="h-10 w-full" />
						</div>
					))}
				</div>
				<SkeletonBlock className="h-5 w-28" />
				<div className="flex gap-3 border-t pt-4">
					<SkeletonBlock className="h-10 w-36" />
					<SkeletonBlock className="h-10 w-28" />
				</div>
			</CardContent>
		</Card>
	);
}

function AdminOrderFilterSkeleton() {
	return (
		<Card aria-hidden="true" className="mb-6">
			<CardContent className="grid gap-3 py-4 sm:grid-cols-[180px_1fr_auto_auto]">
				<div className="space-y-2">
					<SkeletonBlock className="h-4 w-16" />
					<SkeletonBlock className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<SkeletonBlock className="h-4 w-28" />
					<SkeletonBlock className="h-10 w-full" />
				</div>
				<SkeletonBlock className="h-10 w-20 self-end" />
				<SkeletonBlock className="h-10 w-20 self-end" />
			</CardContent>
		</Card>
	);
}

export function AdminProductListLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando inventario"
			description="Estamos preparando productos, estados y stock del panel."
			maxWidth="max-w-5xl"
		>
			<div aria-hidden="true" className="mb-4 flex justify-end">
				<SkeletonBlock className="h-10 w-36" />
			</div>
			<div className="grid gap-3">
				{listRowSkeletons.map((item) => (
					<ProductInventoryCardSkeleton key={item} />
				))}
			</div>
		</LoadingShell>
	);
}

export function AdminProductFormLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando formulario"
			description="Estamos preparando los campos administrativos del producto."
			maxWidth="max-w-3xl"
		>
			<div aria-hidden="true" className="mb-2">
				<SkeletonBlock className="h-9 w-44" />
			</div>
			<ProductFormSkeleton />
		</LoadingShell>
	);
}

export function AdminOrderListLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando pedidos admin"
			description="Estamos preparando filtros, estados y totales de pedidos."
			maxWidth="max-w-5xl"
		>
			<AdminOrderFilterSkeleton />
			<div className="space-y-3">
				{listRowSkeletons.map((item) => (
					<OrderListCardSkeleton key={item} includeStatusControls />
				))}
			</div>
			<div aria-hidden="true" className="mt-6 flex items-center justify-between gap-3">
				<SkeletonBlock className="h-4 w-20" />
				<div className="flex gap-2">
					<SkeletonBlock className="h-10 w-24" />
					<SkeletonBlock className="h-10 w-24" />
				</div>
			</div>
		</LoadingShell>
	);
}

export function AdminOrderDetailLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando pedido admin"
			description="Estamos preparando cliente, estado, totales e items del pedido."
			maxWidth="max-w-5xl"
		>
			<DetailCardsSkeleton includeStatusForm />
			<OrderItemsCardSkeleton />
		</LoadingShell>
	);
}
