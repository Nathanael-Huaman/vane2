import {
	errorResponse,
	forbiddenResponse,
	serverErrorResponse,
} from "../response.js";

export function isStoreAdminViewAllowed(authContext) {
	return Boolean(authContext?.isAdmin && authContext?.isAdminView);
}

export function enforceStoreAdminAccess(authResult, authContext) {
	if (!authResult?.ok) {
		return authResult;
	}

	if (!isStoreAdminViewAllowed(authContext)) {
		return forbiddenResponse("Acceso denegado");
	}

	return authResult;
}

export function mapAdminProductMutationError(
	error,
	fallbackMessage,
	details = {},
) {
	const message = error instanceof Error ? error.message : String(error ?? "");

	if (message === "Producto no encontrado") {
		return errorResponse(message, 404, details);
	}

	if (
		message.includes("no existe") ||
		message.includes("ya esta en uso") ||
		message.includes("no se puede modificar") ||
		message.includes("Se requiere")
	) {
		return errorResponse(message, 400, details);
	}

	return serverErrorResponse(fallbackMessage, {
		...details,
		message,
	});
}
