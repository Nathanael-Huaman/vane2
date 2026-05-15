import "dotenv/config";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";
import {
	PRODUCT_STATUS_ACTIVE,
	PRODUCT_STATUS_ARCHIVED,
	PRODUCT_STATUS_DRAFT,
	assertValidPriceMinorUnits,
	assertValidProductStatus,
	assertValidSlug,
	assertValidStockQuantity,
} from "../lib/server/store/validation.js";

const categories = [
	[
		"decoracion",
		"Decoración",
		"Piezas decorativas para espacios con identidad.",
	],
	[
		"textiles",
		"Textiles",
		"Textiles seleccionados para hogares cálidos y funcionales.",
	],
] as const;

const products = [
	{
		slug: "jarron-ceramico-nube",
		name: "Jarrón cerámico Nube",
		summary: "Jarrón artesanal de acabado mate para flores secas o frescas.",
		description: null,
		imageUrl: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c",
		priceMinorUnits: 12000,
		stockQuantity: 8,
		status: PRODUCT_STATUS_ACTIVE,
		sku: "STORE-DEC-001",
		featured: true,
		categorySlug: "decoracion",
	},
	{
		slug: "manta-andina-sin-stock",
		name: "Manta andina sin stock",
		summary: "Manta de inspiración andina actualmente no disponible.",
		description: null,
		imageUrl: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92",
		priceMinorUnits: 18900,
		stockQuantity: 0,
		status: PRODUCT_STATUS_ACTIVE,
		sku: "STORE-TEX-001",
		featured: false,
		categorySlug: "textiles",
	},
	{
		slug: "cojin-minimalista",
		name: "Cojín minimalista",
		summary: "Cojín decorativo sin imagen para validar el fallback visual.",
		description: null,
		imageUrl: null,
		priceMinorUnits: 6900,
		stockQuantity: 12,
		status: PRODUCT_STATUS_ACTIVE,
		sku: "STORE-TEX-002",
		featured: false,
		categorySlug: "textiles",
	},
	{
		slug: "producto-borrador-tienda",
		name: "Producto borrador tienda",
		summary: "Producto no público usado para validar filtros de borrador.",
		description: null,
		imageUrl: null,
		priceMinorUnits: 5000,
		stockQuantity: 3,
		status: PRODUCT_STATUS_DRAFT,
		sku: "STORE-DRAFT-001",
		featured: false,
		categorySlug: "decoracion",
	},
	{
		slug: "producto-archivado-tienda",
		name: "Producto archivado tienda",
		summary:
			"Producto archivado usado para validar que no se expone públicamente.",
		description: null,
		imageUrl: null,
		priceMinorUnits: 4000,
		stockQuantity: 1,
		status: PRODUCT_STATUS_ARCHIVED,
		sku: "STORE-ARCH-001",
		featured: false,
		categorySlug: "decoracion",
	},
] as const;

function validateSeedData() {
	categories.forEach(([slug]) =>
		assertValidSlug(slug, `category slug ${slug}`),
	);
	products.forEach((product) => {
		assertValidSlug(product.slug, `product slug ${product.slug}`);
		assertValidPriceMinorUnits(product.priceMinorUnits);
		assertValidStockQuantity(product.stockQuantity);
		assertValidProductStatus(product.status);
	});
}

async function main() {
	validateSeedData();
	const prisma = createRuntimePrismaClient();
	try {
		const categoryBySlug = new Map<string, { id: string }>();
		for (const [slug, name, description] of categories) {
			const record = await prisma.category.upsert({
				where: { slug },
				update: { name, description },
				create: { slug, name, description },
				select: { id: true, slug: true },
			});
			categoryBySlug.set(record.slug, record);
		}
		for (const { categorySlug, ...product } of products) {
			const category = categoryBySlug.get(categorySlug);
			if (!category) throw new Error(`Missing category for ${product.slug}`);
			const data = {
				...product,
				description: product.description ?? null,
				categoryId: category.id,
			};
			await prisma.product.upsert({
				where: { slug: product.slug },
				update: data,
				create: data,
			});
		}
		console.log("Store seed data ready:");
		console.log(
			JSON.stringify(
				{ categories: categories.length, products: products.length },
				null,
				2,
			),
		);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error: Error) => {
	console.error("Store seed failed:", error.message);
	process.exit(1);
});
