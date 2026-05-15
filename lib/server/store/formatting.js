import { assertValidPriceMinorUnits } from "./validation.js";

export function formatSolesPrice(priceMinorUnits) {
	assertValidPriceMinorUnits(priceMinorUnits);

	const soles = Math.trunc(priceMinorUnits / 100);
	const cents = String(priceMinorUnits % 100).padStart(2, "0");
	return `S/. ${soles}.${cents}`;
}
