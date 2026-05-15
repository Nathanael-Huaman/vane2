export const PRODUCT_STATUS_ACTIVE = "active";
export const PRODUCT_STATUS_DRAFT = "draft";
export const PRODUCT_STATUS_ARCHIVED = "archived";
export const PRODUCT_STATUSES = Object.freeze([
	PRODUCT_STATUS_ACTIVE,
	PRODUCT_STATUS_DRAFT,
	PRODUCT_STATUS_ARCHIVED,
]);

export function normalizeSlug(input) {
	return typeof input === "string"
		? input
				.toLowerCase()
				.trim()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "")
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/[\s]+/g, "-")
				.replace(/-+/g, "-")
				.replace(/^-+|-+$/g, "")
		: "";
}

export function isValidSlug(slug) {
	return (
		typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())
	);
}

export function assertValidSlug(slug, label = "slug") {
	if (!isValidSlug(slug))
		throw new Error(
			`${label} must use lowercase letters, numbers, and single hyphens`,
		);
}

export function assertValidPriceMinorUnits(value) {
	if (!Number.isSafeInteger(value) || value < 0)
		throw new Error("priceMinorUnits must be a non-negative safe integer");
}

export function assertValidStockQuantity(value) {
	if (!Number.isSafeInteger(value) || value < 0)
		throw new Error("stockQuantity must be a non-negative safe integer");
}

export function assertValidProductStatus(status) {
	if (!PRODUCT_STATUSES.includes(status))
		throw new Error(`status must be one of: ${PRODUCT_STATUSES.join(", ")}`);
}
