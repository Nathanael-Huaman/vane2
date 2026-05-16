import { PRODUCT_STATUS_ACTIVE } from "./validation.js";

export class CartDomainError extends Error {
	constructor(message) {
		super(message);
		this.name = "CartDomainError";
	}
}

export function isCartDomainError(error) {
	return error instanceof CartDomainError;
}

function cartError(message) {
	return new CartDomainError(message);
}

function requiredText(value, label) {
	const text = String(value ?? "").trim();
	if (!text) throw cartError(`El campo ${label} es requerido`);
	return text;
}

export function parseCartProductId(value) {
	return requiredText(value, "producto");
}

export function parseCartLineProductId(value) {
	return requiredText(value, "producto");
}

export function parseCartQuantity(value, { defaultQuantity = 1 } = {}) {
	const rawValue = value == null || value === "" ? defaultQuantity : value;
	const text = String(rawValue).trim();

	if (!/^\d+$/.test(text)) {
		throw cartError("La cantidad debe ser un entero positivo");
	}

	const quantity = Number.parseInt(text, 10);
	if (!Number.isSafeInteger(quantity) || quantity <= 0) {
		throw cartError("La cantidad debe ser un entero positivo");
	}

	return quantity;
}

export function assertPurchasableProduct(product) {
	if (!product) {
		throw cartError("Producto no encontrado");
	}

	if (product.status !== PRODUCT_STATUS_ACTIVE) {
		throw cartError("El producto no esta disponible para carrito");
	}

	if (product.stockQuantity <= 0) {
		throw cartError("El producto esta sin stock");
	}
}

export function assertQuantityWithinStock(quantity, product) {
	if (!Number.isSafeInteger(quantity) || quantity <= 0) {
		throw cartError("La cantidad debe ser un entero positivo");
	}

	if (!product || quantity > product.stockQuantity) {
		throw cartError("La cantidad supera el stock disponible");
	}
}

export function getProductUnavailableReason(product) {
	if (!product) return "Producto no encontrado";
	if (product.status !== PRODUCT_STATUS_ACTIVE) {
		return "El producto no esta disponible para carrito";
	}
	if (product.stockQuantity <= 0) return "El producto esta sin stock";
	return null;
}
