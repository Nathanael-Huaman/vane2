import { notFound } from "next/navigation";
import { getOrderByConfirmationToken } from "../../../../lib/server/store/orders.js";
import { buildOrderConfirmationViewModel } from "./confirmation-view-model.js";

export default async function OrderConfirmationPage({ params }) {
	const { token } = await params;
	const order = await getOrderByConfirmationToken(token);
	if (!order) notFound();
	const confirmation = buildOrderConfirmationViewModel(order);

	return (
		<main className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-3xl space-y-6">
				<header className="space-y-2">
					<p className="text-sm font-medium text-primary">{confirmation.heading}</p>
					<h1 className="text-3xl font-bold tracking-tight">Gracias por tu pedido</h1>
					<p className="text-sm text-muted-foreground">
						Guardá este enlace privado para consultar el detalle del pedido.
					</p>
				</header>

				<section className="grid gap-3 rounded-lg border bg-card p-6 text-sm">
					<div className="flex justify-between gap-4">
						<span className="text-muted-foreground">Cliente</span>
						<span>{confirmation.customerName}</span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="text-muted-foreground">Correo</span>
						<span>{confirmation.customerEmail}</span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="text-muted-foreground">Estado</span>
						<span>{confirmation.status}</span>
					</div>
				</section>

				<section className="space-y-3 rounded-lg border bg-card p-6">
					<h2 className="text-xl font-semibold">Resumen del pedido</h2>
					<ul className="space-y-3">
						{confirmation.items.map((item) => (
							<li key={item.id} className="border-b pb-3 last:border-b-0 last:pb-0">
								<div className="flex justify-between gap-4 font-medium">
									<span>{item.productName}</span>
									<span>{item.lineTotalLabel}</span>
								</div>
								<p className="text-sm text-muted-foreground">
									{item.productSlug} · {item.quantity} × {item.unitPriceLabel}
								</p>
							</li>
						))}
					</ul>
					<div className="space-y-2 border-t pt-4 text-sm">
						<p className="flex justify-between">
							<span>Subtotal</span>
							<span>{confirmation.subtotalLabel}</span>
						</p>
						<p className="flex justify-between text-base font-semibold text-primary">
							<span>Total</span>
							<span>{confirmation.totalLabel}</span>
						</p>
					</div>
				</section>
			</div>
		</main>
	);
}
