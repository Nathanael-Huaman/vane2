#!/usr/bin/env node
import fs from "node:fs";

const workflowPath = ".github/workflows/ci.yml";
const packagePath = "package.json";
const workflow = fs.readFileSync(workflowPath, "utf8");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const checks = [];

function check(label, predicate) {
	let ok = false;
	try {
		ok = Boolean(predicate());
	} catch {
		ok = false;
	}
	checks.push({ label, ok });
	console.log(`${ok ? "✓" : "✗"} ${label}`);
}

function extractJobBlock(source, jobName) {
	const lines = source.split(/\r?\n/);
	const start = lines.findIndex((line) => line === `  ${jobName}:`);
	if (start < 0) return "";

	let end = lines.length;
	for (let index = start + 1; index < lines.length; index += 1) {
		if (/^  [a-zA-Z0-9_-]+:\s*$/.test(lines[index])) {
			end = index;
			break;
		}
	}

	return lines.slice(start, end).join("\n");
}

function containsBroadE2eCommand(source) {
	return /(^|\s)pnpm\s+test:e2e(?::all)?(?:\s|$)/.test(source);
}

const e2eSmokeJob = extractJobBlock(workflow, "e2e-smoke");

console.log("\nE2E CI signal workflow validation");
check("package exposes e2e CI signal validator", () => pkg.scripts?.["validate:e2e-ci-signal"] === "node scripts/validate-e2e-ci-signal.mjs");
check("default validation includes e2e CI signal validator", () => pkg.scripts?.["test:validation"]?.includes("pnpm validate:e2e-ci-signal"));
check("CI workflow defines e2e-smoke job", () => e2eSmokeJob.length > 0);
check("e2e-smoke job is pull_request-only", () => e2eSmokeJob.includes("if: github.event_name == 'pull_request'"));
check("e2e-smoke installs Chromium Playwright dependencies", () => e2eSmokeJob.includes("run: pnpm exec playwright install --with-deps chromium"));
check("e2e-smoke runs targeted store admin orders command", () => e2eSmokeJob.includes("run: pnpm test:store-admin-orders:e2e"));
check("e2e-smoke does not run broad E2E commands", () => !containsBroadE2eCommand(e2eSmokeJob));

const failed = checks.filter((checkResult) => !checkResult.ok);
console.log(`\nResults: ${checks.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
