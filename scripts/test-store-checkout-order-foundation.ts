import "dotenv/config";
import assert from "node:assert/strict";
import {
	__resetCheckoutActionTestDependencies,
	__setCheckoutActionTestDependencies,
} from "../lib/actions/store-checkout-dependencies.js";
import { checkoutAction } from "../lib/actions/store-checkout.js";
import { buildOrderConfirmationViewModel } from "../app/pedido/confirmacion/[token]/confirmation-view-model.js";
import { addCartItem } from "../lib/server/store/cart.js";
import {
	createOrderFromCart,
	getOrderByConfirmationToken,
} from "../lib/server/store/orders.js";
import {
	deriveRateLimitActorKey,
	NEUTRAL_THROTTLE_MESSAGE,
} from "../lib/server/security/rate-limit.js";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

async function getProductBySlug(
	prisma: ReturnType<typeof createRuntimePrismaClient>,
	slug: string,
) {
	const product = await prisma.product.findUnique({ where: { slug } });
	assert.ok(product, `Expected seeded product ${slug}`);
	return product;
}

async function assertRejectsWithMessage(
	action: () => Promise<unknown>,
	pattern: RegExp,
) {
	await assert.rejects(action, pattern);
}

async function withEnv<T>(
	values: Record<string, string | undefined>,
	run: () => Promise<T>,
) {
	const previous = new Map<string, string | undefined>();
	for (const [key, value] of Object.entries(values)) {
		previous.set(key, process.env[key]);
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	try {
		return await run();
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

function assertCheckoutThrottleTelemetry(entries: unknown[][], decision: string) {
	const text = JSON.stringify(entries);
	assert.equal(text.includes('"surface":"checkout"'), true);
	assert.equal(text.includes(`"decision":"${decision}"`), true);
	assert.equal(text.includes("retryAfterSeconds"), true);
	assert.equal(text.includes('"store"'), false);
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

async function resetCheckoutData(prisma: ReturnType<typeof createRuntimePrismaClient>) {
	await prisma.orderItem.deleteMany();
	await prisma.order.deleteMany();
	await prisma.cartItem.deleteMany();
	await prisma.cart.deleteMany();
}

async function restoreSeededProductState(
	prisma: ReturnType<typeof createRuntimePrismaClient>,
) {
	await prisma.product.update({
		where: { slug: "jarron-ceramico-nube" },
		data: {
			name: "Jarrón cerámico Nube",
			slug: "jarron-ceramico-nube",
			priceMinorUnits: 12000,
			stockQuantity: 8,
			status: "active",
		},
	});
	await prisma.product.update({
		where: { slug: "cojin-minimalista" },
		data: {
			name: "Cojín minimalista",
			slug: "cojin-minimalista",
			priceMinorUnits: 6900,
			stockQuantity: 12,
			status: "active",
		},
	});
}

function formData(input: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(input)) data.set(key, value);
	return data;
}

async function installCheckoutActionTestDeps(
	token: string,
	redirects: string[],
	revalidated: string[],
	requestHeaders: Record<string, string> = {},
	overrides: Record<string, unknown> = {},
) {
	await __setCheckoutActionTestDependencies({
		cookies: async () => ({ get: (name: string) => (name === "store_cart_token" ? { value: token } : undefined) }),
		headers: async () => new Headers({ "user-agent": "CheckoutActionTest/1.0", ...requestHeaders }),
		getOptionalAuthenticatedSession: async () => null,
		revalidatePath: (path: string) => revalidated.push(path),
		redirect: (path: string) => {
			redirects.push(path);
			throw Object.assign(new Error("NEXT_REDIRECT"), { path });
		},
		...overrides,
	});
}

async function assertCaptchaRejectedBeforeMutation({
	prisma,
	token,
	form,
	productId,
	stockBefore,
	verifier,
}: {
	prisma: ReturnType<typeof createRuntimePrismaClient>;
	token: string;
	form: FormData;
	productId: string;
	stockBefore: number | null | undefined;
	verifier: (input: { token: string | null; ip: string; userAgent: string }) => Promise<{ ok: boolean; reason?: string }>;
}) {
	const redirects: string[] = [];
	const revalidated: string[] = [];
	const ordersBefore = await prisma.order.count();
	const orderItemsBefore = await prisma.orderItem.count();
	await installCheckoutActionTestDeps(token, redirects, revalidated, {}, { verifyCheckoutCaptcha: verifier });

	const result = await checkoutAction({ ok: false, data: null, error: null }, form);

	assert.equal(result?.ok, false);
	assert.equal(result?.error.status, 400);
	assert.equal(result?.error.message, "No se pudo validar el checkout. Intenta nuevamente.");
	assert.equal(await prisma.order.count(), ordersBefore);
	assert.equal(await prisma.orderItem.count(), orderItemsBefore);
	assert.equal((await prisma.product.findUnique({ where: { id: productId } }))?.stockQuantity, stockBefore);
	assert.equal(await prisma.cartItem.count({ where: { cart: { anonymousToken: token } } }), 1);
	assert.deepEqual(revalidated, []);
	assert.deepEqual(redirects, []);
}

async function main() {
	const prisma = createRuntimePrismaClient();
	try {
		await resetCheckoutData(prisma);

		const vase = await getProductBySlug(prisma, "jarron-ceramico-nube");
		const cushion = await getProductBySlug(prisma, "cojin-minimalista");
		const draft = await getProductBySlug(prisma, "producto-borrador-tienda");

		await addCartItem(
			{ anonymousToken: "checkout-success-cart" },
			{ productId: vase.id, quantity: 2 },
		);
		const success = await createOrderFromCart(
			{ anonymousToken: "checkout-success-cart" },
			{ customerName: "Cliente Checkout", customerEmail: "CLIENTE@EXAMPLE.COM" },
		);
		assert.ok(success.orderId);
		assert.match(success.confirmationToken, /^[a-f0-9]{64}$/);
		assert.equal(
			success.confirmationPath,
			`/pedido/confirmacion/${success.confirmationToken}`,
		);

		const order = await prisma.order.findUnique({
			where: { id: success.orderId },
			include: { items: true },
		});
		assert.ok(order);
		assert.equal(order.customerName, "Cliente Checkout");
		assert.equal(order.customerEmail, "cliente@example.com");
		assert.equal(order.status, "pending");
		assert.equal(order.subtotalMinorUnits, vase.priceMinorUnits * 2);
		assert.equal(order.totalMinorUnits, vase.priceMinorUnits * 2);
		assert.notEqual(order.confirmationTokenHash, success.confirmationToken);
		assert.equal(order.items.length, 1);
		assert.equal(order.items[0]?.productId, vase.id);
		assert.equal(order.items[0]?.productName, vase.name);
		assert.equal(order.items[0]?.productSlug, vase.slug);
		assert.equal(order.items[0]?.unitPriceMinorUnits, vase.priceMinorUnits);
		assert.equal(order.items[0]?.quantity, 2);
		assert.equal(order.items[0]?.lineTotalMinorUnits, vase.priceMinorUnits * 2);

		const decremented = await prisma.product.findUnique({ where: { id: vase.id } });
		assert.equal(decremented?.stockQuantity, vase.stockQuantity - 2);
		assert.equal(
			await prisma.cartItem.count({
				where: { cart: { anonymousToken: "checkout-success-cart" } },
			}),
			0,
		);
		let lookup = await getOrderByConfirmationToken(success.confirmationToken);
		assert.equal(lookup?.id, success.orderId);
		assert.equal(
			Object.hasOwn(lookup ?? {}, "confirmationTokenHash"),
			false,
			"Confirmation lookup must not expose the stored token hash",
		);
		await prisma.product.update({
			where: { id: vase.id },
			data: {
				name: "Jarrón renombrado",
				priceMinorUnits: vase.priceMinorUnits + 1000,
				status: "archived",
			},
		});
		lookup = await getOrderByConfirmationToken(success.confirmationToken);
		assert.equal(lookup?.items[0]?.productName, vase.name);
		assert.equal(lookup?.items[0]?.productSlug, vase.slug);
		assert.equal(lookup?.items[0]?.unitPriceMinorUnits, vase.priceMinorUnits);
		const confirmationView = buildOrderConfirmationViewModel(lookup);
		assert.equal(confirmationView.heading, "Pedido confirmado");
		assert.equal(confirmationView.customerName, "Cliente Checkout");
		assert.equal(confirmationView.customerEmail, "cliente@example.com");
		assert.equal(confirmationView.status, "pending");
		assert.equal(confirmationView.items[0]?.productName, vase.name);
		assert.equal(confirmationView.items[0]?.productSlug, vase.slug);
		assert.equal(confirmationView.items[0]?.quantity, 2);
		assert.equal(confirmationView.items[0]?.unitPriceLabel, "S/. 120.00");
		assert.equal(confirmationView.items[0]?.lineTotalLabel, "S/. 240.00");
		assert.equal(confirmationView.subtotalLabel, "S/. 240.00");
		assert.equal(confirmationView.totalLabel, "S/. 240.00");
		assert.equal(Object.hasOwn(confirmationView, "confirmationTokenHash"), false);
		assert.equal(await getOrderByConfirmationToken("checkout-success-cart"), null);
		assert.equal(await getOrderByConfirmationToken("not-a-token"), null);
		await restoreSeededProductState(prisma);

		await addCartItem(
			{ anonymousToken: "invalid-contact-cart" },
			{ productId: cushion.id, quantity: 1 },
		);
		await assertRejectsWithMessage(
			() =>
				createOrderFromCart(
					{ anonymousToken: "invalid-contact-cart" },
					{ customerName: "", customerEmail: "bad-email" },
				),
			/nombre/i,
		);
		assert.equal(
			await prisma.cartItem.count({
				where: { cart: { anonymousToken: "invalid-contact-cart" } },
			}),
			1,
		);

		await assertRejectsWithMessage(
			() =>
				createOrderFromCart(
					{ anonymousToken: "empty-checkout-cart" },
					{ customerName: "Cliente", customerEmail: "cliente@example.com" },
				),
			/vacio/i,
		);

		await addCartItem(
			{ anonymousToken: "stale-stock-cart" },
			{ productId: cushion.id, quantity: 2 },
		);
		await prisma.product.update({
			where: { id: cushion.id },
			data: { stockQuantity: 1 },
		});
		await assertRejectsWithMessage(
			() =>
				createOrderFromCart(
					{ anonymousToken: "stale-stock-cart" },
					{ customerName: "Cliente", customerEmail: "cliente@example.com" },
				),
			/stock disponible/i,
		);
		assert.equal(
			(await prisma.product.findUnique({ where: { id: cushion.id } }))?.stockQuantity,
			1,
		);
		assert.equal(
			await prisma.cartItem.count({
				where: { cart: { anonymousToken: "stale-stock-cart" } },
			}),
			1,
		);
		await prisma.product.update({
			where: { id: cushion.id },
			data: { stockQuantity: cushion.stockQuantity },
		});

		await addCartItem(
			{ anonymousToken: "rollback-cart" },
			{ productId: vase.id, quantity: 1 },
		);
		await addCartItem(
			{ anonymousToken: "rollback-cart" },
			{ productId: cushion.id, quantity: 1 },
		);
		const vaseBeforeRollback = await prisma.product.findUnique({ where: { id: vase.id } });
		await prisma.product.update({
			where: { id: cushion.id },
			data: { status: "draft" },
		});
		await assertRejectsWithMessage(
			() =>
				createOrderFromCart(
					{ anonymousToken: "rollback-cart" },
					{ customerName: "Cliente", customerEmail: "cliente@example.com" },
				),
			/no esta disponible/i,
		);
		assert.equal(
			(await prisma.product.findUnique({ where: { id: vase.id } }))?.stockQuantity,
			vaseBeforeRollback?.stockQuantity,
		);
		assert.equal(
			await prisma.cartItem.count({
				where: { cart: { anonymousToken: "rollback-cart" } },
			}),
			2,
		);
		await prisma.product.update({
			where: { id: cushion.id },
			data: { status: "active" },
		});

		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "draft-cart" }, { productId: draft.id, quantity: 1 }),
			/no esta disponible/i,
		);

		await addCartItem({ anonymousToken: "action-invalid-contact-cart" }, { productId: cushion.id, quantity: 1 });
		let redirects: string[] = [];
		let revalidated: string[] = [];
		await installCheckoutActionTestDeps("action-invalid-contact-cart", redirects, revalidated, {}, { verifyCheckoutCaptcha: async () => ({ ok: true }) });
		const invalidContact = await checkoutAction(
			{ ok: false, data: null, error: null },
			formData({ customerName: "", customerEmail: "bad-email", checkoutCaptchaToken: "valid-token" }),
		);
		assert.equal(invalidContact.ok, false);
		assert.equal(invalidContact.error.status, 400);
		assert.match(invalidContact.error.message, /nombre/i);
		assert.equal(
			await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-invalid-contact-cart" } } }),
			1,
		);

		await addCartItem({ anonymousToken: "action-stale-cart" }, { productId: cushion.id, quantity: 2 });
		await prisma.product.update({ where: { id: cushion.id }, data: { stockQuantity: 1 } });
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps("action-stale-cart", redirects, revalidated, {}, { verifyCheckoutCaptcha: async () => ({ ok: true }) });
		const stale = await checkoutAction(
			{ ok: false, data: null, error: null },
			formData({ customerName: "Cliente", customerEmail: "cliente@example.com", checkoutCaptchaToken: "valid-token" }),
		);
		assert.equal(stale.ok, false);
		assert.equal(stale.error.status, 400);
		assert.match(stale.error.message, /stock disponible/i);
		assert.equal(
			await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-stale-cart" } } }),
			1,
		);
		await prisma.product.update({ where: { id: cushion.id }, data: { stockQuantity: cushion.stockQuantity } });

		await addCartItem({ anonymousToken: "action-throttled-cart" }, { productId: cushion.id, quantity: 1 });
		const rawThrottleEmail = "Checkout.Leak@example.com";
		const rawThrottleIp = "198.51.100.44";
		const rawThrottleAgent = "RawCheckoutAgent/1.0";
		const ordersBeforeThrottle = await prisma.order.count();
		const orderItemsBeforeThrottle = await prisma.orderItem.count();
		const stockBeforeThrottle = (await prisma.product.findUnique({ where: { id: cushion.id } }))?.stockQuantity;
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps(
			"action-throttled-cart",
			redirects,
			revalidated,
			{ "x-forwarded-for": rawThrottleIp, "user-agent": rawThrottleAgent },
		);
		let throttledResult: Awaited<ReturnType<typeof checkoutAction>> | undefined;
		const throttleLogs = await captureConsole(async () => {
			throttledResult = await withEnv(
				{
					NODE_ENV: "production",
					RATE_LIMIT_KEY_SECRET: undefined,
					REDIS_URL: undefined,
					RATE_LIMIT_REST_URL: undefined,
					RATE_LIMIT_REST_TOKEN: undefined,
				},
				() =>
					checkoutAction(
						{ ok: false, data: null, error: null },
						formData({ customerName: "Cliente Checkout", customerEmail: rawThrottleEmail }),
					),
			);
		});
		assert.equal(throttledResult?.ok, false);
		assert.equal(throttledResult?.error.status, 429);
		assert.equal(throttledResult?.error.message, NEUTRAL_THROTTLE_MESSAGE);
		assert.equal(await prisma.order.count(), ordersBeforeThrottle);
		assert.equal(await prisma.orderItem.count(), orderItemsBeforeThrottle);
		assert.equal(
			(await prisma.product.findUnique({ where: { id: cushion.id } }))?.stockQuantity,
			stockBeforeThrottle,
		);
		assert.equal(
			await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-throttled-cart" } } }),
			1,
		);
		assert.deepEqual(revalidated, []);
		assert.deepEqual(redirects, []);
		assertNoRawValues(
			{ throttledResult, throttleLogs },
			[rawThrottleEmail, rawThrottleIp, rawThrottleAgent, "action-throttled-cart"],
		);
		assertCheckoutThrottleTelemetry(throttleLogs, "fail-closed");
		let captchaVerifierCalls = 0;
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps(
			"action-throttled-cart",
			redirects,
			revalidated,
			{ "x-forwarded-for": rawThrottleIp, "user-agent": rawThrottleAgent },
			{ verifyCheckoutCaptcha: async () => {
				captchaVerifierCalls++;
				return { ok: true };
			} },
		);
		const throttledBeforeCaptcha = await withEnv(
			{
				NODE_ENV: "production",
				RATE_LIMIT_KEY_SECRET: undefined,
				REDIS_URL: undefined,
				RATE_LIMIT_REST_URL: undefined,
				RATE_LIMIT_REST_TOKEN: undefined,
			},
			() => checkoutAction(
				{ ok: false, data: null, error: null },
				formData({ customerName: "Cliente Checkout", customerEmail: rawThrottleEmail, checkoutCaptchaToken: "valid-token" }),
			),
		);
		assert.equal(throttledBeforeCaptcha?.error.status, 429);
		assert.equal(captchaVerifierCalls, 0);

		await addCartItem({ anonymousToken: "action-rest-throttled-cart" }, { productId: cushion.id, quantity: 1 });
		const rawRestEmail = "Checkout.Rest@example.com";
		const rawRestIp = "198.51.100.45";
		const rawRestAgent = "RawCheckoutAgent/2.0";
		const ordersBeforeRestThrottle = await prisma.order.count();
		const stockBeforeRestThrottle = (await prisma.product.findUnique({ where: { id: cushion.id } }))?.stockQuantity;
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps(
			"action-rest-throttled-cart",
			redirects,
			revalidated,
			{ "x-forwarded-for": rawRestIp, "user-agent": rawRestAgent },
		);
		let restRequestBody = "";
		let restThrottledResult: Awaited<ReturnType<typeof checkoutAction>> | undefined;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (_input, init) => {
			restRequestBody = String(init?.body ?? "");
			return new Response(JSON.stringify([{ result: 6 }, { result: "OK" }, { result: 45 }]), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as typeof fetch;
		try {
			const restThrottleLogs = await captureConsole(async () => {
				restThrottledResult = await withEnv(
					{
						NODE_ENV: "production",
						RATE_LIMIT_KEY_SECRET: "checkout-rest-secret",
						REDIS_URL: undefined,
						RATE_LIMIT_REST_URL: "https://redis.example.test",
						RATE_LIMIT_REST_TOKEN: "checkout-rest-token",
					},
					() =>
						checkoutAction(
							{ ok: false, data: null, error: null },
							formData({ customerName: "Cliente Checkout", customerEmail: rawRestEmail }),
						),
				);
			});
			const expectedActorKey = deriveRateLimitActorKey({
				surface: "checkout",
				actorParts: {
					cart: "action-rest-throttled-cart",
					email: rawRestEmail,
					ip: rawRestIp,
					userAgent: rawRestAgent,
				},
				secret: "checkout-rest-secret",
			});
			assert.equal(restThrottledResult?.ok, false);
			assert.equal(restThrottledResult?.error.status, 429);
			assert.equal(restThrottledResult?.meta.retryAfterSeconds, 45);
			assert.equal(restRequestBody.includes(expectedActorKey), true);
			assert.equal(await prisma.order.count(), ordersBeforeRestThrottle);
			assert.equal(
				(await prisma.product.findUnique({ where: { id: cushion.id } }))?.stockQuantity,
				stockBeforeRestThrottle,
			);
			assert.equal(
				await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-rest-throttled-cart" } } }),
				1,
			);
			assert.deepEqual(revalidated, []);
			assert.deepEqual(redirects, []);
			assertNoRawValues(
				{ restThrottledResult, restThrottleLogs, restRequestBody },
				[rawRestEmail, rawRestIp, rawRestAgent, "action-rest-throttled-cart"],
			);
			assertCheckoutThrottleTelemetry(restThrottleLogs, "deny");
		} finally {
			globalThis.fetch = originalFetch;
		}

		await addCartItem({ anonymousToken: "action-success-cart" }, { productId: cushion.id, quantity: 1 });
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps("action-success-cart", redirects, revalidated, {}, { verifyCheckoutCaptcha: async () => ({ ok: true }) });
		await assert.rejects(
			() =>
				checkoutAction(
					{ ok: false, data: null, error: null },
					formData({ customerName: "Cliente Action", customerEmail: "ACTION@EXAMPLE.COM", checkoutCaptchaToken: "valid-token" }),
				),
			(error: Error & { path?: string }) => {
				assert.match(error.path ?? "", /^\/pedido\/confirmacion\/[a-f0-9]{64}$/);
				return true;
			},
		);
		assert.deepEqual(revalidated, ["/carrito", "/checkout"]);
		assert.equal(redirects.length, 1);
		assert.equal(
			await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-success-cart" } } }),
			0,
		);

		for (const scenario of [
			{ token: "action-captcha-missing-cart", fields: {}, verifierResult: { ok: false, reason: "missing" } },
			{ token: "action-captcha-invalid-cart", fields: { checkoutCaptchaToken: "invalid-token" }, verifierResult: { ok: false, reason: "invalid" } },
			{ token: "action-captcha-error-cart", fields: { checkoutCaptchaToken: "error-token" }, verifierResult: { ok: false, reason: "unavailable" } },
		]) {
			await addCartItem({ anonymousToken: scenario.token }, { productId: cushion.id, quantity: 1 });
			const stockBeforeCaptcha = (await prisma.product.findUnique({ where: { id: cushion.id } }))?.stockQuantity;
			await assertCaptchaRejectedBeforeMutation({
				prisma,
				token: scenario.token,
				form: formData({ customerName: "Cliente Captcha", customerEmail: "captcha@example.com", ...scenario.fields }),
				productId: cushion.id,
				stockBefore: stockBeforeCaptcha,
				verifier: async () => scenario.verifierResult,
			});
		}

		await addCartItem({ anonymousToken: "action-captcha-valid-cart" }, { productId: cushion.id, quantity: 1 });
		let validCaptchaInput: { token: string | null; ip: string; userAgent: string } | undefined;
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps("action-captcha-valid-cart", redirects, revalidated, {}, {
			verifyCheckoutCaptcha: async (input: { token: string | null; ip: string; userAgent: string }) => {
				validCaptchaInput = input;
				return { ok: true };
			},
		});
		await assert.rejects(
			() => checkoutAction(
				{ ok: false, data: null, error: null },
				formData({ customerName: "Cliente Captcha", customerEmail: "captcha@example.com", checkoutCaptchaToken: "valid-token" }),
			),
			(error: Error & { path?: string }) => {
				assert.match(error.path ?? "", /^\/pedido\/confirmacion\/[a-f0-9]{64}$/);
				return true;
			},
		);
		assert.equal(validCaptchaInput?.token, "valid-token");
		assert.equal(await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-captcha-valid-cart" } } }), 0);

		await prisma.usuario.upsert({
			where: { email: "checkout-auth@example.com" },
			update: { id: "cliente-regular-id", role: "cliente" },
			create: { id: "cliente-regular-id", email: "checkout-auth@example.com", name: "Cliente Auth", role: "cliente" },
		});
		await addCartItem({ userId: "cliente-regular-id" }, { productId: cushion.id, quantity: 1 });
		let signedInVerifierCalls = 0;
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps("ignored-auth-cart", redirects, revalidated, {}, {
			getOptionalAuthenticatedSession: async () => ({ id: "cliente-regular-id" }),
			verifyCheckoutCaptcha: async () => {
				signedInVerifierCalls++;
				return { ok: false, reason: "missing" };
			},
		});
		await assert.rejects(
			() => checkoutAction(
				{ ok: false, data: null, error: null },
				formData({ customerName: "Cliente Auth", customerEmail: "auth@example.com" }),
			),
			(error: Error & { path?: string }) => {
				assert.match(error.path ?? "", /^\/pedido\/confirmacion\/[a-f0-9]{64}$/);
				return true;
			},
		);
		assert.equal(signedInVerifierCalls, 0);
		const signedInOrder = await prisma.order.findFirst({ where: { userId: "cliente-regular-id" }, orderBy: { createdAt: "desc" } });
		assert.ok(signedInOrder);
		assert.equal(signedInOrder.userId, "cliente-regular-id");
	} finally {
		await __resetCheckoutActionTestDependencies();
		await resetCheckoutData(prisma).catch(() => undefined);
		await restoreSeededProductState(prisma).catch(() => undefined);
		await prisma.$disconnect();
	}

	console.log("Store checkout order foundation runtime tests passed.");
}

main().catch((error) => {
	console.error("Store checkout order foundation runtime tests failed:", error);
	process.exit(1);
});
