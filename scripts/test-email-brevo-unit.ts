/**
 * Pruebas unitarias del servicio de email Brevo.
 *
 * Verifica:
 * - fallback local cuando no hay credenciales
 * - payload correcto para HTML/texto
 * - payload correcto para plantillas de Brevo
 * - manejo seguro de errores del proveedor
 *
 * Uso:
 *   pnpm test:email:unit
 */

import { sendTransactionalEmail } from "../lib/server/mailer.js";

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function withEnv(values: Record<string, string | undefined>, callback: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();

  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key]);
    const nextValue = values[key];
    if (nextValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = nextValue;
    }
  }

  return callback().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

async function main() {
  const originalFetch = global.fetch;

  try {
    section("1. Fallback local en desarrollo");
    await withEnv(
      {
        NODE_ENV: "development",
        BREVO_API_KEY: undefined,
        EMAIL_FROM: undefined,
        EMAIL_FROM_NAME: undefined,
      },
      async () => {
        const result = await sendTransactionalEmail({
          to: "cliente@obstedesign.local",
          subject: "Prueba local",
          text: "Contenido local",
        });

        assert("sin credenciales retorna exito local", result.ok === true);
        assert(
          "fallback local usa transport log",
          result.ok === true && result.data.transport === "log"
        );
      }
    );

    section("2. Payload correcto para contenido HTML/texto");
    await withEnv(
      {
        NODE_ENV: "production",
        BREVO_API_KEY: "brevo-test-key",
        EMAIL_FROM: "noreply@obstedesign.com",
        EMAIL_FROM_NAME: "Obstedesign",
      },
      async () => {
        let requestUrl = "";
        let requestInit: RequestInit | undefined;

        global.fetch = async (input: string | URL | Request, init?: RequestInit) => {
          requestUrl = String(input);
          requestInit = init;
          return new Response(JSON.stringify({ messageId: "<brevo-message-id>" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        };

        const result = await sendTransactionalEmail({
          to: "cliente@obstedesign.local",
          subject: "Recuperacion",
          text: "Version texto",
          html: "<p>Version html</p>",
        });

        const body = JSON.parse(String(requestInit?.body ?? "{}"));

        assert("mailer llama al endpoint de Brevo", requestUrl === "https://api.brevo.com/v3/smtp/email");
        assert(
          "mailer envia api-key de Brevo",
          requestInit?.headers != null &&
            typeof requestInit.headers === "object" &&
            "api-key" in requestInit.headers &&
            requestInit.headers["api-key"] === "brevo-test-key"
        );
        assert("sender usa email configurado", body.sender.email === "noreply@obstedesign.com");
        assert("sender usa nombre configurado", body.sender.name === "Obstedesign");
        assert("payload incluye destinatario", body.to[0].email === "cliente@obstedesign.local");
        assert("payload incluye subject", body.subject === "Recuperacion");
        assert("payload incluye texto plano", body.textContent === "Version texto");
        assert("payload incluye html", body.htmlContent === "<p>Version html</p>");
        assert(
          "respuesta exitosa reporta transport brevo",
          result.ok === true && result.data.transport === "brevo"
        );
      }
    );

    section("3. Payload correcto para plantillas");
    await withEnv(
      {
        NODE_ENV: "production",
        BREVO_API_KEY: "brevo-test-key",
        EMAIL_FROM: "noreply@obstedesign.com",
        EMAIL_FROM_NAME: "Obstedesign",
      },
      async () => {
        let requestInit: RequestInit | undefined;

        global.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
          requestInit = init;
          return new Response(JSON.stringify({ messageId: "<template-message-id>" }), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        };

        const result = await sendTransactionalEmail({
          to: "cliente@obstedesign.local",
          subject: "Asunto opcional",
          templateId: 12,
          params: {
            fullName: "Cliente Prueba",
            actionUrl: "https://obstedesign.com",
          },
        });

        const body = JSON.parse(String(requestInit?.body ?? "{}"));

        assert("payload incluye templateId", body.templateId === 12);
        assert("payload incluye params", body.params.fullName === "Cliente Prueba");
        assert("payload conserva subject opcional", body.subject === "Asunto opcional");
        assert(
          "template response reporta brevo",
          result.ok === true && result.data.transport === "brevo"
        );
      }
    );

    section("4. Manejo seguro de errores del proveedor");
    await withEnv(
      {
        NODE_ENV: "production",
        BREVO_API_KEY: "brevo-test-key",
        EMAIL_FROM: "noreply@obstedesign.com",
      },
      async () => {
        global.fetch = async () =>
          new Response(JSON.stringify({ message: "invalid sender" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });

        const result = await sendTransactionalEmail({
          to: "cliente@obstedesign.local",
          subject: "Error esperado",
          text: "Contenido",
        });

        assert("error del proveedor no rompe el contrato", result.ok === false);
        assert(
          "error del proveedor devuelve mensaje sanitizado",
          result.ok === false && result.error.message === "No se pudo enviar el correo"
        );
      }
    );
  } finally {
    global.fetch = originalFetch;
  }

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    console.log("\n\x1b[31mPRUEBAS UNITARIAS DE BREVO FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mServicio de email Brevo validado correctamente.\x1b[0m");
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas unitarias de Brevo:", error.message);
  process.exit(1);
});
