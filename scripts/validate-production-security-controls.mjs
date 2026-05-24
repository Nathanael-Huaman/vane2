#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function readIfExists(path) {
	const fullPath = join(rootDir, path);
	return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path) {
	return JSON.parse(readFileSync(join(rootDir, path), "utf8"));
}

function containsInOrder(source, before, after) {
	const beforeIndex = source.indexOf(before);
	const afterIndex = source.indexOf(after);
	return beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex;
}

function sourceAfter(source, marker) {
	const start = source.indexOf(marker);
	return start >= 0 ? source.slice(start) : "";
}

function exportedFunctionSlice(source, functionName) {
	const marker = `export function ${functionName}`;
	const start = source.indexOf(marker);
	if (start < 0) return "";
	const nextExport = source.indexOf("\nexport ", start + marker.length);
	return nextExport >= 0 ? source.slice(start, nextExport) : source.slice(start);
}

const pkg = readJson("package.json");
const rateLimit = readIfExists("lib/server/security/rate-limit.js");
const securityHeaders = readIfExists("lib/server/security/security-headers.js");
const nextConfig = readIfExists("next.config.mjs");
const proxy = readIfExists("proxy.js");
const middleware = readIfExists("middleware.js");
const credentialsLoginRoute = readIfExists("app/api/auth/credentials-login/route.js");
const registrationRoute = readIfExists("app/api/auth/registro/route.js");
const passwordResetSecurity = readIfExists("lib/server/password/password-reset-security.js");
const passwordReset = readIfExists("lib/server/password/password-reset.js");
const checkoutActionModule = readIfExists("lib/actions/store-checkout.js");
const credentialsLoginPost = sourceAfter(credentialsLoginRoute, "export async function POST");
const registrationPost = sourceAfter(registrationRoute, "export async function POST");
const requestPasswordReset = sourceAfter(passwordReset, "export async function requestPasswordReset");
const resetPasswordWithToken = sourceAfter(passwordReset, "export async function resetPasswordWithToken");
const checkoutAction = sourceAfter(checkoutActionModule, "export async function checkoutAction");
const throttleResponse = exportedFunctionSlice(rateLimit, "buildThrottleResponse");
const checks = [];

function check(label, predicate) {
	let ok = false;
	try {
		ok = Boolean(predicate());
	} catch {
		ok = false;
	}
	checks.push({ label, ok });
	console.log(`${ok ? "✓" : "✗"} ${label}`);
}

console.log("\nProduction security controls validation");
check(
	"package exposes production security validator",
	() => pkg.scripts?.["validate:production-security-controls"] === "node scripts/validate-production-security-controls.mjs",
);
check(
	"package exposes production security runtime test",
	() => pkg.scripts?.["test:production-security-controls"] === "tsx scripts/test-production-security-controls.ts",
);
check(
	"full validation suite includes production security validator",
	() => pkg.scripts?.["test:validation"]?.includes("validate:production-security-controls"),
);
check(
	"full runtime suite includes production security test",
	() => pkg.scripts?.["test:runtime"]?.includes("test:production-security-controls"),
);

console.log("\nLimiter wiring");
check(
	"limiter wiring covers auth, reset, and checkout",
	() =>
		/export\s+async\s+function\s+checkRateLimit\s*\(/.test(rateLimit) &&
		/surface:\s*"auth:credentials-login"/.test(credentialsLoginRoute) &&
		/surface:\s*"auth:registro"/.test(registrationRoute) &&
		/surface:\s*"password-reset:send"/.test(passwordResetSecurity) &&
		/surface:\s*"password-reset:token-use"/.test(passwordResetSecurity) &&
		/surface:\s*"checkout"/.test(checkoutActionModule),
);
check(
	"production limiter requires a shared store and secret",
	() =>
		/REDIS_URL/.test(rateLimit) &&
		/createRedisRateLimitStore/.test(rateLimit) &&
		/@redis\/client/.test(rateLimit) &&
		/RATE_LIMIT_KEY_SECRET/.test(rateLimit) &&
		/RATE_LIMIT_REST_URL/.test(rateLimit) &&
		/RATE_LIMIT_REST_TOKEN/.test(rateLimit) &&
		/UPSTASH_REDIS_REST_URL/.test(rateLimit) &&
		/production_shared_store_required/.test(rateLimit) &&
		/env\.NODE_ENV\s*===\s*"production"/.test(rateLimit),
);
check(
	"Redis TCP primary store is preferred before REST fallback",
	() => containsInOrder(rateLimit, "if (redisUrl)", "if (restUrl && restToken)"),
);
check(
	"auth routes throttle before validation or account work",
	() =>
		containsInOrder(credentialsLoginPost, "await checkRateLimit", "validateCredentials") &&
		containsInOrder(credentialsLoginPost, "await checkRateLimit", "authenticateUserWithCredentials") &&
		containsInOrder(registrationPost, "await checkRateLimit", "registrarUsuario"),
);
check(
	"password reset denies before user, token, or password mutation work",
	() =>
		containsInOrder(requestPasswordReset, "sendRiskResult.data?.allow === false", "findUserForPasswordReset") &&
		containsInOrder(resetPasswordWithToken, "tokenRiskResult.data?.allow === false", "const validationResult = await validatePasswordResetTokenInternal") &&
		containsInOrder(resetPasswordWithToken, "tokenRiskResult.data?.allow === false", "prisma.$transaction"),
);
check(
	"checkout throttles before session resolution or order creation",
	() =>
		containsInOrder(checkoutAction, "const rateLimit = await assessCheckoutRateLimit", "resolveCartActionContext") &&
		containsInOrder(checkoutAction, "const rateLimit = await assessCheckoutRateLimit", "createOrderFromCart"),
);

console.log("\nHeader wiring");
const hasNextConfigHeaderWiring =
	/buildSecurityHeaders/.test(nextConfig) &&
	/async\s+headers\s*\(\)/.test(nextConfig) &&
	/source:\s*"\/:path\*"/.test(nextConfig);
const hasProxyOrMiddlewareHeaderWiring = /Content-Security-Policy/.test(`${proxy}\n${middleware}`) && /NextResponse|Response/.test(`${proxy}\n${middleware}`);

check(
	"header wiring covers next config or proxy/middleware",
	() => hasNextConfigHeaderWiring || hasProxyOrMiddlewareHeaderWiring,
);
check(
	"security header builder supports report-only, enforce, off, and baseline headers",
	() =>
		/"report-only"/.test(securityHeaders) &&
		/enforce/.test(securityHeaders) &&
		/off/.test(securityHeaders) &&
		/X-Content-Type-Options/.test(securityHeaders) &&
		/Referrer-Policy/.test(securityHeaders) &&
		/Permissions-Policy/.test(securityHeaders),
);

console.log("\nNeutral throttle responses");
check(
	"neutral throttle responses are wired",
	() =>
		/NEUTRAL_THROTTLE_MESSAGE/.test(rateLimit) &&
		/status:\s*429/.test(throttleResponse) &&
		/retryAfterSeconds/.test(throttleResponse) &&
		/NEUTRAL_THROTTLE_MESSAGE/.test(credentialsLoginRoute) &&
		/NEUTRAL_THROTTLE_MESSAGE/.test(registrationRoute) &&
		/PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE/.test(passwordReset) &&
		/buildThrottleResponse/.test(checkoutActionModule),
);
check(
	"neutral throttle helper omits raw account, token, cart, product, and order identifiers",
	() => !/\b(email|token|cart|product|orderId|userId)\b/.test(throttleResponse),
);
check(
	"rate-limit logs expose only operational throttle metadata",
	() =>
		/buildRateLimitLogContext/.test(rateLimit) &&
		/surface:\s*result\.surface/.test(rateLimit) &&
		/decision:\s*result\.decision/.test(rateLimit) &&
		/retryAfterSeconds:\s*result\.retryAfterSeconds/.test(rateLimit),
);

const failed = checks.filter((check) => !check.ok);
console.log(`\nResults: ${checks.length - failed.length} passed, ${failed.length} failed`);

if (failed.length) {
	process.exitCode = 1;
} else {
	console.log(
		"Production security controls validation passed: limiter wiring covers auth, reset, and checkout; header wiring covers next config or proxy/middleware; neutral throttle responses are wired.",
	);
}
