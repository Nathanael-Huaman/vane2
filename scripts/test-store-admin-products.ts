import "dotenv/config";
import assert from "node:assert/strict";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

import {
	parseCreateProductInput,
	parseUpdateProductInput,
} from "../lib/server/store/admin-validation.js";
import {
	createAdminProduct,
	getAdminProducts,
	updateAdminProduct,
} from "../lib/server/store/admin-products.js";
import {
	enforceStoreAdminAccess,
	mapAdminProductMutationError,
} from "../lib/server/store/admin-action-helpers.js";
import { getPublicProductBySlug } from "../lib/server/store/catalog.js";

function buildFormData(entries: Record<string, string>) {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		formData.set(key, value);
	}
	return formData;
}

async function main() {
	const prisma = createRuntimePrismaClient();

	try {
		const category = await prisma.category.findFirst({
			orderBy: { name: "asc" },
		});
		assert.ok(category, "expected seeded category");

		const parseCreate = parseCreateProductInput(
			buildFormData({
				name: "Producto Admin Test",
				slug: "producto-admin-test",
				summary: "Resumen",
				price: "120.50",
				stockQuantity: "2",
				status: "draft",
				categoryId: category!.id,
			}),
		);
		assert.equal(
			parseCreate.ok,
			true,
			"create parser should accept valid payload",
		);
		assert.equal(parseCreate.data?.priceMinorUnits, 12050);

		const parseUpdateWithSlug = parseUpdateProductInput(
			buildFormData({
				name: "Producto Admin Test",
				summary: "Resumen",
				slug: "intento-cambio",
				price: "100.00",
				stockQuantity: "1",
				status: "active",
				categoryId: category!.id,
			}),
		);
		assert.equal(parseUpdateWithSlug.ok, false);
		assert.match(parseUpdateWithSlug.error?.message ?? "", /slug/i);

		const parseInvalidStatus = parseCreateProductInput(
			buildFormData({
				name: "Producto Admin Test",
				slug: "producto-admin-test-invalid",
				summary: "Resumen",
				price: "100.00",
				stockQuantity: "1",
				status: "otro",
				categoryId: category!.id,
			}),
		);
		assert.equal(parseInvalidStatus.ok, false);

		const parseNegativeStock = parseCreateProductInput(
			buildFormData({
				name: "Producto Admin Test",
				slug: "producto-admin-test-stock",
				summary: "Resumen",
				price: "100.00",
				stockQuantity: "-1",
				status: "draft",
				categoryId: category!.id,
			}),
		);
		assert.equal(parseNegativeStock.ok, false);

		const unauthorized = enforceStoreAdminAccess(
			{ ok: false, error: { message: "No autorizado", status: 401 } },
			null,
		);
		assert.equal(unauthorized.ok, false);
		assert.equal(unauthorized.error?.status, 401);

		const nonAdminDenied = enforceStoreAdminAccess(
			{ ok: true, data: { id: "usr_cliente", role: "cliente" } },
			{ isAdmin: false, isAdminView: false },
		);
		assert.equal(nonAdminDenied.ok, false);
		assert.equal(nonAdminDenied.error?.status, 403);

		const adminClientViewDenied = enforceStoreAdminAccess(
			{ ok: true, data: { id: "usr_admin", role: "administrador" } },
			{ isAdmin: true, isAdminView: false },
		);
		assert.equal(adminClientViewDenied.ok, false);
		assert.equal(adminClientViewDenied.error?.status, 403);

		const adminAllowed = enforceStoreAdminAccess(
			{ ok: true, data: { id: "usr_admin", role: "administrador" } },
			{ isAdmin: true, isAdminView: true },
		);
		assert.equal(adminAllowed.ok, true);

		const list = await getAdminProducts();
		assert.ok(Array.isArray(list));
		assert.ok(list.length >= 5, "expected seeded products in admin list");

		await assert.rejects(
			createAdminProduct({
				name: "Producto sin categoria",
				slug: "sin-categoria-admin-test",
				summary: "x",
				priceMinorUnits: 100,
				stockQuantity: 1,
				status: "draft",
				categoryId: "missing-category",
			}),
			/categoria/i,
		);

		const mappedMissingCategory = mapAdminProductMutationError(
			new Error("La categoria seleccionada no existe"),
			"No se pudo crear el producto",
			{ action: "createProductAction" },
		);
		assert.equal(mappedMissingCategory.ok, false);
		assert.equal(mappedMissingCategory.error?.status, 400);

		const mappedMissingProduct = mapAdminProductMutationError(
			new Error("Producto no encontrado"),
			"No se pudo actualizar el producto",
			{ action: "updateProductAction" },
		);
		assert.equal(mappedMissingProduct.ok, false);
		assert.equal(mappedMissingProduct.error?.status, 404);

		const created = await createAdminProduct({
			name: "Producto Admin Runtime",
			slug: "producto-admin-runtime",
			summary: "Runtime summary",
			description: null,
			imageUrl: null,
			priceMinorUnits: 9900,
			stockQuantity: 0,
			status: "archived",
			categoryId: category!.id,
			sku: "SKU-ADMIN-RUNTIME",
			featured: false,
		});

		assert.equal(created.slug, "producto-admin-runtime");
		assert.equal(created.stockQuantity, 0);

		const updatedToActive = await updateAdminProduct(created.id, {
			name: "Producto Admin Runtime",
			summary: "Runtime summary updated",
			description: "desc",
			imageUrl: null,
			priceMinorUnits: 10000,
			stockQuantity: 0,
			status: "active",
			categoryId: category!.id,
			sku: "SKU-ADMIN-RUNTIME",
			featured: true,
		});

		assert.equal(updatedToActive.status, "active");
		assert.equal(updatedToActive.stockQuantity, 0);

		const updatedToDraft = await updateAdminProduct(created.id, {
			name: "Producto Admin Runtime",
			summary: "Runtime summary draft",
			description: null,
			imageUrl: null,
			priceMinorUnits: 10000,
			stockQuantity: 0,
			status: "draft",
			categoryId: category!.id,
			sku: "SKU-ADMIN-RUNTIME",
			featured: false,
		});

		assert.equal(updatedToDraft.status, "draft");

		const publicWhenDraft = await getPublicProductBySlug(created.slug);
		assert.equal(
			publicWhenDraft,
			null,
			"draft product must stay hidden publicly",
		);

		await prisma.product.deleteMany({
			where: { slug: "producto-admin-runtime" },
		});
	} finally {
		await prisma.$disconnect();
	}

	console.log("Store admin products runtime tests passed.");
}

main().catch((error) => {
	console.error("Store admin products runtime tests failed:", error);
	process.exit(1);
});
