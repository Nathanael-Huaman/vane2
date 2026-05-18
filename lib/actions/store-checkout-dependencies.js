import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createOrderFromCart } from "../server/store/orders.js";

const getOptionalAuthenticatedSession = async () =>
	(await import("../server/auth/auth-session.js")).getOptionalAuthenticatedSession();

const defaultDependencies = { cookies, getOptionalAuthenticatedSession, createOrderFromCart, revalidatePath, redirect };

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
