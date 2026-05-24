import { createHmac } from "node:crypto";
import { createClient as createRedisClient } from "@redis/client";

export const NEUTRAL_THROTTLE_MESSAGE =
	"Demasiados intentos. Intenta nuevamente mas tarde.";

const DEFAULT_LIMIT = Object.freeze({ maxAttempts: 5, windowSeconds: 60 });
const LOCAL_SECRET = "local-development-rate-limit-secret";

let defaultMemoryStore;
const defaultRedisStores = new Map();

export async function checkRateLimit(options = {}) {
	const env = options.env ?? process.env;
	const limit = normalizeLimit(options.limit);
	const surface = normalizeSurface(options.surface);
	const now = Number(options.now ?? Date.now());
	const secret = resolveRateLimitSecret(env);

	if (!secret.ok) {
		return failClosed({ surface, store: "unconfigured", retryAfterSeconds: limit.windowSeconds });
	}

	const actorKey = deriveRateLimitActorKey({
		surface,
		actorParts: options.actorParts ?? [],
		secret: secret.value,
	});
	const selected = options.store
		? { ok: true, store: options.store }
		: createRateLimitStoreFromEnv({
				env,
				fetchImpl: options.fetchImpl,
				redisClientFactory: options.redisClientFactory,
			});

	if (!selected.ok) {
		return failClosed({ surface, store: "unconfigured", retryAfterSeconds: limit.windowSeconds });
	}

	if (env.NODE_ENV === "production" && selected.store.name === "memory") {
		return failClosed({ surface, store: "memory", retryAfterSeconds: limit.windowSeconds });
	}

	try {
		const counter = await selected.store.increment({ key: actorKey, limit, now });
		const retryAfterSeconds = resolveRetryAfterSeconds(counter, now, limit.windowSeconds);
		const allowed = counter.count <= limit.maxAttempts;

		return {
			allowed,
			surface,
			decision: allowed ? "allow" : "deny",
			store: selected.store.name,
			retryAfterSeconds: allowed ? 0 : retryAfterSeconds,
			remaining: Math.max(limit.maxAttempts - counter.count, 0),
			actorKey,
			limit,
		};
	} catch {
		return failClosed({
			surface,
			store: selected.store.name ?? "unconfigured",
			retryAfterSeconds: limit.windowSeconds,
		});
	}
}

export function deriveRateLimitActorKey({ surface, actorParts = [], secret }) {
	if (!secret) throw new Error("RATE_LIMIT_KEY_SECRET is required");
	const normalizedSurface = normalizeSurface(surface);
	const payload = JSON.stringify({
		surface: normalizedSurface,
		actorParts: normalizeActorParts(actorParts),
	});
	const hash = createHmac("sha256", secret).update(payload).digest("hex");
	return `rl:${normalizedSurface}:${hash}`;
}

export function createMemoryRateLimitStore() {
	const counters = new Map();

	return {
		name: "memory",
		async increment({ key, limit, now = Date.now() }) {
			const normalizedLimit = normalizeLimit(limit);
			const windowMs = normalizedLimit.windowSeconds * 1_000;
			let entry = counters.get(key);

			if (!entry || entry.resetAt <= now) {
				entry = { count: 0, resetAt: now + windowMs };
			}

			entry.count += 1;
			counters.set(key, entry);
			return { count: entry.count, resetAt: entry.resetAt };
		},
		reset() {
			counters.clear();
		},
	};
}

export function createRestRateLimitStore({ url, token, fetchImpl = globalThis.fetch } = {}) {
	if (!url || !token) throw new Error("REST rate-limit store requires url and token");
	const endpoint = `${String(url).replace(/\/+$/, "")}/pipeline`;

	return {
		name: "rest",
		async increment({ key, limit, now = Date.now() }) {
			const normalizedLimit = normalizeLimit(limit);
			const response = await fetchImpl(endpoint, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify([
					["INCR", key],
					["EXPIRE", key, normalizedLimit.windowSeconds, "NX"],
					["TTL", key],
				]),
			});

			if (!response.ok) throw new Error("REST rate-limit store failed");
			const payload = await response.json();
			const count = Number(readRestResult(payload, 0, "count"));
			const ttlSeconds = Number(readRestResult(payload, 2, "ttlSeconds"));

			if (!Number.isFinite(count)) throw new Error("REST rate-limit count missing");
			return {
				count,
				resetAt: now + resolvePositiveNumber(ttlSeconds, normalizedLimit.windowSeconds) * 1_000,
				retryAfterSeconds: resolvePositiveNumber(ttlSeconds, normalizedLimit.windowSeconds),
			};
		},
	};
}

export function createRedisRateLimitStore({ url, client, createClient = createRedisClient } = {}) {
	if (!url && !client) throw new Error("Redis rate-limit store requires url");
	const redisClient = client ?? createClient({ url });

	return {
		name: "redis",
		async increment({ key, limit, now = Date.now() }) {
			const normalizedLimit = normalizeLimit(limit);
			await ensureRedisClient(redisClient);

			const count = Number(await sendRedisCommand(redisClient, ["INCR", key]));
			await sendRedisCommand(redisClient, ["EXPIRE", key, String(normalizedLimit.windowSeconds), "NX"]);
			const ttlSeconds = Number(await sendRedisCommand(redisClient, ["TTL", key]));

			if (!Number.isFinite(count)) throw new Error("Redis rate-limit count missing");
			const retryAfterSeconds = resolvePositiveNumber(ttlSeconds, normalizedLimit.windowSeconds);
			return {
				count,
				resetAt: now + retryAfterSeconds * 1_000,
				retryAfterSeconds,
			};
		},
	};
}

export function createRateLimitStoreFromEnv({ env = process.env, fetchImpl, redisClientFactory } = {}) {
	const redisUrl = env.REDIS_URL;
	const restUrl = env.RATE_LIMIT_REST_URL ?? env.UPSTASH_REDIS_REST_URL;
	const restToken = env.RATE_LIMIT_REST_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;

	if (redisUrl) {
		return {
			ok: true,
			store: resolveRedisRateLimitStore({ url: redisUrl, redisClientFactory }),
		};
	}

	if (restUrl && restToken) {
		return {
			ok: true,
			store: createRestRateLimitStore({ url: restUrl, token: restToken, fetchImpl }),
		};
	}

	if (env.NODE_ENV === "production") {
		return { ok: false, reason: "production_shared_store_required" };
	}

	defaultMemoryStore ??= createMemoryRateLimitStore();
	return { ok: true, store: defaultMemoryStore };
}

export function buildThrottleResponse(result, message = NEUTRAL_THROTTLE_MESSAGE) {
	return {
		ok: false,
		error: { message, status: 429 },
		meta: { retryAfterSeconds: result.retryAfterSeconds ?? DEFAULT_LIMIT.windowSeconds },
	};
}

export function buildRateLimitLogContext(result) {
	return {
		surface: result.surface,
		decision: result.decision,
		retryAfterSeconds: result.retryAfterSeconds,
		store: result.store,
	};
}

function failClosed({ surface, store, retryAfterSeconds }) {
	return {
		allowed: false,
		surface,
		decision: "fail-closed",
		store,
		retryAfterSeconds,
		remaining: 0,
	};
}

function normalizeLimit(limit = {}) {
	const maxAttempts = Number(limit.maxAttempts ?? DEFAULT_LIMIT.maxAttempts);
	const windowSeconds = Number(
		limit.windowSeconds ?? Number(limit.windowMinutes) * 60 ?? DEFAULT_LIMIT.windowSeconds,
	);

	return {
		maxAttempts: resolvePositiveNumber(maxAttempts, DEFAULT_LIMIT.maxAttempts),
		windowSeconds: resolvePositiveNumber(windowSeconds, DEFAULT_LIMIT.windowSeconds),
	};
}

function normalizeSurface(surface) {
	const normalized = String(surface ?? "public-mutation")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9:_-]/g, "-");
	return normalized || "public-mutation";
}

function normalizeActorParts(actorParts) {
	if (Array.isArray(actorParts)) return actorParts.map(normalizeActorValue);
	if (actorParts && typeof actorParts === "object") {
		return Object.fromEntries(
			Object.keys(actorParts)
				.sort()
				.map((key) => [key, normalizeActorValue(actorParts[key])]),
		);
	}
	return normalizeActorValue(actorParts);
}

function normalizeActorValue(value) {
	if (Array.isArray(value)) return value.map(normalizeActorValue);
	if (value && typeof value === "object") return normalizeActorParts(value);
	return String(value ?? "").trim().toLowerCase();
}

function resolveRateLimitSecret(env) {
	const value = env.RATE_LIMIT_KEY_SECRET;
	if (!value && env.NODE_ENV === "production") {
		return { ok: false, reason: "production_key_secret_required" };
	}
	return { ok: true, value: value || env.AUTH_SECRET || LOCAL_SECRET };
}

function resolveRedisRateLimitStore({ url, redisClientFactory }) {
	if (redisClientFactory) {
		return createRedisRateLimitStore({ url, createClient: redisClientFactory });
	}

	const cacheKey = String(url);
	let store = defaultRedisStores.get(cacheKey);
	if (!store) {
		store = createRedisRateLimitStore({ url });
		defaultRedisStores.set(cacheKey, store);
	}
	return store;
}

async function ensureRedisClient(client) {
	if (client?.isOpen || client?.isReady) return;
	if (typeof client?.connect === "function") {
		await client.connect();
	}
}

async function sendRedisCommand(client, command) {
	if (typeof client?.sendCommand !== "function") {
		throw new Error("Redis client does not support sendCommand");
	}
	return client.sendCommand(command);
}

function resolveRetryAfterSeconds(counter, now, fallback) {
	if (Number.isFinite(counter.retryAfterSeconds)) return counter.retryAfterSeconds;
	return Math.max(1, Math.ceil((counter.resetAt - now) / 1_000)) || fallback;
}

function resolvePositiveNumber(value, fallback) {
	return Number.isFinite(value) && value > 0 ? Math.ceil(value) : fallback;
}

function readRestResult(payload, index, key) {
	if (Array.isArray(payload)) return payload[index]?.result;
	if (Array.isArray(payload?.result)) return payload.result[index]?.result ?? payload.result[index];
	return payload?.[key];
}
