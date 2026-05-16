"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
	clearCartAction,
	removeCartItemAction,
	updateCartItemAction,
} from "@/lib/actions/store-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: false, data: null, error: null };

function ActionMessage({ state, successMessage }) {
	if (state?.error?.message) {
		return (
			<p className="text-sm text-destructive" aria-live="polite">
				{state.error.message}
			</p>
		);
	}

	if (state?.ok && successMessage) {
		return (
			<p className="text-sm text-emerald-600" aria-live="polite">
				{successMessage}
			</p>
		);
	}

	return null;
}

export function UpdateCartItemForm({ item }) {
	const [state, formAction, pending] = useActionState(
		updateCartItemAction,
		initialState,
	);
	const inputId = `cart-quantity-${item.productId}`;
	const disabled = pending || !item.isPurchasable;

	return (
		<form action={formAction} className="space-y-2">
			<input type="hidden" name="productId" value={item.productId} />
			<div className="flex flex-wrap items-end gap-2">
				<div className="w-28 space-y-2">
					<Label htmlFor={inputId}>Cantidad para {item.productName}</Label>
					<Input
						id={inputId}
						name="quantity"
						type="number"
						min="1"
						max={item.stockQuantity}
						defaultValue={item.quantity}
						required
						disabled={disabled}
						aria-label={`Cantidad para ${item.productName}`}
					/>
				</div>
				<Button type="submit" variant="outline" disabled={disabled}>
					{pending ? "Actualizando..." : `Actualizar ${item.productName}`}
				</Button>
			</div>
			<ActionMessage state={state} successMessage="Cantidad actualizada" />
		</form>
	);
}

export function RemoveCartItemForm({ item }) {
	const [state, formAction, pending] = useActionState(
		removeCartItemAction,
		initialState,
	);

	return (
		<form action={formAction} className="space-y-2">
			<input type="hidden" name="productId" value={item.productId} />
			<Button type="submit" variant="destructive" disabled={pending} className="gap-2">
				<Trash2 className="h-4 w-4" aria-hidden="true" />
				{pending ? "Quitando..." : `Quitar ${item.productName}`}
			</Button>
			<ActionMessage state={state} />
		</form>
	);
}

export function ClearCartForm() {
	const [state, formAction, pending] = useActionState(
		clearCartAction,
		initialState,
	);

	return (
		<form action={formAction} className="space-y-2">
			<Button type="submit" variant="outline" disabled={pending}>
				{pending ? "Vaciando..." : "Vaciar carrito"}
			</Button>
			<ActionMessage state={state} />
		</form>
	);
}
