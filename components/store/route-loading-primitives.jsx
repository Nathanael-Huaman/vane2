import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export { Card, CardContent, CardHeader };

export const catalogSkeletons = Array.from({ length: 6 }, (_, index) => index);
export const cartItemSkeletons = Array.from({ length: 2 }, (_, index) => index);
export const detailCardSkeletons = Array.from({ length: 3 }, (_, index) => index);
export const formFieldSkeletons = Array.from({ length: 8 }, (_, index) => index);
export const listRowSkeletons = Array.from({ length: 3 }, (_, index) => index);
export const orderItemSkeletons = Array.from({ length: 3 }, (_, index) => index);
export const summaryLineSkeletons = Array.from({ length: 3 }, (_, index) => index);

export function SkeletonBlock({ className }) {
	return <Skeleton aria-hidden="true" className={className} />;
}

export function LoadingShell({ title, description, maxWidth, children }) {
	return (
		<div className="min-h-screen bg-background p-8">
			<div className={`mx-auto ${maxWidth} space-y-6`}>
				<header
					className="space-y-2"
					role="status"
					aria-live="polite"
					aria-busy="true"
				>
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Cargando
					</p>
					<h1 className="text-3xl font-bold tracking-tight text-primary">
						{title}
					</h1>
					<p className="text-sm text-muted-foreground">{description}</p>
				</header>

				{children}
			</div>
		</div>
	);
}

export function SummaryCardSkeleton({ titleWidth = "w-28" }) {
	return (
		<Card aria-hidden="true" className="h-fit">
			<CardHeader className="space-y-2">
				<SkeletonBlock className={`h-5 ${titleWidth}`} />
				<SkeletonBlock className="h-4 w-36" />
			</CardHeader>
			<CardContent className="space-y-4">
				{summaryLineSkeletons.map((item) => (
					<div key={item} className="flex items-center justify-between gap-3">
						<SkeletonBlock className="h-4 w-24" />
						<SkeletonBlock className="h-4 w-20" />
					</div>
				))}
				<SkeletonBlock className="h-10 w-full" />
			</CardContent>
		</Card>
	);
}

export function CompactSummaryRowsSkeleton() {
	return (
		<div className="space-y-3">
			{summaryLineSkeletons.map((item) => (
				<div key={item} className="flex items-center justify-between gap-4">
					<SkeletonBlock className="h-4 w-24" />
					<SkeletonBlock className="h-4 w-28" />
				</div>
			))}
		</div>
	);
}

export function DetailCardsSkeleton({ includeStatusForm = false }) {
	return (
		<div aria-hidden="true" className="mb-6 grid gap-4 md:grid-cols-3">
			{detailCardSkeletons.map((item) => (
				<Card key={item}>
					<CardHeader className="space-y-2">
						<SkeletonBlock className="h-5 w-24" />
					</CardHeader>
					<CardContent className="space-y-2">
						<SkeletonBlock className="h-4 w-32" />
						<SkeletonBlock className="h-4 w-44" />
						{includeStatusForm && item === 1 ? (
							<>
								<SkeletonBlock className="h-10 w-full" />
								<SkeletonBlock className="h-9 w-36" />
							</>
						) : null}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

export function OrderItemsCardSkeleton() {
	return (
		<Card aria-hidden="true">
			<CardHeader>
				<SkeletonBlock className="h-6 w-40" />
			</CardHeader>
			<CardContent className="grid gap-3">
				{orderItemSkeletons.map((item) => (
					<div key={item} className="rounded-lg border p-4">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
							<div className="space-y-2">
								<SkeletonBlock className="h-5 w-44" />
								<SkeletonBlock className="h-4 w-32" />
								<SkeletonBlock className="h-3 w-40" />
							</div>
							<div className="space-y-2 sm:text-right">
								<SkeletonBlock className="h-4 w-24" />
								<SkeletonBlock className="h-4 w-28" />
								<SkeletonBlock className="h-5 w-24" />
							</div>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

export function OrderListCardSkeleton({ includeStatusControls = false }) {
	return (
		<Card aria-hidden="true">
			<CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<SkeletonBlock className="h-5 w-36" />
						<SkeletonBlock className="h-6 w-24 rounded-full" />
					</div>
					<SkeletonBlock className="h-4 w-56" />
					<SkeletonBlock className="h-3 w-44" />
				</div>
				<div className="space-y-2 sm:text-right">
					<SkeletonBlock className="h-4 w-16" />
					<SkeletonBlock className="h-6 w-24" />
					<SkeletonBlock className="h-8 w-28" />
					{includeStatusControls ? <SkeletonBlock className="h-10 w-44" /> : null}
				</div>
			</CardContent>
		</Card>
	);
}
