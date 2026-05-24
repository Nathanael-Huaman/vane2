"use server";

import { errorResponse, serverErrorResponse } from "../server/response.js";
import { logWarn } from "../server/logger.js";
import {
	buildRateLimitLogContext,
	buildThrottleResponse,
	checkRateLimit,
} from "../server/security/rate-limit.js";
import { isOrderDomainError } from "../server/store/orders.js";
import { getCheckoutActionDependencies } from "./store-checkout-dependencies.js";

const STORE_CART_COOKIE_NAME = "store_cart_token";
const CHECKOUT_LIMIT = Object.freeze({
	maxAttempts: 5,
	windowMinutes: 15,
});

async function resolveCartActionContext(cookieStore) {
	const dependencies = getCheckoutActionDependencies();
	const session = await dependencies.getOptionalAuthenticatedSession();
	const userId = session?.id ?? null;

	return {
		userId,
		anonymousToken: userId ? null : (cookieStore.get(STORE_CART_COOKIE_NAME)?.value ?? null),
	};
}

function getHeaderValue(headersList, name) {
	return headersList?.get?.(name) ?? null;
}

function getClientIp(headersList) {
	const forwardedFor = getHeaderValue(headersList, "x-forwarded-for");
	return forwardedFor?.split(",")[0]?.trim() || getHeaderValue(headersList, "x-real-ip") || "unknown";
}

function getCheckoutActorParts({ cookieStore, headersList, formData }) {
	return {
		cart: cookieStore.get(STORE_CART_COOKIE_NAME)?.value ?? "unknown",
		email: String(formData.get("customerEmail") ?? "").trim().toLowerCase(),
		ip: getClientIp(headersList),
		userAgent: getHeaderValue(headersList, "user-agent") || "unknown",
	};
}

async function assessCheckoutRateLimit({ dependencies, cookieStore, formData }) {
	const headersList = await dependencies.headers();
	return checkRateLimit({
		surface: "checkout",
		actorParts: getCheckoutActorParts({ cookieStore, headersList, formData }),
		limit: CHECKOUT_LIMIT,
	});
}

function buildCheckoutRateLimitLogContext(result) {
	const context = buildRateLimitLogContext(result);
	return {
		surface: context.surface,
		decision: context.decision,
		retryAfterSeconds: context.retryAfterSeconds,
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
		const cookieStore = await dependencies.cookies();
		const rateLimit = await assessCheckoutRateLimit({ dependencies, cookieStore, formData });
		if (!rateLimit.allowed) {
			logWarn("checkoutAction: solicitud limitada", {
				...buildCheckoutRateLimitLogContext(rateLimit),
			});
			return buildThrottleResponse(rateLimit);
		}

		const context = await resolveCartActionContext(cookieStore);
		const result = await dependencies.createOrderFromCart(context, checkoutInputFromFormData(formData));
		dependencies.revalidatePath("/carrito");
		dependencies.revalidatePath("/checkout");
		redirectTo = result.confirmationPath;
	} catch (error) {
		return checkoutActionErrorResponse(error);
	}

	getCheckoutActionDependencies().redirect(redirectTo);
}
