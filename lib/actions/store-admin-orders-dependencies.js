import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateAdminOrderStatus } from "../server/store/admin-orders.js";

const defaultDependencies = {
	revalidatePath,
	redirect,
	updateAdminOrderStatus,
	requireAdminAccess: async () => (await import("../server/authorization.js")).requireAdminAccess(),
	resolvePageAuthContext: async () => (await import("../server/session/resolve-page-auth-context.js")).resolvePageAuthContext(),
};

let dependencies = defaultDependencies;

export function getAdminOrdersActionDependencies() {
	return dependencies;
}

export function __setAdminOrdersActionTestDependencies(overrides = {}) {
	dependencies = { ...defaultDependencies, ...overrides };
}

export function __resetAdminOrdersActionTestDependencies() {
	dependencies = defaultDependencies;
}
