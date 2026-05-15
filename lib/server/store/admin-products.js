import prisma from "../../prisma.js";
import { formatSolesPrice } from "./formatting.js";
import {
	assertValidPriceMinorUnits,
	assertValidProductStatus,
	assertValidStockQuantity,
} from "./validation.js";

function toAdminProduct(product) {
	return {
		...product,
		priceLabel: formatSolesPrice(product.priceMinorUnits),
		isOutOfStock: product.stockQuantity <= 0,
	};
}

async function ensureCategoryExists(categoryId) {
	const category = await prisma.category.findUnique({
		where: { id: categoryId },
	});
	if (!category) throw new Error("La categoria seleccionada no existe");
}

async function ensureUniqueSlug(slug, ignoreProductId = null) {
	const existing = await prisma.product.findUnique({ where: { slug } });
	if (existing && existing.id !== ignoreProductId) {
		throw new Error("El slug ya esta en uso");
	}
}

async function ensureUniqueSku(sku, ignoreProductId = null) {
	if (!sku) return;
	const existing = await prisma.product.findUnique({ where: { sku } });
	if (existing && existing.id !== ignoreProductId) {
		throw new Error("El SKU ya esta en uso");
	}
}

export async function getAdminProducts() {
	const products = await prisma.product.findMany({
		include: { category: true },
		orderBy: [{ updatedAt: "desc" }],
	});

	return products.map(toAdminProduct);
}

export async function getAdminProductById(id) {
	if (!id || typeof id !== "string" || !id.trim()) return null;

	const product = await prisma.product.findUnique({
		where: { id: id.trim() },
		include: { category: true },
	});

	return product ? toAdminProduct(product) : null;
}

export async function getAdminProductFormOptions() {
	const categories = await prisma.category.findMany({
		orderBy: [{ name: "asc" }],
		select: { id: true, name: true, slug: true },
	});

	return { categories };
}

export async function createAdminProduct(input) {
	assertValidPriceMinorUnits(input.priceMinorUnits);
	assertValidStockQuantity(input.stockQuantity);
	assertValidProductStatus(input.status);

	await ensureCategoryExists(input.categoryId);
	await ensureUniqueSlug(input.slug);
	await ensureUniqueSku(input.sku ?? null);

	const product = await prisma.product.create({
		data: {
			name: input.name,
			slug: input.slug,
			summary: input.summary,
			description: input.description ?? null,
			imageUrl: input.imageUrl ?? null,
			priceMinorUnits: input.priceMinorUnits,
			stockQuantity: input.stockQuantity,
			status: input.status,
			categoryId: input.categoryId,
			sku: input.sku ?? null,
			featured: Boolean(input.featured),
		},
		include: { category: true },
	});

	return toAdminProduct(product);
}

export async function updateAdminProduct(id, input) {
	if (!id || typeof id !== "string" || !id.trim()) {
		throw new Error("Se requiere el id del producto");
	}

	assertValidPriceMinorUnits(input.priceMinorUnits);
	assertValidStockQuantity(input.stockQuantity);
	assertValidProductStatus(input.status);

	const existing = await prisma.product.findUnique({
		where: { id: id.trim() },
	});
	if (!existing) throw new Error("Producto no encontrado");

	if (input.slug != null && input.slug !== existing.slug) {
		throw new Error("El slug no se puede modificar");
	}

	await ensureCategoryExists(input.categoryId);
	await ensureUniqueSku(input.sku ?? null, existing.id);

	const product = await prisma.product.update({
		where: { id: existing.id },
		data: {
			name: input.name,
			summary: input.summary,
			description: input.description ?? null,
			imageUrl: input.imageUrl ?? null,
			priceMinorUnits: input.priceMinorUnits,
			stockQuantity: input.stockQuantity,
			status: input.status,
			categoryId: input.categoryId,
			sku: input.sku ?? null,
			featured: Boolean(input.featured),
		},
		include: { category: true },
	});

	return toAdminProduct(product);
}
