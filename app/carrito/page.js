import Link from "next/link";
import { cookies } from "next/headers";
import { ShoppingBag } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOptionalAuthenticatedSession } from "@/lib/server/auth/auth-session";
import { getCurrentCartSummary } from "@/lib/server/store/cart";
import {
	ClearCartForm,
	RemoveCartItemForm,
	UpdateCartItemForm,
} from "./cart-action-forms";

const STORE_CART_COOKIE_NAME = "store_cart_token";

async function resolveCartReadContext() {
	const cookieStore = await cookies();
	const session = await getOptionalAuthenticatedSession();
	const userId = session?.id ?? null;

	return {
		userId,
		anonymousToken: userId
			? null
			: (cookieStore.get(STORE_CART_COOKIE_NAME)?.value ?? null),
	};
}

function EmptyCartState() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Tu carrito está vacío</CardTitle>
				<CardDescription>
					Agregá productos desde la tienda para verlos acá.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Link href="/tienda" className="inline-flex cursor-pointer">
					<Button className="gap-2">
						<ShoppingBag className="h-4 w-4" aria-hidden="true" />
						Volver a la tienda
					</Button>
				</Link>
			</CardContent>
		</Card>
	);
}

export default async function CarritoPage() {
	const context = await resolveCartReadContext();
	const cart = await getCurrentCartSummary(context);

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-5xl space-y-6">
				<header className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight text-primary">
						Tu carrito
					</h1>
					<p className="text-sm text-muted-foreground">
						Revisá productos, cantidades y subtotal antes de continuar comprando.
					</p>
				</header>

				{cart.items.length === 0 ? (
					<EmptyCartState />
				) : (
					<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
						<div className="space-y-4">
							{cart.items.map((item) => (
								<Card key={item.id}>
									<CardContent className="space-y-4 p-4">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div className="space-y-1">
												<Link
													href={`/tienda/${item.productSlug}`}
													className="text-lg font-semibold text-foreground underline-offset-4 hover:underline"
												>
													{item.productName}
												</Link>
												<p className="text-sm text-muted-foreground">
													Precio unitario: {item.unitPriceLabel}
												</p>
												{item.isPurchasable ? (
													<p className="text-xs text-muted-foreground">
														Stock disponible: {item.stockQuantity}
													</p>
												) : (
													<Badge variant="secondary">
														{item.unavailableReason}
													</Badge>
												)}
											</div>
											<div className="text-right">
												<p className="text-sm text-muted-foreground">Total línea</p>
												<p className="text-lg font-semibold text-primary">
													{item.lineTotalLabel}
												</p>
											</div>
										</div>

										<div className="flex flex-wrap items-start justify-between gap-4 border-t pt-4">
											<UpdateCartItemForm item={item} />
											<RemoveCartItemForm item={item} />
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						<Card className="h-fit">
							<CardHeader>
								<CardTitle>Resumen</CardTitle>
								<CardDescription>
									{cart.itemCount} producto{cart.itemCount === 1 ? "" : "s"} en el
									carrito
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between border-t pt-4">
									<span className="font-medium">Subtotal</span>
									<span className="text-xl font-semibold text-primary">
										{cart.subtotalLabel}
									</span>
								</div>
								<ClearCartForm />
								<Link
									href="/tienda"
									className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
								>
									Seguir comprando
								</Link>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
