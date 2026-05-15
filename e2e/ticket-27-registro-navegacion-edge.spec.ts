import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const TEST_CLIENTE_PASSWORD = String(process.env.TEST_CLIENTE_PASSWORD || "Cliente123!");

const prisma = createRuntimePrismaClient();

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${randomBytes(4).toString("hex")}@obstedesign.local`;
}

test.describe("Ticket 27 - Registro y navegacion (Casos de borde)", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // Spec: Casos de borde > doble submit
  test("doble click en crear cuenta no produce doble submit concurrente", async ({ page }) => {
    const email = uniqueEmail("edge.double-submit");
    let requestCount = 0;
    await page.route("**/api/auth/registro", async (route) => {
      requestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.continue();
    });

    await page.goto("/registro");
    await page.getByLabel("Correo electronico").fill(email);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_CLIENTE_PASSWORD);
    await page.getByLabel("Confirmar contrasena").fill(TEST_CLIENTE_PASSWORD);

    const submit = page.getByRole("button", { name: "Crear cuenta" });
    await Promise.all([submit.click(), submit.click()]);
    await expect(page).toHaveURL(/\/registro\/confirmacion/, { timeout: 20_000 });
    expect(requestCount).toBeLessThanOrEqual(2);
  });

  // Spec: Reglas > email normalizado (trim/lowercase)
  test("registro normaliza correo con espacios y mayusculas", async ({ page }) => {
    const raw = uniqueEmail("edge.normalize").toUpperCase();
    const normalized = raw.trim().toLowerCase();
    await page.goto("/registro");
    await page.getByLabel("Correo electronico").fill(`  ${raw}  `);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_CLIENTE_PASSWORD);
    await page.getByLabel("Confirmar contrasena").fill(TEST_CLIENTE_PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/registro\/confirmacion/, { timeout: 20_000 });

    const user = await prisma.usuario.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    expect(user?.id).toBeTruthy();
  });

  // Spec: Casos de borde > doble click en reenvio
  test("reenviar en confirmacion evita envios rapidos duplicados", async ({ page }) => {
    await page.goto("/registro/confirmacion");
    const resend = page.getByRole("button", { name: "Reenviar" });
    await resend.click();
    await expect(page.getByText("No pudimos identificar tu correo.")).toBeVisible();
  });

  // Spec: Casos de borde > cambio de sesion refleja navbar
  test("navbar actualiza estado tras login de cliente", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Correo electronico").fill(TEST_CLIENTE_EMAIL);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_CLIENTE_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesion con correo" }).click();
    await expect(page).toHaveURL(/\/tienda$/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Menu de usuario" })).toBeVisible();
  });

  // Spec: Casos de borde > resize movil a desktop con menu abierto
  test("resize movil->desktop oculta menu movil abierto", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByLabel("Abrir menu de navegacion").click();
    const mobileMenu = page.locator("#mobile-menu");
    await expect(
      mobileMenu.getByRole("button", { name: "Iniciar sesion", exact: true })
    ).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(
      page.getByRole("button", { name: "Iniciar sesion", exact: true })
    ).toBeVisible();
    await expect(page.locator("#mobile-menu")).toBeHidden();
  });
});
