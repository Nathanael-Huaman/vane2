import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(path.join(root, file), "utf8");
const exists = (file) => existsSync(path.join(root, file));

function requireFile(file) {
	if (!exists(file)) failures.push(`Missing required file: ${file}`);
}
function requirePattern(file, label, pattern) {
	requireFile(file);
	if (exists(file) && !pattern.test(read(file)))
		failures.push(`${file} is missing ${label}`);
}

requirePattern(
	"prisma/schema.prisma",
	"ProductStatus enum",
	/enum\s+ProductStatus\s*{[\s\S]*active[\s\S]*draft[\s\S]*archived[\s\S]*}/,
);
requirePattern(
	"prisma/schema.prisma",
	"Category model",
	/model\s+Category\s*{[\s\S]*@@map\("store_categories"\)[\s\S]*}/,
);
requirePattern(
	"prisma/schema.prisma",
	"Product model",
	/model\s+Product\s*{[\s\S]*priceMinorUnits\s+Int[\s\S]*stockQuantity\s+Int[\s\S]*status\s+ProductStatus[\s\S]*@@map\("store_products"\)[\s\S]*}/,
);
[
	"lib/server/store/catalog.js",
	"lib/server/store/formatting.js",
	"lib/server/store/validation.js",
	"scripts/seed-store.ts",
	"app/tienda/page.js",
	"app/tienda/[slug]/page.js",
].forEach(requireFile);

requirePattern(
	"app/tienda/page.js",
	"public catalog heading",
	/\bTienda Obstedesign\b/,
);
requirePattern(
	"app/tienda/page.js",
	"public catalog service usage",
	/getPublicCatalogProducts\(/,
);
if (
	exists("app/tienda/page.js") &&
	read("app/tienda/page.js").includes("Sesion no iniciada")
) {
	failures.push(
		'app/tienda/page.js still contains old visitor login-required state: "Sesion no iniciada"',
	);
}
requirePattern(
	"app/tienda/[slug]/page.js",
	"detail service usage",
	/getPublicProductBySlug\(/,
);
requirePattern("app/tienda/[slug]/page.js", "notFound handling", /notFound\(/);

const scripts = JSON.parse(read("package.json")).scripts ?? {};
const expected = {
	"validate:store-catalog": "node scripts/validate-store-catalog.mjs",
	"seed:store": "tsx scripts/seed-store.ts",
	"test:store-foundation":
		"pnpm seed:store && tsx scripts/test-store-foundation.ts",
};
for (const [name, command] of Object.entries(expected)) {
	if (scripts[name] !== command)
		failures.push(`package.json is missing script: "${name}": "${command}"`);
}

if (failures.length) {
	console.error("Store catalog foundation validation failed:");
	failures.forEach((failure) => console.error(`- ${failure}`));
	process.exit(1);
}
console.log("Store catalog foundation validation passed.");
