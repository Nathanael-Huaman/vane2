import prisma from "../../prisma.js";
import { formatSolesPrice } from "./formatting.js";
import { PRODUCT_STATUS_ACTIVE, isValidSlug } from "./validation.js";

const IMAGE_FALLBACK_LABEL = "Imagen no disponible";

function toPublicProduct(product) {
	if (!product) return null;

	const hasImage = Boolean(product.imageUrl && product.imageUrl.trim());

	return {
		...product,
		priceLabel: formatSolesPrice(product.priceMinorUnits),
		isOutOfStock: product.stockQuantity <= 0,
		availabilityLabel: product.stockQuantity > 0 ? "Disponible" : "Sin stock",
		hasImage,
		imageFallbackLabel: hasImage ? null : IMAGE_FALLBACK_LABEL,
	};
}

export async function getPublicCatalogProducts() {
	const products = await prisma.product.findMany({
		where: { status: PRODUCT_STATUS_ACTIVE },
		include: { category: true },
		orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
	});

	return products.map(toPublicProduct);
}

export async function getPublicProductBySlug(slug) {
	const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
	if (!isValidSlug(normalizedSlug)) return null;

	const product = await prisma.product.findFirst({
		where: {
			slug: normalizedSlug,
			status: PRODUCT_STATUS_ACTIVE,
		},
		include: { category: true },
	});

	return toPublicProduct(product);
}
