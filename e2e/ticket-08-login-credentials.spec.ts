import { test, expect } from "@playwright/test";

const TEST_EMAIL = (process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local")
  .trim()
  .toLowerCase();
const TEST_PASSWORD = String(process.env.TEST_CLIENTE_PASSWORD || "Cliente123!");

test.describe("Ticket 08 - Login con credenciales", () => {
  test("permite login con credenciales validas", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("OBSTEDESIGN")).toBeVisible();

    await page.getByLabel("Correo electronico").fill(TEST_EMAIL);
    await page.getByLabel("Contrasena").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesion con correo" }).click();

    await expect(page).toHaveURL(/\/tienda$/, { timeout: 15_000 });
  });

  test("muestra error minimo con credenciales invalidas", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Correo electronico").fill(TEST_EMAIL);
    await page.getByLabel("Contrasena").fill(`${TEST_PASSWORD}-incorrecta`);
    await page.getByRole("button", { name: "Iniciar sesion con correo" }).click();

    await expect(page.getByText("Credenciales invalidas")).toBeVisible();
  });
});
