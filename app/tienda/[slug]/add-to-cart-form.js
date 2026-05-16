"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ShoppingCart } from "lucide-react";
import { addToCartAction } from "@/lib/actions/store-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: false, data: null, error: null };

export function AddToCartForm({ product }) {
	const [state, formAction, pending] = useActionState(
		addToCartAction,
		initialState,
	);

	return (
		<form action={formAction} className="space-y-3 rounded-lg border p-4">
			<input type="hidden" name="productId" value={product.id} />

			<div className="max-w-32 space-y-2">
				<Label htmlFor="cart-quantity">Cantidad</Label>
				<Input
					id="cart-quantity"
					name="quantity"
					type="number"
					min="1"
					max={product.stockQuantity}
					defaultValue="1"
					required
					disabled={pending}
				/>
			</div>

			{state?.error?.message ? (
				<div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{state.error.message}
				</div>
			) : null}

			{state?.ok ? (
				<div className="space-y-2 text-sm" aria-live="polite">
					<p className="text-emerald-600">Producto agregado al carrito</p>
					<Link
						href="/carrito"
						className="inline-flex font-medium text-primary underline-offset-4 hover:underline"
					>
						Ver carrito
					</Link>
				</div>
			) : null}

			<Button type="submit" disabled={pending} className="gap-2">
				<ShoppingCart className="h-4 w-4" aria-hidden="true" />
				{pending ? "Agregando..." : "Agregar al carrito"}
			</Button>
		</form>
	);
}
