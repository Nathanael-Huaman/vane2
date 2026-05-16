import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT || "3000";
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;
const reuseExistingServer =
	process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";

export default defineConfig({
	testDir: "./e2e",
	timeout: 45_000,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: [["list"]],
	use: {
		baseURL,
		headless: true,
		trace: "on-first-retry",
	},
	webServer: {
		command: `pnpm dev --port ${port}`,
		url: baseURL,
		reuseExistingServer,
		timeout: 180_000,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
		{
			name: "mobile-chromium",
			use: { ...devices["Pixel 5"] },
		},
	],
});
