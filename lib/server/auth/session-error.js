const PRODUCTION_BUILD_PHASE = "phase-production-build";
const STATIC_REQUEST_SCOPE_ERROR_PATTERNS = [
	/outside a request scope/i,
	/next-dynamic-api-wrong-context/i,
	/requestasyncstorage/i,
	/dynamic server usage:.*\b(headers|cookies)\b/i,
	/\b(headers|cookies)\b.*\brequest\b/i,
];

function getErrorText(error) {
	if (!error) return "";
	if (typeof error === "string") return error;

	const parts = [];
	if (typeof error.message === "string") parts.push(error.message);
	if (typeof error.code === "string") parts.push(error.code);
	if (typeof error.digest === "string") parts.push(error.digest);
	if (typeof error.stack === "string") parts.push(error.stack);

	return parts.join("\n");
}

export function isStaticGenerationAuthSessionMiss(error, env = process.env) {
	if (env?.NEXT_PHASE !== PRODUCTION_BUILD_PHASE) return false;

	const errorText = getErrorText(error);
	return STATIC_REQUEST_SCOPE_ERROR_PATTERNS.some((pattern) => pattern.test(errorText));
}

export function buildSilentUnauthenticatedSessionResponse(message = "No hay sesion activa") {
	return {
		ok: false,
		error: { message, status: 401 },
	};
}
