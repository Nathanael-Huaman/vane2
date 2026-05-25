const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function getCaptchaSecret(env = process.env) {
	return typeof env.CHECKOUT_CAPTCHA_SECRET_KEY === "string" ? env.CHECKOUT_CAPTCHA_SECRET_KEY.trim() : "";
}

function normalizeToken(token) {
	return typeof token === "string" ? token.trim() : "";
}

export async function verifyCheckoutCaptcha({ token, ip = null, fetchImpl = fetch, env = process.env } = {}) {
	const captchaToken = normalizeToken(token);
	if (!captchaToken) return { ok: false, reason: "missing" };

	const secret = getCaptchaSecret(env);
	if (!secret) return { ok: false, reason: "unavailable" };

	const body = new URLSearchParams({ secret, response: captchaToken });
	if (ip && ip !== "unknown") body.set("remoteip", ip);

	try {
		const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
		});
		if (!response?.ok) return { ok: false, reason: "unavailable" };

		const payload = await response.json().catch(() => null);
		return payload?.success === true ? { ok: true } : { ok: false, reason: "invalid" };
	} catch {
		return { ok: false, reason: "unavailable" };
	}
}
