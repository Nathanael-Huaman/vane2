import {
	CompactSummaryRowsSkeleton,
	LoadingShell,
	OrderItemsCardSkeleton,
	OrderListCardSkeleton,
	orderItemSkeletons,
	listRowSkeletons,
	SkeletonBlock,
	DetailCardsSkeleton,
} from "@/components/store/route-loading-primitives";

function OrderLineSkeleton() {
	return (
		<div aria-hidden="true" className="border-b pb-3 last:border-b-0 last:pb-0">
			<div className="flex justify-between gap-4">
				<SkeletonBlock className="h-5 w-40" />
				<SkeletonBlock className="h-5 w-20" />
			</div>
			<SkeletonBlock className="mt-2 h-4 w-56" />
		</div>
	);
}

function OrderSummarySkeleton() {
	return (
		<section aria-hidden="true" className="space-y-4 rounded-lg border bg-card p-6">
			<SkeletonBlock className="h-6 w-44" />
			<div className="space-y-3">
				{orderItemSkeletons.map((item) => (
					<OrderLineSkeleton key={item} />
				))}
			</div>
			<div className="space-y-2 border-t pt-4">
				<CompactSummaryRowsSkeleton />
			</div>
		</section>
	);
}

export function OrderConfirmationLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando confirmación"
			description="Estamos preparando el resumen privado del pedido."
			maxWidth="max-w-3xl"
		>
			<section aria-hidden="true" className="grid gap-3 rounded-lg border bg-card p-6">
				<CompactSummaryRowsSkeleton />
			</section>
			<OrderSummarySkeleton />
		</LoadingShell>
	);
}

export function CustomerOrdersLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando tus pedidos"
			description="Estamos preparando el historial de compras de la cuenta."
			maxWidth="max-w-4xl"
		>
			<div className="space-y-3">
				{listRowSkeletons.map((item) => (
					<OrderListCardSkeleton key={item} />
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

export function CustomerOrderDetailLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando detalle de pedido"
			description="Estamos preparando el detalle asociado a la cuenta."
			maxWidth="max-w-5xl"
		>
			<DetailCardsSkeleton />
			<OrderItemsCardSkeleton />
		</LoadingShell>
	);
}
