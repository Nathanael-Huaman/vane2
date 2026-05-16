const e2eDistDirSuffix = process.env.E2E_DIST_DIR_SUFFIX;

/** @type {import('next').NextConfig} */
const nextConfig = {
	...(e2eDistDirSuffix ? { distDir: `.next-e2e/${e2eDistDirSuffix}` } : {}),
};

export default nextConfig;
