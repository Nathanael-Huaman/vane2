"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAuthenticatedSession } from "@/lib/server/auth/auth-session";
import {
	errorResponse,
	serverErrorResponse,
	successResponse,
} from "@/lib/server/shared";
import {
	addCartItem,
	clearCart,
	removeCartItem,
	updateCartItemQuantity,
} from "@/lib/server/store/cart.js";
import { isCartDomainError } from "@/lib/server/store/cart-validation.js";

export const STORE_CART_COOKIE_NAME = "store_cart_token";

const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getCartCookieOptions() {
	return {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: CART_COOKIE_MAX_AGE_SECONDS,
		secure: process.env.NODE_ENV === "production",
	};
}

async function resolveCartActionContext() {
	const cookieStore = await cookies();
	const session = await getAuthenticatedSession();
	const userId = session.ok ? session.data.id : null;

	return {
		cookieStore,
		context: {
			userId,
			anonymousToken: userId
				? null
				: (cookieStore.get(STORE_CART_COOKIE_NAME)?.value ?? null),
		},
	};
}

function persistAnonymousToken(cookieStore, summary) {
	if (!summary.createdAnonymousToken) return;
	cookieStore.set(
		STORE_CART_COOKIE_NAME,
		summary.createdAnonymousToken,
		getCartCookieOptions(),
	);
}

function revalidateCartPaths(summary = null) {
	revalidatePath("/carrito");
	const firstSlug = summary?.items?.[0]?.productSlug;
	if (firstSlug) {
		revalidatePath(`/tienda/${firstSlug}`);
	}
}

function toMutationInput(formData) {
	return {
		productId: formData.get("productId"),
		quantity: formData.get("quantity"),
	};
}

function toProductInput(formData) {
	return { productId: formData.get("productId") };
}

function cartActionErrorResponse(error, fallbackMessage, details) {
	if (isCartDomainError(error)) {
		return errorResponse(error.message, 400, details);
	}

	return serverErrorResponse(fallbackMessage, {
		...details,
		message: error?.message,
	});
}

export async function addToCartAction(_prevState, formData) {
	try {
		const { cookieStore, context } = await resolveCartActionContext();
		const summary = await addCartItem(context, toMutationInput(formData));
		persistAnonymousToken(cookieStore, summary);
		revalidateCartPaths(summary);
		return successResponse(summary);
	} catch (error) {
		return cartActionErrorResponse(error, "No se pudo agregar al carrito", {
			action: "addToCartAction",
		});
	}
}

export async function updateCartItemAction(_prevState, formData) {
	try {
		const { context } = await resolveCartActionContext();
		const summary = await updateCartItemQuantity(
			context,
			toMutationInput(formData),
		);
		revalidateCartPaths(summary);
		return successResponse(summary);
	} catch (error) {
		return cartActionErrorResponse(error, "No se pudo actualizar el carrito", {
			action: "updateCartItemAction",
		});
	}
}

export async function removeCartItemAction(_prevState, formData) {
	try {
		const { context } = await resolveCartActionContext();
		const summary = await removeCartItem(context, toProductInput(formData));
		revalidateCartPaths(summary);
		return successResponse(summary);
	} catch (error) {
		return cartActionErrorResponse(error, "No se pudo quitar del carrito", {
			action: "removeCartItemAction",
		});
	}
}

export async function clearCartAction(_prevState, _formData) {
	try {
		const { context } = await resolveCartActionContext();
		const summary = await clearCart(context);
		revalidateCartPaths(summary);
		return successResponse(summary);
	} catch (error) {
		return cartActionErrorResponse(error, "No se pudo limpiar el carrito", {
			action: "clearCartAction",
		});
	}
}
