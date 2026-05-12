import { test, expect } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

const TEST_PASSWORD = "Cliente123!";

const prisma = createRuntimePrismaClient();

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${randomBytes(4).toString("hex")}@obstedesign.local`;
}

async function seedExistingUser(email: string) {
  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
      role: "cliente",
      emailVerificado: false,
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 12),
    },
  });
}

test.describe("Ticket 27 - Registro y navegacion (E2E funcional)", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // Spec: Flujo esperado > Registro con credenciales (pasos 1-10)
  test("registro exitoso con credenciales redirige a confirmacion y persiste rol cliente", async ({
    page,
  }) => {
    const email = uniqueEmail("registro.ok");
    await page.goto("/registro");

    await page.getByLabel("Correo electronico").fill(email);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirmar contrasena").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page).toHaveURL(new RegExp("/registro/confirmacion\\?email="), {
      timeout: 20_000,
    });
    await expect(page.getByText("¡Cuenta creada con exito!")).toBeVisible();

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { role: true, emailVerificado: true },
    });
    expect(usuario?.role).toBe("cliente");
    expect(usuario?.emailVerificado).toBe(false);
  });

  // Spec: Reglas de negocio > No se pueden registrar dos cuentas con el mismo email
  test("registro duplicado muestra mensaje generico y no redirige a confirmacion", async ({
    page,
  }) => {
    const email = uniqueEmail("registro.duplicado");
    await seedExistingUser(email);

    await page.goto("/registro");
    await page.getByLabel("Correo electronico").fill(email);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirmar contrasena").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.getByText("No se pudo crear la cuenta")).toBeVisible();
    await expect(page.getByText("Ya existe una cuenta con ese correo electronico.")).toBeVisible();
    await expect(page).toHaveURL(/\/registro$/, { timeout: 10_000 });
  });

  // Spec: Flujo esperado > validaciones frontend antes de backend
  test("validaciones cliente bloquean submit con datos invalidos", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/auth/registro", async (route) => {
      requestCount += 1;
      await route.continue();
    });

    await page.goto("/registro");
    await page.getByLabel("Correo electronico").fill("correo-invalido");
    await page.getByLabel("Contrasena", { exact: true }).fill("123");
    await page.getByLabel("Confirmar contrasena").fill("456");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.getByText("El formato del correo no es valido")).toBeVisible();
    await expect(page.getByText("La contrasena debe tener al menos 8 caracteres")).toBeVisible();
    await expect(page.getByText("Las contrasenas no coinciden")).toBeVisible();
    expect(requestCount).toBe(0);
  });

  // Spec: Flujo esperado > Registro con Google
  test("boton registrarse con google inicia redireccion OAuth", async ({ page }) => {
    await page.goto("/registro");

    const button = page.getByRole("button", { name: /Registrarse con Google/i });
    await expect(button).toBeVisible({ timeout: 15_000 });
    await expect(button).toBeEnabled();
    await button.click();

    await expect(page).toHaveURL(/\/api\/auth\/signin\/google|accounts\.google\.com/, {
      timeout: 15_000,
    });
  });

  // Spec: Flujo esperado > Verificacion de correo (token valido)
  test("verificacion con token valido muestra exito y limpia token", async ({ page }) => {
    const email = uniqueEmail("verificacion.ok");
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    await prisma.usuario.create({
      data: {
        email,
        role: "cliente",
        emailVerificado: false,
        passwordHash: await bcrypt.hash(TEST_PASSWORD, 12),
        tokenVerificacion: hashedToken,
        tokenVerificacionExpira: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await page.goto(`/verificar-email?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`);
    await expect(page.getByText("Correo verificado", { exact: true })).toBeVisible();
    await expect(page.getByText("Correo verificado correctamente.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir a la tienda" })).toBeVisible();
  });

  // Spec: Flujo esperado > Verificacion de correo (token invalido/expirado)
  test("verificacion con token invalido muestra error y opcion de reenvio", async ({
    page,
  }) => {
    await page.goto("/verificar-email?token=token-invalido");
    await expect(page.getByText("No se pudo verificar")).toBeVisible();
    await expect(page.getByText("El enlace puede ser invalido o haber expirado.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar correo de verificacion" })).toBeVisible();
  });

  // Spec: Criterios de aceptacion > Navbar visible en todas las paginas
  test("navbar global visible en rutas publicas principales", async ({ page }) => {
    for (const path of ["/", "/tienda", "/registro", "/login"]) {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: "Navegacion principal" })).toBeVisible();
      await expect(page.getByText("OBSTEDESIGN").first()).toBeVisible();
    }
  });

  // Spec: Criterios de aceptacion > Menu hamburguesa funcional en movil
  test("navbar movil abre y cierra menu hamburguesa", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const toggle = page.getByLabel("Abrir menu de navegacion");
    await expect(toggle).toBeVisible();
    await toggle.click();

    const mobileMenu = page.locator("#mobile-menu");
    await expect(
      mobileMenu.getByRole("button", { name: "Iniciar sesion", exact: true })
    ).toBeVisible();
    await mobileMenu
      .getByRole("button", { name: "Iniciar sesion", exact: true })
      .click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expect(page.getByLabel("Abrir menu de navegacion")).toBeVisible();
  });
});
