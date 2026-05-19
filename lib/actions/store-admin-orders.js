"use server";

import { errorResponse, serverErrorResponse } from "../server/response.js";
import { enforceStoreAdminAccess } from "../server/store/admin-action-helpers.js";
import { parseAdminOrderStatus } from "../server/store/admin-orders.js";
import { getAdminOrdersActionDependencies } from "./store-admin-orders-dependencies.js";

const ADMIN_ORDERS_PATH = "/admin/tienda/pedidos";

function sanitizeOrderReturnTo(value, id) {
	const returnTo = String(value ?? "").trim();
	const detailPath = `${ADMIN_ORDERS_PATH}/${id}`;
	if (returnTo === detailPath) return returnTo;
	if (returnTo === ADMIN_ORDERS_PATH) return returnTo;
	if (returnTo.startsWith(`${ADMIN_ORDERS_PATH}?`)) return returnTo;
	return detailPath;
}

function mapOrderStatusMutationError(error) {
	const message = error instanceof Error ? error.message : String(error ?? "");
	if (message === "Pedido no encontrado") return errorResponse(message, 404, { action: "updateOrderStatusAction" });
	if (message.includes("Se requiere") || message.includes("no valido")) return errorResponse(message, 400, { action: "updateOrderStatusAction" });
	return serverErrorResponse("No se pudo actualizar el estado del pedido", { action: "updateOrderStatusAction", message });
}

async function requireStoreOrderAdminAccess() {
	const dependencies = getAdminOrdersActionDependencies();
	const auth = await dependencies.requireAdminAccess();
	const authContext = auth.ok ? await dependencies.resolvePageAuthContext() : null;
	return enforceStoreAdminAccess(auth, authContext);
}

export async function updateOrderStatusAction(prevStateOrFormData, maybeFormData) {
	const auth = await requireStoreOrderAdminAccess();
	if (!auth.ok) return auth;
	const formData = maybeFormData ?? prevStateOrFormData;

	const id = String(formData.get("id") ?? "").trim();
	const status = parseAdminOrderStatus(formData.get("status"));
	if (!id) return errorResponse("Se requiere el ID del pedido", 400);
	if (!status) return errorResponse("Estado de pedido no valido", 400);

	const redirectTo = sanitizeOrderReturnTo(formData.get("returnTo"), id);
	try {
		const dependencies = getAdminOrdersActionDependencies();
		await dependencies.updateAdminOrderStatus(id, status);
		dependencies.revalidatePath("/admin/tienda/pedidos");
		dependencies.revalidatePath(`/admin/tienda/pedidos/${id}`);
	} catch (error) {
		return mapOrderStatusMutationError(error);
	}

	getAdminOrdersActionDependencies().redirect(redirectTo);
}
