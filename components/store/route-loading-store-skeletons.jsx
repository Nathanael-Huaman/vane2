import {
	Card,
	CardContent,
	catalogSkeletons,
	cartItemSkeletons,
	LoadingShell,
	SkeletonBlock,
	SummaryCardSkeleton,
} from "@/components/store/route-loading-primitives";

function CatalogCardSkeleton() {
	return (
		<Card aria-hidden="true" className="overflow-hidden">
			<CardContent className="space-y-3 p-4">
				<SkeletonBlock className="h-44 w-full" />
				<div className="space-y-2">
					<SkeletonBlock className="h-3 w-20" />
					<SkeletonBlock className="h-5 w-4/5" />
					<SkeletonBlock className="h-4 w-full" />
					<SkeletonBlock className="h-4 w-2/3" />
				</div>
				<div className="flex items-center justify-between gap-2">
					<SkeletonBlock className="h-5 w-20" />
					<SkeletonBlock className="h-6 w-24 rounded-full" />
				</div>
				<SkeletonBlock className="h-4 w-24" />
			</CardContent>
		</Card>
	);
}

function ProductPurchasePanelSkeleton() {
	return (
		<div aria-hidden="true" className="space-y-3 rounded-lg border p-4">
			<SkeletonBlock className="h-4 w-24" />
			<SkeletonBlock className="h-10 w-32" />
			<SkeletonBlock className="h-10 w-44" />
		</div>
	);
}

function CartLineSkeleton() {
	return (
		<Card aria-hidden="true">
			<CardContent className="space-y-4 p-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-2">
						<SkeletonBlock className="h-5 w-44" />
						<SkeletonBlock className="h-4 w-32" />
						<SkeletonBlock className="h-3 w-28" />
					</div>
					<div className="space-y-2 text-right">
						<SkeletonBlock className="h-4 w-20" />
						<SkeletonBlock className="h-6 w-24" />
					</div>
				</div>

				<div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
					<div className="space-y-2">
						<SkeletonBlock className="h-4 w-28" />
						<SkeletonBlock className="h-10 w-28" />
					</div>
					<SkeletonBlock className="h-10 w-36" />
				</div>
			</CardContent>
		</Card>
	);
}

function CheckoutFormSkeleton() {
	return (
		<section aria-hidden="true" className="space-y-4 rounded-lg border bg-card p-6">
			<SkeletonBlock className="h-6 w-40" />
			<div className="space-y-2">
				<SkeletonBlock className="h-4 w-32" />
				<SkeletonBlock className="h-10 w-full" />
			</div>
			<div className="space-y-2">
				<SkeletonBlock className="h-4 w-36" />
				<SkeletonBlock className="h-10 w-full" />
			</div>
			<SkeletonBlock className="h-16 w-full" />
			<SkeletonBlock className="h-10 w-32" />
		</section>
	);
}

export function CatalogLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando tienda"
			description="Estamos preparando el catálogo público de productos."
			maxWidth="max-w-6xl"
		>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{catalogSkeletons.map((item) => (
					<CatalogCardSkeleton key={item} />
				))}
			</div>
		</LoadingShell>
	);
}

export function ProductDetailLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando producto"
			description="Estamos preparando el detalle del producto seleccionado."
			maxWidth="max-w-4xl"
		>
			<Card aria-hidden="true">
				<CardContent className="space-y-6 p-6">
					<SkeletonBlock className="h-72 w-full" />
					<div className="space-y-2">
						<SkeletonBlock className="h-3 w-20" />
						<SkeletonBlock className="h-8 w-3/4" />
						<SkeletonBlock className="h-4 w-full" />
						<SkeletonBlock className="h-4 w-5/6" />
					</div>
					<div className="flex items-center justify-between gap-3">
						<SkeletonBlock className="h-8 w-28" />
						<SkeletonBlock className="h-6 w-24 rounded-full" />
					</div>
					<ProductPurchasePanelSkeleton />
				</CardContent>
			</Card>
		</LoadingShell>
	);
}

export function CartLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando carrito"
			description="Estamos revisando productos, cantidades y subtotal."
			maxWidth="max-w-5xl"
		>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
				<div className="space-y-4">
					{cartItemSkeletons.map((item) => (
						<CartLineSkeleton key={item} />
					))}
				</div>
				<SummaryCardSkeleton />
			</div>
		</LoadingShell>
	);
}

export function CheckoutLoadingSkeleton() {
	return (
		<LoadingShell
			title="Cargando checkout"
			description="Estamos preparando tus datos mínimos de compra y el resumen del pedido."
			maxWidth="max-w-3xl"
		>
			<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
				<CheckoutFormSkeleton />
				<SummaryCardSkeleton titleWidth="w-24" />
			</div>
		</LoadingShell>
	);
}
