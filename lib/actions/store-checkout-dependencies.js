import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCheckoutCaptcha } from "../server/security/checkout-captcha.js";
import { createOrderFromCart } from "../server/store/orders.js";

const getOptionalAuthenticatedSession = async () =>
	(await import("../server/auth/auth-session.js")).getOptionalAuthenticatedSession();

const defaultDependencies = { cookies, headers, getOptionalAuthenticatedSession, createOrderFromCart, verifyCheckoutCaptcha, revalidatePath, redirect };

let dependencies = defaultDependencies;

export function getCheckoutActionDependencies() {
	return dependencies;
}

export function __setCheckoutActionTestDependencies(overrides = {}) {
	dependencies = { ...defaultDependencies, ...overrides };
}

export function __resetCheckoutActionTestDependencies() {
	dependencies = defaultDependencies;
}
