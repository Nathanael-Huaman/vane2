const CSP_HEADER_BY_MODE = Object.freeze({
	"report-only": "Content-Security-Policy-Report-Only",
	enforce: "Content-Security-Policy",
});

const BASELINE_SECURITY_HEADERS = Object.freeze([
	{ key: "X-DNS-Prefetch-Control", value: "on" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "SAMEORIGIN" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
	},
	{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]);

const DEFAULT_CSP_DIRECTIVES = Object.freeze([
	["default-src", ["'self'"]],
	["script-src", ["'self'"]],
	// Static next.config.js headers cannot issue request nonces. Keep style inline
	// compatibility documented and scoped while scripts remain same-origin only.
	["style-src", ["'self'", "'unsafe-inline'"]],
	["img-src", ["'self'", "data:", "blob:"]],
	["font-src", ["'self'", "data:"]],
	["connect-src", ["'self'"]],
	["frame-src", ["'self'"]],
	["media-src", ["'self'"]],
	["object-src", ["'none'"]],
	["base-uri", ["'self'"]],
	["form-action", ["'self'"]],
	["frame-ancestors", ["'self'"]],
]);

export function buildContentSecurityPolicy(options = {}) {
	const env = options.env ?? process.env;
	const mode = normalizeCspMode(options.mode ?? env.SECURITY_HEADERS_CSP_MODE);
	if (mode === "off") {
		return { mode, headerName: null, value: "" };
	}

	return {
		mode,
		headerName: CSP_HEADER_BY_MODE[mode],
		value: serializeCspDirectives(options.directives ?? DEFAULT_CSP_DIRECTIVES),
	};
}

export function buildSecurityHeaders(options = {}) {
	const csp = buildContentSecurityPolicy(options);
	const headers = BASELINE_SECURITY_HEADERS.map((header) => ({ ...header }));

	if (csp.headerName && csp.value) {
		headers.push({ key: csp.headerName, value: csp.value });
	}

	return headers;
}

function normalizeCspMode(mode) {
	const normalized = String(mode ?? "report-only")
		.trim()
		.toLowerCase()
		.replace(/_/g, "-");

	if (normalized === "report" || normalized === "reportonly") return "report-only";
	if (normalized === "enforced") return "enforce";
	if (normalized === "disabled") return "off";
	return normalized === "enforce" || normalized === "off" || normalized === "report-only"
		? normalized
		: "report-only";
}

function serializeCspDirectives(directives) {
	return Array.from(directives)
		.map(([name, values]) => {
			const directive = String(name).trim();
			const directiveValues = Array.isArray(values) ? values : [];
			return [directive, ...directiveValues.map((value) => String(value).trim()).filter(Boolean)].join(" ");
		})
		.filter(Boolean)
		.join("; ");
}
