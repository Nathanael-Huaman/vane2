import {
	PRODUCT_STATUSES,
	assertValidStockQuantity,
	isValidSlug,
	normalizeSlug,
} from "./validation.js";

function toOptionalText(value) {
	const text = String(value ?? "").trim();
	return text.length > 0 ? text : null;
}

function parseRequiredText(value, label) {
	const text = String(value ?? "").trim();
	if (!text) throw new Error(`El campo ${label} es requerido`);
	return text;
}

function parseNonNegativeInteger(value, label) {
	const text = String(value ?? "").trim();
	if (!/^\d+$/.test(text)) {
		throw new Error(`El campo ${label} debe ser un entero no negativo`);
	}
	const parsed = Number.parseInt(text, 10);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new Error(`El campo ${label} debe ser un entero no negativo`);
	}
	return parsed;
}

export function parsePriceToMinorUnits(value) {
	const text = String(value ?? "")
		.trim()
		.replace(",", ".");
	if (!text) throw new Error("El campo price es requerido");
	if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
		throw new Error("El precio debe tener hasta 2 decimales");
	}

	const [whole, decimals = ""] = text.split(".");
	const cents = decimals.padEnd(2, "0");
	const minorUnits = Number.parseInt(`${whole}${cents}`, 10);

	if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
		throw new Error("El precio debe ser no negativo");
	}

	return minorUnits;
}

function parseStatus(value) {
	const status = String(value ?? "").trim();
	if (!PRODUCT_STATUSES.includes(status)) {
		throw new Error(
			`El estado debe ser uno de: ${PRODUCT_STATUSES.join(", ")}`,
		);
	}
	return status;
}

function parseFeatured(value) {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "on";
}

export function parseCreateProductInput(formData) {
	try {
		const name = parseRequiredText(formData.get("name"), "name");
		const summary = parseRequiredText(formData.get("summary"), "summary");
		const categoryId = parseRequiredText(
			formData.get("categoryId"),
			"categoryId",
		);
		const status = parseStatus(formData.get("status"));

		const rawSlug = parseRequiredText(formData.get("slug"), "slug");
		const slug = normalizeSlug(rawSlug);
		if (!isValidSlug(slug)) {
			throw new Error("El slug es invalido");
		}

		const stockQuantity = parseNonNegativeInteger(
			formData.get("stockQuantity"),
			"stockQuantity",
		);
		assertValidStockQuantity(stockQuantity);

		return {
			ok: true,
			data: {
				name,
				slug,
				summary,
				description: toOptionalText(formData.get("description")),
				imageUrl: toOptionalText(formData.get("imageUrl")),
				priceMinorUnits: parsePriceToMinorUnits(formData.get("price")),
				stockQuantity,
				status,
				categoryId,
				sku: toOptionalText(formData.get("sku")),
				featured: parseFeatured(formData.get("featured")),
			},
		};
	} catch (error) {
		return {
			ok: false,
			error: { message: error.message, status: 400 },
		};
	}
}

export function parseUpdateProductInput(formData) {
	try {
		if (formData.get("slug") != null && String(formData.get("slug")).trim()) {
			throw new Error("El slug no se puede modificar");
		}

		const summary = parseRequiredText(formData.get("summary"), "summary");
		const categoryId = parseRequiredText(
			formData.get("categoryId"),
			"categoryId",
		);
		const status = parseStatus(formData.get("status"));
		const stockQuantity = parseNonNegativeInteger(
			formData.get("stockQuantity"),
			"stockQuantity",
		);
		assertValidStockQuantity(stockQuantity);

		return {
			ok: true,
			data: {
				name: parseRequiredText(formData.get("name"), "name"),
				summary,
				description: toOptionalText(formData.get("description")),
				imageUrl: toOptionalText(formData.get("imageUrl")),
				priceMinorUnits: parsePriceToMinorUnits(formData.get("price")),
				stockQuantity,
				status,
				categoryId,
				sku: toOptionalText(formData.get("sku")),
				featured: parseFeatured(formData.get("featured")),
			},
		};
	} catch (error) {
		return {
			ok: false,
			error: { message: error.message, status: 400 },
		};
	}
}
