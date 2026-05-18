import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { Label } from "@/components/ui/label";
import { checkoutAction } from "@/lib/actions/store-checkout";
import { getOptionalAuthenticatedSession } from "@/lib/server/auth/auth-session";
import { getCurrentCartSummary } from "@/lib/server/store/cart";

const STORE_CART_COOKIE_NAME = "store_cart_token";

async function resolveCartReadContext() {
	const cookieStore = await cookies();
	const session = await getOptionalAuthenticatedSession();
	const userId = session?.id ?? null;
	return { userId, anonymousToken: userId ? null : (cookieStore.get(STORE_CART_COOKIE_NAME)?.value ?? null) };
}

function CheckoutForm() {
	return (
		<form action={checkoutAction} className="space-y-4 rounded-lg border bg-card p-6">
			<h2 className="text-xl font-semibold">Datos de contacto</h2>
			<div className="space-y-2"><Label htmlFor="customerName">Nombre completo</Label><Input id="customerName" name="customerName" maxLength={120} required /></div>
			<div className="space-y-2"><Label htmlFor="customerEmail">Correo electrónico</Label><Input id="customerEmail" name="customerEmail" type="email" maxLength={254} required /></div>
			<Button type="submit">Crear pedido</Button>
		</form>
	);
}

function CheckoutSummary({ cart }) {
	return (
		<aside className="space-y-3 rounded-lg border bg-card p-6">
			<h2 className="text-xl font-semibold">Resumen</h2>
			<ul className="space-y-2 text-sm text-muted-foreground">
				{cart.items.map((item) => (
					<li key={item.id} className="flex justify-between gap-3"><span>{item.quantity} × {item.productName}</span><span>{item.lineTotalLabel}</span></li>
				))}
			</ul>
			<p className="flex justify-between border-t pt-3 font-medium"><span>Subtotal</span><span>{cart.subtotalLabel}</span></p>
			<Link href="/carrito" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Editar carrito</Link>
		</aside>
	);
}

export default async function CheckoutPage() {
	const cart = await getCurrentCartSummary(await resolveCartReadContext());
	return (
		<main className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-3xl space-y-6">
				<header className="space-y-2"><h1 className="text-3xl font-bold tracking-tight text-primary">Checkout</h1><p className="text-sm text-muted-foreground">Completá tus datos mínimos para crear el pedido.</p></header>
				{cart.items.length === 0 ? (
					<section className="space-y-3 rounded-lg border bg-card p-6">
						<h2 className="text-xl font-semibold">Tu carrito está vacío</h2>
						<p className="text-sm text-muted-foreground">Agregá productos antes de crear un pedido.</p>
						<Link href="/tienda" className="inline-flex"><Button>Volver a la tienda</Button></Link>
					</section>
				) : (
					<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
						<CheckoutForm />
						<CheckoutSummary cart={cart} />
					</div>
				)}
			</div>
		</main>
	);
}
