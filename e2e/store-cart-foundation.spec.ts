import { test, expect } from "@playwright/test";

async function addInStockProduct(page: import("@playwright/test").Page) {
	await page.goto("/tienda/jarron-ceramico-nube");
	await expect(
		page.getByRole("heading", { name: "Jarrón cerámico Nube" }),
	).toBeVisible();
	await page.getByLabel("Cantidad").fill("1");
	await page.getByRole("button", { name: "Agregar al carrito" }).click();
	await expect(page.getByText("Producto agregado al carrito")).toBeVisible();
	await page.getByRole("link", { name: "Ver carrito" }).click();
}

test.describe("Store cart foundation", () => {
	test("visitor adds an in-stock product and sees item/subtotal in cart", async ({
		page,
	}) => {
		await addInStockProduct(page);

		await expect(page).toHaveURL(/\/carrito$/);
		await expect(
			page.getByRole("heading", { name: "Tu carrito" }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Jarrón cerámico Nube" }),
		).toBeVisible();
		await expect(
			page.getByLabel("Cantidad para Jarrón cerámico Nube"),
		).toHaveValue("1");
		await expect(page.getByText("Subtotal", { exact: true })).toBeVisible();
		await expect(page.getByText("S/. 120.00")).toHaveCount(3);
	});

	test("visitor updates quantity", async ({ page }) => {
		await addInStockProduct(page);

		await page.getByLabel("Cantidad para Jarrón cerámico Nube").fill("2");
		await page
			.getByRole("button", { name: "Actualizar Jarrón cerámico Nube" })
			.click();

		await expect(
			page.getByLabel("Cantidad para Jarrón cerámico Nube"),
		).toHaveValue("2");
		await expect(page.getByText("S/. 240.00")).toHaveCount(2);
	});

	test("visitor removes the item and sees empty state", async ({ page }) => {
		await addInStockProduct(page);

		await page
			.getByRole("button", { name: "Quitar Jarrón cerámico Nube" })
			.click();

		await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
		await expect(page.getByText("Jarrón cerámico Nube")).toHaveCount(0);
	});

	test("visitor clears the cart and sees empty state", async ({ page }) => {
		await addInStockProduct(page);

		await page.getByRole("button", { name: "Vaciar carrito" }).click();

		await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
	});

	test("out-of-stock product is visible but not addable", async ({ page }) => {
		await page.goto("/tienda/manta-andina-sin-stock");

		await expect(
			page.getByRole("heading", { name: "Manta andina sin stock" }),
		).toBeVisible();
		await expect(page.getByText("Producto sin stock para carrito")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Agregar al carrito" }),
		).toHaveCount(0);
	});

	test("add form displays a safe server-action error", async ({ page }) => {
		await page.goto("/tienda/jarron-ceramico-nube");
		await page.getByLabel("Cantidad").evaluate((element) => {
			element.removeAttribute("max");
			(element as HTMLInputElement).value = "99";
		});
		await page.getByRole("button", { name: "Agregar al carrito" }).click();

		await expect(
			page.getByText("La cantidad supera el stock disponible"),
		).toBeVisible();
	});
});
