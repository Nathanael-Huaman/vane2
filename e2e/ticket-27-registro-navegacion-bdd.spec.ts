import { test, expect } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const TEST_CLIENTE_PASSWORD = String(process.env.TEST_CLIENTE_PASSWORD || "Cliente123!");
const TEST_ADMIN_EMAIL = (process.env.TEST_ADMIN_EMAIL || "admin.prueba@obstedesign.local")
  .trim()
  .toLowerCase();
const SESSION_COOKIE_NAME = "authjs.session-token";

function createAdapter(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();
  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return new PrismaPg(new Pool({ connectionString: databaseUrl }));
  }
  if (lower.startsWith("file:") || lower.startsWith("libsql:")) {
    return new PrismaLibSql({ url: databaseUrl });
  }
  throw new Error("DATABASE_URL no soportada para tests BDD");
}

const prisma = new PrismaClient({
  adapter: createAdapter(process.env.DATABASE_URL || "file:./dev.db"),
});

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${randomBytes(4).toString("hex")}@obstedesign.local`;
}

async function ensureUser(email: string, role: "cliente" | "administrador") {
  await prisma.usuario.upsert({
    where: { email },
    update: {
      role,
    },
    create: {
      email,
      role,
      passwordHash: await bcrypt.hash(TEST_CLIENTE_PASSWORD, 12),
      emailVerificado: true,
    },
  });
}

async function seedAuthenticatedSession(
  page: import("@playwright/test").Page,
  email: string,
  viewMode?: "cliente" | "administrador"
) {
  const user = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) throw new Error(`Usuario no encontrado: ${email}`);

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await prisma.sesion.create({
    data: {
      userId: user.id,
      sessionToken,
      expiresAt,
      viewMode,
    },
  });

  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(expiresAt.getTime() / 1000),
    },
  ]);
}

test.describe("Ticket 27 - Registro y navegacion (BDD)", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Given visitante en /registro When completa datos validos Then crea cuenta cliente y va a confirmacion", async ({
    page,
  }) => {
    const email = uniqueEmail("bdd.registro.ok");
    await page.goto("/registro");
    await page.getByLabel("Correo electronico").fill(email);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_CLIENTE_PASSWORD);
    await page.getByLabel("Confirmar contrasena").fill(TEST_CLIENTE_PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page).toHaveURL(/\/registro\/confirmacion/, { timeout: 20_000 });
    const user = await prisma.usuario.findUnique({
      where: { email },
      select: { role: true },
    });
    expect(user?.role).toBe("cliente");
  });

  test("Given visitante en /registro When usa email existente Then muestra error generico", async ({
    page,
  }) => {
    const email = uniqueEmail("bdd.registro.duplicado");
    await prisma.usuario.create({
      data: {
        email,
        role: "cliente",
        passwordHash: await bcrypt.hash(TEST_CLIENTE_PASSWORD, 12),
      },
    });

    await page.goto("/registro");
    await page.getByLabel("Correo electronico").fill(email);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_CLIENTE_PASSWORD);
    await page.getByLabel("Confirmar contrasena").fill(TEST_CLIENTE_PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.getByText("Ya existe una cuenta con ese correo electronico.")).toBeVisible();
  });

  test("Given click en Registrarse con Google When inicia OAuth Then comienza la redireccion social", async ({
    page,
  }) => {
    await page.goto("/registro");
    await page.getByRole("button", { name: /Registrarse con Google/i }).click();
    await expect(page).toHaveURL(/\/api\/auth\/signin\/google|accounts\.google\.com/, {
      timeout: 15_000,
    });
  });

  test("Given token valido When verifica correo Then muestra exito", async ({ page }) => {
    const email = uniqueEmail("bdd.verificacion.ok");
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");
    await prisma.usuario.create({
      data: {
        email,
        role: "cliente",
        emailVerificado: false,
        tokenVerificacion: hashedToken,
        tokenVerificacionExpira: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await page.goto(`/verificar-email?token=${rawToken}&email=${encodeURIComponent(email)}`);
    await expect(page.getByText("Correo verificado", { exact: true })).toBeVisible();
    await expect(page.getByText("Correo verificado correctamente.")).toBeVisible();
  });

  test("Given token expirado When verifica correo Then muestra error y reenviar", async ({
    page,
  }) => {
    const email = uniqueEmail("bdd.verificacion.expirado");
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");
    await prisma.usuario.create({
      data: {
        email,
        role: "cliente",
        emailVerificado: false,
        tokenVerificacion: hashedToken,
        tokenVerificacionExpira: new Date(Date.now() - 60 * 1000),
      },
    });

    await page.goto(`/verificar-email?token=${rawToken}&email=${encodeURIComponent(email)}`);
    await expect(page.getByText("No se pudo verificar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar correo de verificacion" })).toBeVisible();
  });

  test("Given visitante no autenticado When navega Then navbar muestra login y registro", async ({
    page,
  }) => {
    await page.goto("/tienda");
    await expect(
      page.getByRole("button", { name: "Iniciar sesion", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Registrarse", exact: true })
    ).toBeVisible();
  });

  test("Given cliente autenticado When navega Then navbar muestra mi cuenta y cerrar sesion", async ({
    page,
  }) => {
    await ensureUser(TEST_CLIENTE_EMAIL, "cliente");
    await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);
    await page.goto("/tienda");
    await expect(page.getByRole("button", { name: "Menu de usuario" })).toBeVisible();
    await page.getByRole("button", { name: "Menu de usuario" }).click();
    await expect(page.getByText("Mi cuenta")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Cerrar sesion" })).toBeVisible();
  });

  test("Given admin en vista admin When navega Then conserva experiencia admin y switch a cliente", async ({
    page,
  }) => {
    await ensureUser(TEST_ADMIN_EMAIL, "administrador");
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL, "administrador");
    await page.goto("/tienda");
    await expect(page.getByText("Opciones extra de administrador")).toBeVisible();
    await expect(page.getByRole("button", { name: "Vista cliente" })).toBeVisible();
  });

  test("Given movil When render navbar Then menu hamburguesa despliega items", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByLabel("Abrir menu de navegacion").click();
    const mobileMenu = page.locator("#mobile-menu");
    await expect(
      mobileMenu.getByRole("button", { name: "Iniciar sesion", exact: true })
    ).toBeVisible();
    await expect(
      mobileMenu.getByRole("button", { name: "Registrarse", exact: true })
    ).toBeVisible();
  });
});
