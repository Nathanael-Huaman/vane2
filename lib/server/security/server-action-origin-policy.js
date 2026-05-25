const SERVER_ACTION_ALLOWED_ORIGINS = "SERVER_ACTION_ALLOWED_ORIGINS";
const EXACT_HOST_MESSAGE = `${SERVER_ACTION_ALLOWED_ORIGINS} must contain exact host[:port] entries only, without scheme, path, query, fragment, wildcard, or null-origin values.`;

export function parseServerActionAllowedOrigins(env = process.env) {
	if (!Object.prototype.hasOwnProperty.call(env, SERVER_ACTION_ALLOWED_ORIGINS) || env[SERVER_ACTION_ALLOWED_ORIGINS] == null) {
		return [];
	}

	const rawValue = String(env[SERVER_ACTION_ALLOWED_ORIGINS]);
	const entries = rawValue.split(",");
	const origins = [];
	const seen = new Set();

	for (const entry of entries) {
		const origin = normalizeExactHostEntry(entry);
		if (seen.has(origin)) continue;
		seen.add(origin);
		origins.push(origin);
	}

	return origins;
}

export function buildServerActionConfig(env = process.env) {
	const allowedOrigins = parseServerActionAllowedOrigins(env);
	return allowedOrigins.length > 0 ? { serverActions: { allowedOrigins } } : {};
}

function normalizeExactHostEntry(entry) {
	const value = String(entry).trim();

	if (!value) {
		throw new Error(EXACT_HOST_MESSAGE);
	}

	if (value.toLowerCase() === "null") {
		throw new Error(EXACT_HOST_MESSAGE);
	}

	if (value.includes("*")) {
		throw new Error(`${EXACT_HOST_MESSAGE} Wildcard or broad Server Action origins are not allowed.`);
	}

	if (/[/?#\\]|:\/\//.test(value) || /\s/.test(value)) {
		throw new Error(EXACT_HOST_MESSAGE);
	}

	let parsed;
	try {
		parsed = new URL(`https://${value}`);
	} catch {
		throw new Error(EXACT_HOST_MESSAGE);
	}

	if (parsed.host !== value.toLowerCase() || !isSafeExactHostname(parsed.hostname)) {
		throw new Error(EXACT_HOST_MESSAGE);
	}

	return parsed.host;
}

function isSafeExactHostname(hostname) {
	if (!hostname || hostname.includes("*")) return false;
	if (hostname === "localhost") return true;
	if (hostname.startsWith("[") && hostname.endsWith("]")) return true;
	if (hostname.startsWith(".") || hostname.endsWith(".") || hostname.includes("..")) return false;

	return hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}
