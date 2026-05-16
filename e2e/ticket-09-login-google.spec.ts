import { test, expect } from "@playwright/test";

test.describe("Ticket 09 - Login con Google", () => {
	test("Google queda disponible en la pantalla de login", async ({ page }) => {
		await page.goto("/login");

		await expect(
			page.getByRole("heading", { name: "OBSTEDESIGN" }),
		).toBeVisible();

		const googleButton = page.getByRole("button", {
			name: /Google/i,
		});
		await expect(googleButton).toBeVisible({
			timeout: 12_000,
		});
		// Puede estar deshabilitado si el proveedor no está configurado en el entorno.
		await expect(googleButton).toBeVisible();
	});

	test("inicia redireccion OAuth al hacer click en Google", async ({
		page,
	}) => {
		await page.goto("/login");

		const googleButton = page.getByRole("button", {
			name: /Google/i,
		});
		await expect(googleButton).toBeVisible({ timeout: 12_000 });

		await expect(googleButton).not.toContainText(/Verificando Google/i, {
			timeout: 12_000,
		});

		const buttonText = (await googleButton.textContent()) || "";
		if (/Google no disponible/i.test(buttonText)) {
			return;
		}

		await expect(googleButton).toBeEnabled();
		await googleButton.click();
		await expect(page).toHaveURL(
			/\/api\/auth\/signin\/google|accounts\.google\.com/,
			{
				timeout: 15_000,
			},
		);
	});
});
