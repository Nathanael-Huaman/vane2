import { buildSecurityHeaders } from "./lib/server/security/security-headers.js";
import { buildServerActionConfig } from "./lib/server/security/server-action-origin-policy.js";

const e2eDistDirSuffix = process.env.E2E_DIST_DIR_SUFFIX;

/** @type {import('next').NextConfig} */
const nextConfig = {
	...buildServerActionConfig(),
	...(e2eDistDirSuffix ? { distDir: `.next-e2e/${e2eDistDirSuffix}` } : {}),
	async headers() {
		return [
			{
				source: "/:path*",
				headers: buildSecurityHeaders(),
			},
		];
	},
};

export default nextConfig;
