import "dotenv/config";
import assert from "node:assert/strict";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";
import { formatSolesPrice } from "../lib/server/store/formatting.js";
import {
	getPublicCatalogProducts,
	getPublicProductBySlug,
} from "../lib/server/store/catalog.js";

async function main() {
	assert.equal(formatSolesPrice(12000), "S/. 120.00");
	assert.equal(formatSolesPrice(0), "S/. 0.00");
	assert.throws(() => formatSolesPrice(12.5), /safe integer/i);

	const prisma = createRuntimePrismaClient();
	try {
		const seededProducts = await prisma.product.findMany({
			select: { slug: true, status: true, priceMinorUnits: true },
		});
		assert.ok(seededProducts.length >= 5, "expected seeded store products");
		assert.ok(
			seededProducts.every((product) =>
				Number.isSafeInteger(product.priceMinorUnits),
			),
			"all persisted prices must use integer minor units",
		);

		const publicProducts = await getPublicCatalogProducts();
		assert.ok(publicProducts.length >= 3, "expected active public products");
		assert.ok(
			publicProducts.every((product) => product.status === "active"),
			"public catalog must only return active products",
		);
		assert.ok(
			publicProducts.some(
				(product) =>
					product.priceMinorUnits === 12000 &&
					product.priceLabel === "S/. 120.00",
			),
			"expected active seeded product with deterministic soles price label",
		);

		for (const slug of [
			"producto-borrador-tienda",
			"producto-archivado-tienda",
			"",
			"missing-product",
		]) {
			assert.equal(
				await getPublicProductBySlug(slug),
				null,
				`${slug || "empty slug"} must not be public`,
			);
		}

		const outOfStock = publicProducts.find(
			(product) => product.slug === "manta-andina-sin-stock",
		);
		assert.ok(outOfStock, "out-of-stock active product should remain public");
		assert.equal(outOfStock?.isOutOfStock, true);
		assert.equal(outOfStock?.availabilityLabel, "Sin stock");

		const missingImage = publicProducts.find(
			(product) => product.slug === "cojin-minimalista",
		);
		assert.ok(
			missingImage,
			"missing-image active product should remain public",
		);
		assert.equal(missingImage?.hasImage, false);
		assert.equal(missingImage?.imageFallbackLabel, "Imagen no disponible");
	} finally {
		await prisma.$disconnect();
	}
	console.log("Store catalog foundation runtime tests passed.");
}

main().catch((error) => {
	console.error("Store catalog foundation runtime tests failed:", error);
	process.exit(1);
});
