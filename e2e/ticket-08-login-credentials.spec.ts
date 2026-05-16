import { test, expect } from "@playwright/test";

const TEST_EMAIL = (
	process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
	.trim()
	.toLowerCase();
const TEST_PASSWORD = String(
	process.env.TEST_CLIENTE_PASSWORD || "Cliente123!",
);

test.describe("Ticket 08 - Login con credenciales", () => {
	test("permite login con credenciales validas", async ({ page }) => {
		await page.goto("/login");

		await expect(
			page.getByRole("heading", { name: "OBSTEDESIGN" }),
		).toBeVisible();

		await page.getByLabel("Correo electrónico").fill(TEST_EMAIL);
		await page.getByLabel("Contraseña").fill(TEST_PASSWORD);
		await page
			.getByRole("button", { name: "Iniciar sesión con correo" })
			.click();

		await expect(page).toHaveURL(/\/tienda$/, { timeout: 15_000 });
	});

	test("muestra error minimo con credenciales invalidas", async ({ page }) => {
		await page.goto("/login");

		await page.getByLabel("Correo electrónico").fill(TEST_EMAIL);
		await page.getByLabel("Contraseña").fill(`${TEST_PASSWORD}-incorrecta`);
		await page
			.getByRole("button", { name: "Iniciar sesión con correo" })
			.click();

		await expect(page).toHaveURL(/\/\?error=CredentialsSignin/, {
			timeout: 15_000,
		});
	});
});
