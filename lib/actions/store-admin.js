"use server";

import {
	errorResponse,
	requireAdminAccess,
	successResponse,
} from "@/lib/server/shared";
import { resolvePageAuthContext } from "@/lib/server/session";
import {
	createAdminProduct,
	getAdminProductById,
	updateAdminProduct,
} from "@/lib/server/store/admin-products.js";
import {
	enforceStoreAdminAccess,
	isStoreAdminViewAllowed,
	mapAdminProductMutationError,
} from "@/lib/server/store/admin-action-helpers.js";
import {
	parseCreateProductInput,
	parseUpdateProductInput,
} from "@/lib/server/store/admin-validation.js";
import { revalidatePath } from "next/cache";

export { isStoreAdminViewAllowed };

export async function requireStoreAdminAccess() {
	const auth = await requireAdminAccess();
	const authContext = auth.ok ? await resolvePageAuthContext() : null;
	return enforceStoreAdminAccess(auth, authContext);
}

function revalidateProductPaths(slug) {
	revalidatePath("/admin/tienda");
	revalidatePath("/tienda");
	if (slug) {
		revalidatePath(`/tienda/${slug}`);
	}
}

export async function createProductAction(_prevState, formData) {
	const auth = await requireStoreAdminAccess();
	if (!auth.ok) return auth;

	const parsed = parseCreateProductInput(formData);
	if (!parsed.ok) {
		return errorResponse(parsed.error.message, parsed.error.status);
	}

	try {
		const product = await createAdminProduct(parsed.data);
		revalidateProductPaths(product.slug);
		return successResponse(product);
	} catch (error) {
		return mapAdminProductMutationError(error, "No se pudo crear el producto", {
			action: "createProductAction",
		});
	}
}

export async function updateProductAction(_prevState, formData) {
	const auth = await requireStoreAdminAccess();
	if (!auth.ok) return auth;

	const id = String(formData.get("id") ?? "").trim();
	if (!id) return errorResponse("Se requiere el ID del producto", 400);

	const parsed = parseUpdateProductInput(formData);
	if (!parsed.ok) {
		return errorResponse(parsed.error.message, parsed.error.status);
	}

	try {
		const existing = await getAdminProductById(id);
		if (!existing) return errorResponse("Producto no encontrado", 404);

		const product = await updateAdminProduct(id, parsed.data);
		revalidateProductPaths(existing.slug ?? product.slug);
		return successResponse(product);
	} catch (error) {
		return mapAdminProductMutationError(
			error,
			"No se pudo actualizar el producto",
			{
				action: "updateProductAction",
				id,
			},
		);
	}
}
