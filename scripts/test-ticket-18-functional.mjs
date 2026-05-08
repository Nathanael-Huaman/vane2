/**
 * Validacion funcional del Ticket 18
 *
 * Orquesta la evidencia funcional transversal de:
 * - login con credenciales
 * - login con Google
 * - resolucion de roles
 * - sesiones persistidas
 * - autorizacion UI/backend
 * - cambio de vista por sesion
 * - recuperacion de contrasena
 * - mensajes seguros y estados de carga
 *
 * Uso:
 *   pnpm test:ticket-18
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const reportDir = join(rootDir, "reports");
const reportPath = join(reportDir, "ticket-18-functional-validation.json");

const checks = [
  {
    id: "preconditions",
    area: "precondiciones",
    flow: "Usuarios de prueba disponibles para credenciales, roles y sesiones",
    command: "pnpm seed:test-auth-users",
    visibleOutcome: "La base local queda lista para ejecutar los flujos funcionales.",
    serverOutcome: "Existen usuarios cliente y administrador con rol y contrasena validos.",
  },
  {
    id: "credentials-login",
    area: "login",
    flow: "Ingreso por credenciales con validacion de formato y password",
    command: "pnpm test:ticket-08:runtime",
    visibleOutcome: "El formulario puede conducir al acceso seguro con feedback minimo.",
    serverOutcome:
      "Las credenciales validas autentican y las invalidas se rechazan sin filtrar detalles.",
  },
  {
    id: "google-login",
    area: "login",
    flow: "Ingreso con Google desde la pantalla principal",
    command: "pnpm test:ticket-09:e2e",
    visibleOutcome: "El boton de Google esta disponible y dispara la redireccion OAuth.",
    serverOutcome: "Auth.js mantiene el flujo del provider y el callback seguro para Google.",
  },
  {
    id: "post-login-role",
    area: "roles",
    flow: "Resolucion de rol despues del login",
    command: "pnpm test:ticket-10:runtime",
    visibleOutcome: "La UI puede diferenciar cliente y administrador sin ambiguedad.",
    serverOutcome: "El rol persiste de forma consistente para ambos usuarios de prueba.",
  },
  {
    id: "persistent-session",
    area: "sesiones",
    flow: "Creacion y lectura de sesiones persistidas",
    command: "pnpm test:ticket-11:runtime",
    visibleOutcome: "La tienda puede recibir una sesion valida tras autenticacion.",
    serverOutcome: "Las sesiones quedan guardadas con token unico y expiracion futura.",
  },
  {
    id: "ui-authorization",
    area: "autorizacion",
    flow: "Visibilidad UI por rol en tienda y perfil",
    command: "pnpm test:ticket-12:e2e",
    visibleOutcome: "Cliente y admin ven bloques distintos segun su rol.",
    serverOutcome: "La capa visual usa sesion y rol resueltos de forma segura.",
  },
  {
    id: "backend-authorization",
    area: "autorizacion",
    flow: "Proteccion backend real en setup",
    command: "pnpm test:ticket-13:e2e",
    visibleOutcome: "Cliente recibe fallback neutro y admin accede al diagnostico.",
    serverOutcome: "Las acciones protegidas exigen rol administrador en servidor.",
  },
  {
    id: "session-view-mode",
    area: "sesiones",
    flow: "Cambio entre vista cliente y administrador por sesion",
    command: "pnpm test:ticket-14:e2e",
    visibleOutcome: "El admin puede alternar de vista y la UI refleja el modo actual.",
    serverOutcome: "El viewMode se persiste por sesion sin alterar el rol real.",
  },
  {
    id: "password-reset",
    area: "recuperacion",
    flow: "Solicitud y consumo del flujo de recuperacion",
    command: "pnpm test:ticket-15:runtime",
    visibleOutcome: "El flujo puede exponer mensajes minimos y completar el restablecimiento.",
    serverOutcome: "El token de recuperacion se valida y la contrasena puede actualizarse.",
  },
  {
    id: "reset-security",
    area: "seguridad",
    flow: "Capas complementarias de seguridad para recuperacion",
    command: "pnpm test:ticket-16",
    visibleOutcome:
      "La UI deja preparado el feedback para enfriamiento y protecciones futuras.",
    serverOutcome: "El flujo integra backlog reusable de rate limiting y auditoria.",
  },
  {
    id: "safe-feedback",
    area: "feedback",
    flow: "Mensajes de error y estados de carga en auth y recuperacion",
    command: "pnpm test:ticket-17",
    visibleOutcome:
      "Login y recuperacion muestran loading, exito y error de manera consistente.",
    serverOutcome:
      "Las respuestas de autenticacion se traducen a mensajes seguros y reutilizables.",
  },
];

function section(title) {
  console.log(`\n${title}`);
}

function getSnippet(output) {
  return output.trim().split("\n").slice(-12).join("\n");
}

function getErrorOutput(error) {
  if (!error || typeof error !== "object") {
    return "Error desconocido";
  }

  const stdout = typeof error.stdout === "string" ? error.stdout : "";
  const stderr = typeof error.stderr === "string" ? error.stderr : "";

  if (stdout || stderr) {
    return `${stdout}\n${stderr}`;
  }

  return error instanceof Error ? error.message : "Error desconocido";
}

function runCheck(check) {
  const startedAt = Date.now();

  try {
    const output = execSync(check.command, {
      cwd: rootDir,
      stdio: "pipe",
      encoding: "utf-8",
      env: process.env,
    });

    return {
      ...check,
      ok: true,
      durationMs: Date.now() - startedAt,
      outputSnippet: getSnippet(output),
    };
  } catch (error) {
    return {
      ...check,
      ok: false,
      durationMs: Date.now() - startedAt,
      outputSnippet: getSnippet(getErrorOutput(error)),
    };
  }
}

async function main() {
  section("Ticket 18 - Validacion funcional");

  const results = [];

  for (const check of checks) {
    console.log(`\n> ${check.id} :: ${check.command}`);
    const result = runCheck(check);
    results.push(result);

    if (result.ok) {
      console.log(`  \x1b[32m✓\x1b[0m ${check.flow}`);
    } else {
      console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${check.flow}`);
    }
  }

  const passed = results.filter((item) => item.ok).length;
  const failed = results.length - passed;

  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        ticket: "18",
        name: "validacion funcional",
        generatedAt: new Date().toISOString(),
        summary: {
          total: results.length,
          passed,
          failed,
        },
        results,
      },
      null,
      2
    )
  );

  console.log(`\nReporte JSON: ${reportPath}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log("\n\x1b[32mTicket 18 validado funcionalmente.\x1b[0m");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Error desconocido";
  console.error("Error ejecutando la validacion funcional del ticket 18:", message);
  process.exit(1);
});
