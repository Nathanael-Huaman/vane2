"use client";

import { useEffect, useRef, useState } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function CheckoutCaptcha() {
	const containerRef = useRef(null);
	const widgetIdRef = useRef(null);
	const [token, setToken] = useState("");
	const siteKey = process.env.NEXT_PUBLIC_CHECKOUT_CAPTCHA_SITE_KEY;

	useEffect(() => {
		if (!siteKey || !containerRef.current) return undefined;

		let cancelled = false;
		const renderWidget = () => {
			if (cancelled || widgetIdRef.current || !window.turnstile || !containerRef.current) return;
			widgetIdRef.current = window.turnstile.render(containerRef.current, {
				sitekey: siteKey,
				callback: setToken,
				"expired-callback": () => setToken(""),
				"error-callback": () => setToken(""),
			});
		};

		let script = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
		if (!script) {
			script = document.createElement("script");
			script.src = TURNSTILE_SCRIPT_SRC;
			script.async = true;
			script.defer = true;
			document.head.appendChild(script);
		}

		script.addEventListener("load", renderWidget);
		renderWidget();

		return () => {
			cancelled = true;
			script.removeEventListener("load", renderWidget);
			if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
			widgetIdRef.current = null;
		};
	}, [siteKey]);

	return (
		<div className="space-y-2">
			<input type="hidden" name="checkoutCaptchaToken" value={token} />
			<div ref={containerRef} />
			<p className="text-xs text-muted-foreground">Validá el checkout para continuar. Si falla, intentá nuevamente.</p>
		</div>
	);
}
