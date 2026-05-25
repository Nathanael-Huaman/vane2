import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { POST as credentialsLoginPost } from "../app/api/auth/credentials-login/route.js";
import { POST as registroPost } from "../app/api/auth/registro/route.js";
import { requestPasswordReset, resetPasswordWithToken } from "../lib/server/password/password-reset.js";
import { assessPasswordResetSendRisk, assessPasswordResetTokenRisk, PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE } from "../lib/server/password/password-reset-security.js";
import { parseMarkdownToHtml, sanitizeHtml } from "../lib/server/blog/markdown.js";
import { buildSilentUnauthenticatedSessionResponse, isStaticGenerationAuthSessionMiss } from "../lib/server/auth/session-error.js";
import { buildRateLimitLogContext, buildThrottleResponse, checkRateLimit, createMemoryRateLimitStore, deriveRateLimitActorKey } from "../lib/server/security/rate-limit.js";
import { buildSecurityHeaders } from "../lib/server/security/security-headers.js";
import { buildServerActionConfig, parseServerActionAllowedOrigins } from "../lib/server/security/server-action-origin-policy.js";
import nextConfig from "../next.config.mjs";

let passed = 0;
let failed = 0;

async function test(name: string, run: () => Promise<void> | void) {
	try {
		await run();
		passed++;
		console.log(`  \x1b[32m✓\x1b[0m ${name}`);
	} catch (error) {
		failed++;
		console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${name}`);
		console.error(error);
	}
}

async function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
	const previous = new Map<string, string | undefined>();
	for (const [key, value] of Object.entries(values)) {
		previous.set(key, process.env[key]);
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	try {
		await run();
	} finally {
		for (const [key, value] of previous.entries()) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
}

function assertNoRawValues(value: unknown, rawValues: string[]) {
	const text = JSON.stringify(value).toLowerCase();
	for (const rawValue of rawValues) {
		assert.equal(text.includes(rawValue.toLowerCase()), false, `leaked raw value: ${rawValue}`);
	}
}

function headersToRecord(headers: Array<{ key: string; value: string }>) {
	return Object.fromEntries(headers.map(({ key, value }) => [key.toLowerCase(), value]));
}

async function loadFreshNextConfigForEnv(values: Record<string, string | undefined>) {
	let loadedConfig: typeof nextConfig | undefined;
	await withEnv(values, async () => {
		const cacheKey = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
		const importedConfig = (await import(new URL(`../next.config.mjs?server-action-origin-policy=${cacheKey}`, import.meta.url).href)) as { default: typeof nextConfig };
		loadedConfig = importedConfig.default;
	});

	assert.ok(loadedConfig, "expected next config to load");
	return loadedConfig;
}

async function loadProductionSecurityValidator() {
	const cacheKey = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	return (await import(new URL(`./validate-production-security-controls.mjs?server-action-origin-policy=${cacheKey}`, import.meta.url).href)) as {
		validateServerActionOriginPolicySources: (sources: { nextConfig?: string; envExample?: string; serverActionOriginPolicy?: string }) => Array<{ label: string; ok: boolean; remediation?: string }>;
	};
}

function buildFormRequest(fields: Record<string, string>, headers: Record<string, string> = {}) {
	const formData = new FormData();
	for (const [key, value] of Object.entries(fields)) formData.set(key, value);
	return new Request("http://localhost/api/auth/credentials-login", {
		method: "POST",
		body: formData,
		headers,
	});
}

function buildJsonRequest(body: unknown, headers: Record<string, string> = {}) {
	return new Request("http://localhost/api/auth/registro", {
		method: "POST",
		headers: { "Content-Type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

async function captureConsole(run: () => Promise<void>) {
	const entries: unknown[][] = [];
	const original = { log: console.log, warn: console.warn, error: console.error };
	console.log = (...args: unknown[]) => entries.push(["log", ...args]);
	console.warn = (...args: unknown[]) => entries.push(["warn", ...args]);
	console.error = (...args: unknown[]) => entries.push(["error", ...args]);
	try {
		await run();
	} finally {
		console.log = original.log;
		console.warn = original.warn;
		console.error = original.error;
	}
	return entries;
}

await test("production limiter fails closed without a shared store", async () => {
	await withEnv(
		{ NODE_ENV: "production", RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret", REDIS_URL: undefined, RATE_LIMIT_REST_URL: undefined, RATE_LIMIT_REST_TOKEN: undefined },
		async () => {
			const result = await checkRateLimit({
				surface: "login",
				actorParts: { email: "Client@Example.com", ip: "198.51.100.10" },
				limit: { maxAttempts: 1, windowSeconds: 60 },
			});

			assert.equal(result.allowed, false);
			assert.equal(result.decision, "fail-closed");
			assert.equal(result.store, "unconfigured");
			assert.equal(result.retryAfterSeconds, 60);
			assertNoRawValues(result, ["Client@Example.com", "198.51.100.10"]);

			const response = buildThrottleResponse(result);
			assert.deepEqual(response, {
				ok: false,
				error: { message: "Demasiados intentos. Intenta nuevamente mas tarde.", status: 429 },
				meta: { retryAfterSeconds: 60 },
			});
		}
	);
});

await test("production limiter requires RATE_LIMIT_KEY_SECRET instead of falling back to AUTH_SECRET", async () => {
	await withEnv(
		{
			NODE_ENV: "production",
			AUTH_SECRET: "auth-secret-is-not-a-rate-limit-key",
			RATE_LIMIT_KEY_SECRET: undefined,
			REDIS_URL: undefined,
			RATE_LIMIT_REST_URL: "https://redis.example.test",
			RATE_LIMIT_REST_TOKEN: "rest-token",
		},
		async () => {
			let fetchCalled = false;
			const fetchImpl = async () => {
				fetchCalled = true;
				return new Response(JSON.stringify([{ result: 1 }, { result: "OK" }, { result: 60 }]), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			};

			const result = await checkRateLimit({
				surface: "login",
				actorParts: { email: "Secret.Fallback@example.com", ip: "198.51.100.11" },
				limit: { maxAttempts: 1, windowSeconds: 60 },
				fetchImpl,
			});

			assert.equal(fetchCalled, false);
			assert.equal(result.allowed, false);
			assert.equal(result.decision, "fail-closed");
			assert.equal(result.store, "unconfigured");
			assertNoRawValues(result, ["Secret.Fallback@example.com", "198.51.100.11"]);
		}
	);
});

await test("local and test environments can use deterministic memory counters", async () => {
	await withEnv({ NODE_ENV: "test", RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret" }, async () => {
		const store = createMemoryRateLimitStore();
		const input = { surface: "password-reset", actorParts: { email: "reset@example.com" }, limit: { maxAttempts: 2, windowSeconds: 45 }, store, now: 1_000 };

		const first = await checkRateLimit(input);
		const second = await checkRateLimit({ ...input, now: 2_000 });
		const third = await checkRateLimit({ ...input, now: 3_000 });

		assert.equal(first.allowed, true);
		assert.equal(first.remaining, 1);
		assert.equal(second.allowed, true);
		assert.equal(second.remaining, 0);
		assert.equal(third.allowed, false);
		assert.equal(third.decision, "deny");
		assert.equal(third.retryAfterSeconds, 43);
	});
});

await test("actor keys are HMAC hashes that normalize and hide sensitive parts", () => {
	const first = deriveRateLimitActorKey({ surface: "login", actorParts: { ip: " 203.0.113.5 ", email: " Client@Example.com " }, secret: "secret-one" });
	const second = deriveRateLimitActorKey({ surface: "login", actorParts: { email: "client@example.com", ip: "203.0.113.5" }, secret: "secret-one" });
	const changedSurface = deriveRateLimitActorKey({ surface: "checkout", actorParts: { email: "client@example.com", ip: "203.0.113.5" }, secret: "secret-one" });

	assert.equal(first, second);
	assert.notEqual(first, changedSurface);
	assert.match(first, /^rl:login:[a-f0-9]{64}$/);
	assertNoRawValues(first, ["Client@Example.com", "203.0.113.5"]);
});

await test("production REST adapter sends hashed keys and returns neutral denial metadata", async () => {
	await withEnv(
		{ NODE_ENV: "production", RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret", REDIS_URL: undefined, RATE_LIMIT_REST_URL: "https://redis.example.test", RATE_LIMIT_REST_TOKEN: "rest-token" },
		async () => {
			let requestUrl = "";
			let requestInit: RequestInit | undefined;
			const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
				requestUrl = String(input);
				requestInit = init;
				return new Response(JSON.stringify([{ result: 4 }, { result: "OK" }, { result: 30 }]), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			};

			const result = await checkRateLimit({ surface: "checkout", actorParts: { cart: "raw-cart-token", email: "buyer@example.com" }, limit: { maxAttempts: 3, windowSeconds: 30 }, fetchImpl });

			assert.equal(requestUrl, "https://redis.example.test/pipeline");
			assert.equal(requestInit?.headers?.["Authorization" as keyof HeadersInit], "Bearer rest-token");
			assertNoRawValues(requestInit?.body, ["raw-cart-token", "buyer@example.com"]);
			assert.equal(result.allowed, false);
			assert.equal(result.store, "rest");
			assert.equal(result.decision, "deny");
			assert.equal(result.retryAfterSeconds, 30);
			assert.deepEqual(buildRateLimitLogContext(result), {
				surface: "checkout",
				decision: "deny",
				retryAfterSeconds: 30,
				store: "rest",
			});
		}
	);
});

await test("production Redis TCP store is preferred over REST when REDIS_URL is configured", async () => {
	await withEnv(
		{
			NODE_ENV: "production",
			RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret",
			REDIS_URL: "redis://coolify-redis:6379",
			RATE_LIMIT_REST_URL: "https://redis.example.test",
			RATE_LIMIT_REST_TOKEN: "rest-token",
		},
		async () => {
			const redisCommands: string[][] = [];
			let redisClientUrl = "";
			let fetchCalled = false;
			const redisClientFactory = ({ url }: { url: string }) => {
				redisClientUrl = url;
				const client = {
					isOpen: false,
					async connect() {
						client.isOpen = true;
					},
					async sendCommand(command: string[]) {
						redisCommands.push(command);
						if (command[0] === "INCR") return 2;
						if (command[0] === "EXPIRE") return 1;
						if (command[0] === "TTL") return 25;
						throw new Error(`Unexpected Redis command: ${command.join(" ")}`);
					},
				};
				return client;
			};
			const fetchImpl = async () => {
				fetchCalled = true;
				throw new Error("REST fallback must not be used when REDIS_URL is configured");
			};

			const result = await checkRateLimit({
				surface: "login",
				actorParts: { email: "Redis.User@example.com", ip: "203.0.113.80" },
				limit: { maxAttempts: 1, windowSeconds: 30 },
				fetchImpl,
				redisClientFactory,
				now: 1_000,
			});

			const serializedCommands = JSON.stringify(redisCommands);
			assert.equal(redisClientUrl, "redis://coolify-redis:6379");
			assert.equal(fetchCalled, false);
			assert.match(serializedCommands, /rl:login:[a-f0-9]{64}/);
			assertNoRawValues(serializedCommands, ["Redis.User@example.com", "203.0.113.80"]);
			assert.equal(result.allowed, false);
			assert.equal(result.store, "redis");
			assert.equal(result.decision, "deny");
			assert.equal(result.retryAfterSeconds, 25);
			assert.deepEqual(buildRateLimitLogContext(result), {
				surface: "login",
				decision: "deny",
				retryAfterSeconds: 25,
				store: "redis",
			});
		}
	);
});

await test("security headers default to report-only CSP with app baseline protections", async () => {
	await withEnv({ SECURITY_HEADERS_CSP_MODE: undefined, NODE_ENV: "production" }, async () => {
		const headers = headersToRecord(buildSecurityHeaders());

		assert.equal(headers["content-security-policy"], undefined);
		assert.match(headers["content-security-policy-report-only"], /default-src 'self'/);
		assert.match(headers["content-security-policy-report-only"], /script-src 'self'/);
		assert.match(headers["content-security-policy-report-only"], /style-src 'self'/);
		assert.match(headers["content-security-policy-report-only"], /img-src 'self' data: blob:/);
		assert.match(headers["content-security-policy-report-only"], /font-src 'self' data:/);
		assert.match(headers["content-security-policy-report-only"], /object-src 'none'/);
		assert.match(headers["content-security-policy-report-only"], /base-uri 'self'/);
		assert.match(headers["content-security-policy-report-only"], /frame-ancestors 'self'/);
		assert.equal(headers["content-security-policy-report-only"].includes("*"), false);
		assert.equal(headers["x-content-type-options"], "nosniff");
		assert.equal(headers["x-frame-options"], "SAMEORIGIN");
		assert.equal(headers["referrer-policy"], "strict-origin-when-cross-origin");
		assert.match(headers["permissions-policy"], /camera=\(\)/);
	});
});

await test("security headers can enforce or disable CSP without dropping baseline headers", async () => {
	await withEnv({ SECURITY_HEADERS_CSP_MODE: "enforce", NODE_ENV: "production" }, async () => {
		const enforceHeaders = headersToRecord(buildSecurityHeaders());
		assert.match(enforceHeaders["content-security-policy"], /default-src 'self'/);
		assert.equal(enforceHeaders["content-security-policy-report-only"], undefined);
		assert.equal(enforceHeaders["x-content-type-options"], "nosniff");
	});

	await withEnv({ SECURITY_HEADERS_CSP_MODE: "off", NODE_ENV: "production" }, async () => {
		const offHeaders = headersToRecord(buildSecurityHeaders());
		assert.equal(offHeaders["content-security-policy"], undefined);
		assert.equal(offHeaders["content-security-policy-report-only"], undefined);
		assert.equal(offHeaders["x-content-type-options"], "nosniff");
		assert.equal(offHeaders["x-frame-options"], "SAMEORIGIN");
	});
});

await test("next config wires app-level security headers for all routes", async () => {
	await withEnv({ SECURITY_HEADERS_CSP_MODE: undefined, NODE_ENV: "production" }, async () => {
		assert.equal(typeof nextConfig.headers, "function");
		const rules = await nextConfig.headers();
		const appRule = rules.find((rule) => rule.source === "/:path*");
		assert.ok(appRule, "expected a global app header rule");
		const headers = headersToRecord(appRule.headers);
		assert.match(headers["content-security-policy-report-only"], /default-src 'self'/);
		assert.equal(headers["x-content-type-options"], "nosniff");
	});
});

await test("server action origin policy keeps default same-host posture unconfigured", async () => {
	await withEnv({ SERVER_ACTION_ALLOWED_ORIGINS: undefined }, async () => {
		assert.deepEqual(parseServerActionAllowedOrigins(process.env), []);
		assert.deepEqual(buildServerActionConfig(process.env), {});

		const config = await loadFreshNextConfigForEnv({ SERVER_ACTION_ALLOWED_ORIGINS: undefined });
		assert.equal(config.serverActions, undefined);
	});
});

await test("server action origin policy accepts exact deployment hosts and dedupes", async () => {
	const env = {
		SERVER_ACTION_ALLOWED_ORIGINS: "Store.Example.com, checkout.example.com:8443, store.example.com",
	};

	assert.deepEqual(parseServerActionAllowedOrigins(env), ["store.example.com", "checkout.example.com:8443"]);
	assert.deepEqual(buildServerActionConfig(env), {
		serverActions: { allowedOrigins: ["store.example.com", "checkout.example.com:8443"] },
	});

	const config = await loadFreshNextConfigForEnv(env);
	assert.deepEqual(config.serverActions, { allowedOrigins: ["store.example.com", "checkout.example.com:8443"] });
});

await test("server action origin policy rejects wildcard or broad allowed hosts", () => {
	for (const origin of ["*", "**", "*.example.com", "shop.*.example.com", "example.*"]) {
		assert.throws(
			() => parseServerActionAllowedOrigins({ SERVER_ACTION_ALLOWED_ORIGINS: origin }),
			/SERVER_ACTION_ALLOWED_ORIGINS.*exact host\[:port\].*wildcard/i,
		);
	}
});

await test("server action origin policy rejects malformed host entries", () => {
	for (const origin of ["https://store.example.com", "http://store.example.com", "null", "store.example.com/path", "store.example.com?next=/admin", "store.example.com#fragment", "store.example.com,,api.example.com", " ", "store.example.com:badport"]) {
		assert.throws(
			() => parseServerActionAllowedOrigins({ SERVER_ACTION_ALLOWED_ORIGINS: origin }),
			/SERVER_ACTION_ALLOWED_ORIGINS.*exact host\[:port\]/i,
		);
	}
});

await test("security header rollout mode is documented for operators", () => {
	const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
	assert.match(envExample, /SECURITY_HEADERS_CSP_MODE="report-only"/);
	assert.match(envExample, /report-only\|enforce\|off/);
});

await test("production rate-limit deploy variables are documented as real external values", () => {
	const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
	assert.match(envExample, /Production deploys must set real shared-store values/i);
	assert.match(envExample, /Do not deploy with placeholder/i);
	assert.match(envExample, /RATE_LIMIT_KEY_SECRET/);
	assert.match(envExample, /REDIS_URL/);
	assert.match(envExample, /RATE_LIMIT_REST_URL/);
	assert.match(envExample, /RATE_LIMIT_REST_TOKEN/);
});

await test("server action allowed origin contract is documented for operators", () => {
	const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

	assert.match(envExample, /SERVER_ACTION_ALLOWED_ORIGINS/);
	assert.match(envExample, /exact host\[:port\]/i);
	assert.match(envExample, /Coolify|proxy/i);
	assert.match(envExample, /wildcard/i);
	assert.match(envExample, /without scheme/i);
});

await test("static-generation auth request-scope misses become silent unauthenticated responses only during build", () => {
	const requestScopeError = new Error("`headers` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context");

	assert.equal(isStaticGenerationAuthSessionMiss(requestScopeError, { NEXT_PHASE: "phase-production-build" }), true);
	assert.equal(isStaticGenerationAuthSessionMiss(requestScopeError, { NEXT_PHASE: "phase-production-server" }), false);
	assert.equal(isStaticGenerationAuthSessionMiss(new Error("database unavailable"), { NEXT_PHASE: "phase-production-build" }), false);
	assert.deepEqual(buildSilentUnauthenticatedSessionResponse(), {
		ok: false,
		error: { message: "No hay sesion activa", status: 401 },
	});
});

await test("production security validator reports limiter, header, and neutral throttle coverage", () => {
	const output = execFileSync("node", ["scripts/validate-production-security-controls.mjs"], {
		cwd: new URL("..", import.meta.url),
		encoding: "utf8",
	});

	assert.match(output, /Production security controls validation/);
	assert.match(output, /limiter wiring covers auth, reset, and checkout/);
	assert.match(output, /Redis TCP primary store/);
	assert.match(output, /header wiring covers next config or proxy\/middleware/);
	assert.match(output, /neutral throttle responses are wired/);
	assert.match(output, /Server Action origin policy/);
	assert.match(output, /Server Action origin helper is wired into next config/);
	assert.match(output, /Server Action allowedOrigins rejects wildcard, broad, or null literals/);
});

await test("production security validator rejects unsafe server action allowed origins", async () => {
	const { validateServerActionOriginPolicySources } = await loadProductionSecurityValidator();
	const unsafeResults = validateServerActionOriginPolicySources({
		nextConfig: `const nextConfig = { serverActions: { allowedOrigins: ["*", "*.example.com", "https://store.example.com"] } };`,
		envExample: `SERVER_ACTION_ALLOWED_ORIGINS="store.example.com"`,
		serverActionOriginPolicy: `export function buildServerActionConfig() {}`,
	});
	const unsafeBroadCheck = unsafeResults.find((result) => result.label === "Server Action allowedOrigins rejects wildcard, broad, or null literals");

	assert.equal(unsafeBroadCheck?.ok, false);
	assert.match(unsafeBroadCheck?.remediation ?? "", /exact host\[:port\]/i);

	const nullOriginResults = validateServerActionOriginPolicySources({
		nextConfig: `const nextConfig = { serverActions: { allowedOrigins: ["null"] } };`,
		envExample: `SERVER_ACTION_ALLOWED_ORIGINS="store.example.com"`,
		serverActionOriginPolicy: `const SERVER_ACTION_ALLOWED_ORIGINS = "SERVER_ACTION_ALLOWED_ORIGINS";`,
	});
	const nullOriginCheck = nullOriginResults.find((result) => result.label === "Server Action allowedOrigins rejects wildcard, broad, or null literals");

	assert.equal(nullOriginCheck?.ok, false);
	assert.match(nullOriginCheck?.remediation ?? "", /null/i);

	const safeResults = validateServerActionOriginPolicySources({
		nextConfig: `import { buildServerActionConfig } from "./lib/server/security/server-action-origin-policy.js";
const nextConfig = { ...buildServerActionConfig(), async headers() {} };`,
		envExample: `# Server Action origins for proxy deployments
# SERVER_ACTION_ALLOWED_ORIGINS="store.example.com,checkout.example.com:8443"
# Use exact host[:port] entries only, without scheme, path, query, wildcard, or null-origin values.`,
		serverActionOriginPolicy: `const SERVER_ACTION_ALLOWED_ORIGINS = "SERVER_ACTION_ALLOWED_ORIGINS";`,
	});

	assert.deepEqual(
		safeResults.map(({ label, ok }) => [label, ok]),
		[
			["Server Action origin helper is wired into next config", true],
			["Server Action origin env contract is documented", true],
			["Server Action allowedOrigins rejects wildcard, broad, or null literals", true],
		],
	);
});

await test("package scripts expose production security validation in full suites", () => {
	const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

	assert.equal(pkg.scripts?.["validate:production-security-controls"], "node scripts/validate-production-security-controls.mjs");
	assert.equal(pkg.scripts?.["test:production-security-controls"], "tsx scripts/test-production-security-controls.ts");
	assert.match(pkg.scripts?.["test:validation"] ?? "", /validate:production-security-controls/);
	assert.match(pkg.scripts?.["test:runtime"] ?? "", /test:production-security-controls/);
});

await test("blog HTML sanitizer strips scripts, inline handlers, and javascript URLs", () => {
	const unsafeHtml = `<p onclick="alert('inline')">Safe <strong>bold</strong></p><script>alert("xss")</script><a href="javascript:alert(2)" onmouseover="alert(3)">bad link</a><a href="/tienda/producto-seguro">safe link</a>`;
	const sanitized = sanitizeHtml(unsafeHtml);

	assert.equal(/<script\b/i.test(sanitized), false);
	assert.equal(sanitized.includes(`alert("xss")`), false);
	assert.equal(/\son[a-z]+\s*=/i.test(sanitized), false);
	assert.equal(/javascript:/i.test(sanitized), false);
	assert.match(sanitized, /<strong>bold<\/strong>/);
	assert.match(sanitized, /href="\/tienda\/producto-seguro"/);
});

await test("blog markdown stays readable after final sanitizer defense", () => {
	const markdown = `# Titulo seguro

Lee **contenido importante** y visita [producto](/tienda/producto-seguro).

<script>alert('xss')</script>

[ataque](javascript:alert(1))`;
	const rendered = sanitizeHtml(parseMarkdownToHtml(markdown));

	assert.match(rendered, /<h1>Titulo seguro<\/h1>/);
	assert.match(rendered, /<strong>contenido importante<\/strong>/);
	assert.match(rendered, /href="\/tienda\/producto-seguro"/);
	assert.equal(/<script\b/i.test(rendered), false);
	assert.equal(/javascript:/i.test(rendered), false);
});

await test("auth API routes throttle before validation/auth work with neutral 429 responses", async () => {
	await withEnv(
		{ NODE_ENV: "production", RATE_LIMIT_KEY_SECRET: undefined, REDIS_URL: undefined, RATE_LIMIT_REST_URL: undefined, RATE_LIMIT_REST_TOKEN: undefined },
		async () => {
			const rawEmail = "Leaky.User@example.com";
			const rawIp = "198.51.100.77";
			const loginResponse = await credentialsLoginPost(
				buildFormRequest(
					{ email: rawEmail, password: "short", callbackUrl: "/tienda" },
					{ "x-forwarded-for": rawIp, "user-agent": "RawLoginAgent/1.0" },
				),
			);

			assert.equal(loginResponse.status, 429);
			const loginPayload = await loginResponse.json();
			assert.equal(loginPayload.error, "Demasiados intentos. Intenta nuevamente mas tarde.");
			assertNoRawValues(loginPayload, [rawEmail, rawIp, "RawLoginAgent/1.0"]);

			const registroResponse = await registroPost(
				buildJsonRequest(
					{ email: rawEmail, password: "short", confirmPassword: "different" },
					{ "x-forwarded-for": rawIp, "user-agent": "RawRegistrationAgent/1.0" },
				),
			);

			assert.equal(registroResponse.status, 429);
			const registroPayload = await registroResponse.json();
			assert.equal(registroPayload.error, "Demasiados intentos. Intenta nuevamente mas tarde.");
			assertNoRawValues(registroPayload, [rawEmail, rawIp, "RawRegistrationAgent/1.0"]);
		}
	);
});

await test("password reset security returns enforced deny decisions with privacy-safe metadata", async () => {
	await withEnv({ NODE_ENV: "test", RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret" }, async () => {
		const rawEmail = "Reset.User@example.com";
		const rawIp = "203.0.113.24";
		const rawUserAgent = "RawResetAgent/2.0";
		const deniedStore = { name: "memory", async increment() { return { count: 2, resetAt: 31_000 }; } };

		let sendRisk: Awaited<ReturnType<typeof assessPasswordResetSendRisk>> | undefined;
		let tokenRisk: Awaited<ReturnType<typeof assessPasswordResetTokenRisk>> | undefined;
		const logs = await captureConsole(async () => {
			sendRisk = await assessPasswordResetSendRisk(rawEmail, {
				ip: rawIp,
				userAgent: rawUserAgent,
				rateLimit: { store: deniedStore, limit: { maxAttempts: 1, windowSeconds: 30 }, now: 1_000 },
			});
			tokenRisk = await assessPasswordResetTokenRisk(rawEmail, {
				ip: rawIp,
				userAgent: rawUserAgent,
				token: "raw-reset-token-value",
				rateLimit: { store: deniedStore, limit: { maxAttempts: 1, windowSeconds: 30 }, now: 1_000 },
			});
		});

		assert.equal(sendRisk?.ok, true);
		assert.equal(sendRisk?.data.allow, false);
		assert.equal(sendRisk?.meta.enforced, true);
		assert.equal(sendRisk?.meta.rateLimit.decision, "deny");
		assert.equal(tokenRisk?.data.allow, false);
		assert.equal(tokenRisk?.meta.enforced, true);
		assertNoRawValues({ sendRisk, tokenRisk, logs }, [rawEmail, rawIp, rawUserAgent, "raw-reset-token-value"]);
	});
});

await test("password reset request and confirmation short-circuit throttled actors", async () => {
	await withEnv(
		{ NODE_ENV: "production", RATE_LIMIT_KEY_SECRET: undefined, REDIS_URL: undefined, RATE_LIMIT_REST_URL: undefined, RATE_LIMIT_REST_TOKEN: undefined },
		async () => {
			const rawEmail = "Reset.User@example.com";
			const context = { ip: "198.51.100.88", userAgent: "RawResetActionAgent/3.0" };
			const requestResult = await requestPasswordReset(rawEmail, { context });

			assert.equal(requestResult.ok, false);
			assert.equal(requestResult.error.status, 429);
			assert.equal(requestResult.error.message, PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE);
			assertNoRawValues(requestResult, [rawEmail, context.ip, context.userAgent]);

			const confirmResult = await resetPasswordWithToken({
				email: rawEmail,
				token: "raw-reset-confirmation-token",
				password: "Cliente123!Reset",
				context,
			});

			assert.equal(confirmResult.ok, false);
			assert.equal(confirmResult.error.status, 429);
			assert.equal(confirmResult.error.message, PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE);
			assertNoRawValues(confirmResult, [rawEmail, context.ip, context.userAgent, "raw-reset-confirmation-token"]);
		}
	);
});

console.log(`\nResultados: ${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
console.log("Production security controls foundation tests passed.");
