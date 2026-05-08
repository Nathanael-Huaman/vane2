import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const TEST_CLIENTE_PASSWORD = String(process.env.TEST_CLIENTE_PASSWORD || "Cliente123!");
const TEST_ADMIN_EMAIL = (process.env.TEST_ADMIN_EMAIL || "admin.prueba@obstedesign.local")
  .trim()
  .toLowerCase();
const TEST_ADMIN_PASSWORD = String(process.env.TEST_ADMIN_PASSWORD || "Admin12345!");
const SESSION_COOKIE_NAME = "authjs.session-token";

function createAdapter(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();
  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return new PrismaPg(new Pool({ connectionString: databaseUrl }));
  }
  if (lower.startsWith("file:") || lower.startsWith("libsql:")) {
    return new PrismaLibSql({ url: databaseUrl });
  }
  throw new Error(
    "DATABASE_URL no soportada. Usa file:/libsql: para SQLite o postgres:/postgresql: para PostgreSQL."
  );
}

const prisma = new PrismaClient({
  adapter: createAdapter(process.env.DATABASE_URL || "file:./dev.db"),
});

async function loginWithCredentials(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto("/");
  await page.getByLabel("Correo electronico").fill(email);
  await page.getByLabel("Contrasena").fill(password);
  await page.getByRole("button", { name: "Iniciar sesion con correo" }).click();
}

async function ensureGoogleLinkedUser(email: string, providerAccountId: string) {
  const user = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new Error(`Usuario de prueba no encontrado para ${email}`);
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId,
      },
    },
    update: {
      userId: user.id,
      type: "oidc",
    },
    create: {
      userId: user.id,
      type: "oidc",
      provider: "google",
      providerAccountId,
    },
  });

  return user;
}

async function seedAuthenticatedSession(
  page: import("@playwright/test").Page,
  email: string
) {
  const user = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`Usuario de prueba no encontrado para ${email}`);
  }

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await prisma.sesion.create({
    data: {
      userId: user.id,
      sessionToken,
      expiresAt,
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

test.describe("Ticket 19 - Validacion BDD", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Given un cliente por credenciales When inicia sesion Then entra a tienda y solo ve la experiencia cliente", async ({
    page,
  }) => {
    await loginWithCredentials(page, TEST_CLIENTE_EMAIL, TEST_CLIENTE_PASSWORD);

    await expect(page).toHaveURL(/\/tienda$/, { timeout: 20_000 });
    await expect(page.getByText("Tienda Obstedesign")).toBeVisible();
    await expect(page.getByText("Experiencia cliente activa")).toBeVisible();
    await expect(page.getByText("Opciones extra de administrador")).toHaveCount(0);
  });

  test("Given un administrador por credenciales When inicia sesion Then entra a tienda y puede usar la vista de administrador", async ({
    page,
  }) => {
    await loginWithCredentials(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

    await expect(page).toHaveURL(/\/tienda$/, { timeout: 20_000 });
    await expect(page.getByText("Opciones extra de administrador")).toBeVisible();
    await expect(page.getByText("Modo actual: vista administrador")).toBeVisible();
    await expect(page.getByRole("button", { name: "Vista cliente" })).toBeVisible();
  });

  test("Given credenciales invalidas When el usuario intenta iniciar sesion Then recibe feedback minimo y permanece fuera del flujo autenticado", async ({
    page,
  }) => {
    await loginWithCredentials(page, TEST_CLIENTE_EMAIL, `${TEST_CLIENTE_PASSWORD}__bad`);

    await expect(page.getByText("Credenciales invalidas")).toBeVisible();
    await expect(page).toHaveURL(/\/\?error=CredentialsSignin$/, { timeout: 15_000 });
  });

  test("Given Google disponible When un visitante pulsa el acceso social Then comienza la redireccion OAuth", async ({
    page,
  }) => {
    await page.goto("/");

    const googleButton = page.getByRole("button", {
      name: /Iniciar sesion con Google/i,
    });

    await expect(googleButton).toBeVisible({ timeout: 12_000 });
    await expect(googleButton).toBeEnabled();
    await googleButton.click();

    await expect(page).toHaveURL(/\/api\/auth\/signin\/google|accounts\.google\.com/, {
      timeout: 15_000,
    });
  });

  test("Given un cliente con cuenta Google vinculada When entra a perfil y setup Then mantiene permisos de cliente y recibe fallback neutro", async ({
    page,
  }) => {
    await ensureGoogleLinkedUser(TEST_CLIENTE_EMAIL, "ticket19-google-cliente");
    await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);

    await page.goto("/perfil");
    await expect(page.getByText("Panel de cliente")).toBeVisible();
    await expect(page.getByText("Panel de administrador")).toHaveCount(0);

    await page.goto("/setup");
    await expect(page.getByText("Acceso restringido")).toBeVisible();
    await expect(page.getByText("No puedes acceder a esta seccion")).toBeVisible();
    await expect(page.getByText("Diagnostico de conexion")).toHaveCount(0);
  });

  test("Given un administrador con cuenta Google vinculada When entra a tienda, cambia la vista y visita setup Then conserva permisos admin y el modo de sesion persiste", async ({
    page,
  }) => {
    await ensureGoogleLinkedUser(TEST_ADMIN_EMAIL, "ticket19-google-admin");
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);

    await page.goto("/tienda");
    await expect(page.getByText("Opciones extra de administrador")).toBeVisible();
    await expect(page.getByText("Modo actual: vista administrador")).toBeVisible();

    await page.getByRole("button", { name: "Vista cliente" }).click();

    await expect(page.getByText("Modo actual: vista cliente")).toBeVisible();
    await expect(page.getByText("Experiencia cliente activa")).toBeVisible();
    await expect(page.getByText("Opciones extra de administrador")).toHaveCount(0);

    await page.goto("/perfil");
    await expect(page.getByText("Panel de cliente")).toBeVisible();
    await expect(page.getByText("Panel de administrador")).toHaveCount(0);

    await page.goto("/setup");
    await expect(page.getByText("Estado de la base de datos")).toBeVisible();
    await expect(page.getByText("Diagnostico de conexion")).toBeVisible();
    await expect(page.getByText("Acceso restringido")).toHaveCount(0);
  });
});
