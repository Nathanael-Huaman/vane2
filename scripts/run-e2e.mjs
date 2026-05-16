#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PROJECTS = ["chromium", "firefox", "webkit", "mobile-chromium"];
const DEFAULT_BASE_PORT = 3100;
const DB_DIR = path.resolve(".tmp/e2e-db");

function parseArgs(argv) {
	const playwrightOptions = [];
	const projects = [];
	const targets = [];

	for (const arg of argv) {
		if (arg.startsWith("--project=")) {
			projects.push(arg.slice("--project=".length));
			continue;
		}

		if (arg === "--project") {
			throw new Error("Use --project=<name> when calling scripts/run-e2e.mjs");
		}

		if (arg.startsWith("-")) {
			playwrightOptions.push(arg);
			continue;
		}

		targets.push(arg);
	}

	return {
		projects: projects.length > 0 ? projects : DEFAULT_PROJECTS,
		playwrightOptions,
		targets,
	};
}

function toDatabaseUrl(filePath) {
	return pathToFileURL(filePath).toString();
}

function ensureCleanDatabaseFiles(dbFile) {
	fs.mkdirSync(path.dirname(dbFile), { recursive: true });

	for (const suffix of ["", "-shm", "-wal", "-journal"]) {
		fs.rmSync(`${dbFile}${suffix}`, { force: true });
	}
}

function ensureCleanDistDir(projectName, targetIndex) {
	fs.rmSync(path.resolve(".next-e2e", `${projectName}-${targetIndex}`), {
		force: true,
		recursive: true,
	});
}

function listSpecTargets(rootDir) {
	const results = [];

	function walk(currentDir) {
		for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
			const fullPath = path.join(currentDir, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath);
				continue;
			}

			if (entry.isFile() && /\.spec\.(t|j)sx?$/.test(entry.name)) {
				results.push(path.relative(process.cwd(), fullPath));
			}
		}
	}

	walk(rootDir);
	return results.sort();
}

function run(command, args, env) {
	const result = spawnSync(command, args, {
		stdio: "inherit",
		env,
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function main() {
	const { projects, playwrightOptions, targets } = parseArgs(
		process.argv.slice(2),
	);
	const resolvedTargets =
		targets.length > 0 ? targets : listSpecTargets(path.resolve("e2e"));

	projects.forEach((projectName, index) => {
		const port = String(DEFAULT_BASE_PORT + index);

		console.log(`\n=== E2E project: ${projectName} ===`);
		console.log(`E2E_BASE_URL=http://localhost:${port}`);

		resolvedTargets.forEach((target, targetIndex) => {
			const dbFile = path.join(DB_DIR, `${projectName}-${targetIndex}.sqlite`);
			const env = {
				...process.env,
				DATABASE_URL: toDatabaseUrl(dbFile),
				E2E_PORT: port,
				E2E_BASE_URL: `http://localhost:${port}`,
				PLAYWRIGHT_REUSE_EXISTING_SERVER: "0",
				E2E_DIST_DIR_SUFFIX: `${projectName}-${targetIndex}`,
			};

			console.log(`\n--- Target: ${target}`);
			console.log(`DATABASE_URL=${env.DATABASE_URL}`);

			ensureCleanDatabaseFiles(dbFile);
			ensureCleanDistDir(projectName, targetIndex);
			run("pnpm", ["exec", "prisma", "db", "push"], env);
			run("pnpm", ["exec", "tsx", "scripts/seed-store.ts"], env);
			run("pnpm", ["exec", "tsx", "scripts/create-test-auth-users.ts"], env);
			run(
				"pnpm",
				[
					"exec",
					"playwright",
					"test",
					`--project=${projectName}`,
					target,
					...playwrightOptions,
				],
				env,
			);
		});
	});
}

main();
