import { test, expect } from "@playwright/test";

test.describe("Ticket 09 - Login con Google", () => {
  test("Google queda disponible en la pantalla de login", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("OBSTEDESIGN")).toBeVisible();

    const googleButton = page.getByRole("button", {
      name: /Iniciar sesion con Google/i,
    });
    await expect(googleButton).toBeVisible({
      timeout: 12_000,
    });
    await expect(googleButton).toBeEnabled();
  });

  test("inicia redireccion OAuth al hacer click en Google", async ({ page }) => {
    await page.goto("/");

    const googleEnabled = page.getByRole("button", {
      name: /Iniciar sesion con Google/i,
    });
    await expect(googleEnabled).toBeVisible({ timeout: 12_000 });
    await expect(googleEnabled).toBeEnabled();
    await googleEnabled.click();

    await expect(page).toHaveURL(/\/api\/auth\/signin\/google|accounts\.google\.com/, {
      timeout: 15_000,
    });
  });
});
