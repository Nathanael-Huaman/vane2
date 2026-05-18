"use server";

import { errorResponse, serverErrorResponse } from "../server/response.js";
import { isOrderDomainError } from "../server/store/orders.js";
import { getCheckoutActionDependencies } from "./store-checkout-dependencies.js";

const STORE_CART_COOKIE_NAME = "store_cart_token";

async function resolveCartActionContext() {
	const dependencies = getCheckoutActionDependencies();
	const cookieStore = await dependencies.cookies();
	const session = await dependencies.getOptionalAuthenticatedSession();
	const userId = session?.id ?? null;

	return {
		userId,
		anonymousToken: userId ? null : (cookieStore.get(STORE_CART_COOKIE_NAME)?.value ?? null),
	};
}

function checkoutActionErrorResponse(error) {
	if (isOrderDomainError(error)) {
		return errorResponse(error.message, 400, { action: "checkoutAction" });
	}

	return serverErrorResponse("No se pudo crear el pedido", { action: "checkoutAction", message: error?.message });
}

function checkoutInputFromFormData(formData) {
	return { customerName: formData.get("customerName"), customerEmail: formData.get("customerEmail") };
}

export async function checkoutAction(prevStateOrFormData, maybeFormData) {
	let redirectTo = null;
	const formData = maybeFormData ?? prevStateOrFormData;

	try {
		const dependencies = getCheckoutActionDependencies();
		const context = await resolveCartActionContext();
		const result = await dependencies.createOrderFromCart(context, checkoutInputFromFormData(formData));
		dependencies.revalidatePath("/carrito");
		dependencies.revalidatePath("/checkout");
		redirectTo = result.confirmationPath;
	} catch (error) {
		return checkoutActionErrorResponse(error);
	}

	getCheckoutActionDependencies().redirect(redirectTo);
}
