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
	if (exists(file) && !pattern.test(read(file))) {
		failures.push(`${file} is missing ${label}`);
	}
}

// PR A + PR B scope
[
	"lib/actions/store-admin.js",
	"lib/server/store/admin-action-helpers.js",
	"lib/server/store/admin-products.js",
	"lib/server/store/admin-validation.js",
	"scripts/test-store-admin-products.ts",
	"app/admin/tienda/page.js",
	"app/admin/tienda/nuevo/page.js",
	"app/admin/tienda/[id]/page.js",
	"app/admin/tienda/nuevo/product-form-client.js",
	"app/admin/tienda/[id]/product-form-client.js",
	"e2e/store-admin-products-admin-routes.spec.ts",
].forEach(requireFile);

requirePattern(
	"lib/actions/store-admin.js",
	"admin-view access gate",
	/isAdminView|resolvePageAuthContext|isStoreAdminViewAllowed/,
);
requirePattern(
	"lib/actions/store-admin.js",
	"store admin helper wiring",
	/enforceStoreAdminAccess|mapAdminProductMutationError/,
);
requirePattern(
	"lib/actions/store-admin.js",
	"revalidate admin path",
	/revalidatePath\(\s*["'`]\/admin\/tienda["'`]\s*\)/,
);
requirePattern(
	"lib/actions/store-admin.js",
	"revalidate public catalog path",
	/revalidatePath\(\s*["'`]\/tienda["'`]\s*\)/,
);
requirePattern(
	"lib/server/store/admin-validation.js",
	"price minor-units parsing",
	/priceMinorUnits|parse.*price/i,
);
requirePattern(
	"lib/server/store/admin-action-helpers.js",
	"enforced store-admin access helper",
	/export function enforceStoreAdminAccess\(/,
);
requirePattern(
	"lib/server/store/admin-action-helpers.js",
	"mutation error mapping helper",
	/export function mapAdminProductMutationError\(/,
);
requirePattern(
	"lib/server/store/admin-products.js",
	"create admin product",
	/createAdminProduct\(/,
);
requirePattern(
	"lib/server/store/admin-products.js",
	"update admin product",
	/updateAdminProduct\(/,
);

requirePattern(
	"app/admin/tienda/page.js",
	"admin page auth context",
	/resolvePageAuthContext/,
);
requirePattern(
	"app/admin/tienda/page.js",
	"unauthenticated denial branch",
	/!isAuthenticated/,
);
requirePattern(
	"app/admin/tienda/page.js",
	"admin view denial branch",
	/!isAdmin\s*\|\|\s*!isAdminView/,
);
requirePattern(
	"app/admin/tienda/page.js",
	"admin list query",
	/getAdminProducts/,
);
requirePattern(
	"app/admin/tienda/nuevo/page.js",
	"new page denial branch",
	/!isAdmin\s*\|\|\s*!isAdminView/,
);
requirePattern(
	"app/admin/tienda/nuevo/page.js",
	"create form component wiring",
	/NewStoreProductForm/,
);
requirePattern(
	"app/admin/tienda/nuevo/page.js",
	"category options loading",
	/getAdminProductFormOptions/,
);
requirePattern(
	"app/admin/tienda/\[id\]/page.js",
	"edit page denial branch",
	/!isAdmin\s*\|\|\s*!isAdminView/,
);
requirePattern(
	"app/admin/tienda/\[id\]/page.js",
	"edit form component wiring",
	/EditStoreProductForm/,
);
requirePattern(
	"app/admin/tienda/\[id\]/page.js",
	"notFound handling",
	/notFound\(/,
);
requirePattern(
	"app/admin/tienda/nuevo/product-form-client.js",
	"create action wiring",
	/createProductAction/,
);
requirePattern(
	"app/admin/tienda/\[id\]/product-form-client.js",
	"update action wiring",
	/updateProductAction/,
);
requirePattern(
	"components/navbar.jsx",
	"admin store nav link in adminNavLinks",
	/const adminNavLinks = \[[\s\S]*\/admin\/tienda[\s\S]*\];/,
);
requirePattern(
	"components/navbar.jsx",
	"base nav links remain public-only",
	/const baseNavLinks = \[[\s\S]*href:\s*["'`]\/["'`][\s\S]*href:\s*["'`]\/tienda["'`][\s\S]*href:\s*["'`]\/blog["'`][\s\S]*\];/,
);

const scripts = JSON.parse(read("package.json")).scripts ?? {};
const expected = {
	"validate:store-admin-products":
		"node scripts/validate-store-admin-products.mjs",
	"test:store-admin-products":
		"pnpm seed:store && tsx scripts/test-store-admin-products.ts",
	"test:store-admin-products:e2e":
		"pnpm seed:test-auth-users && playwright test e2e/store-admin-products-admin-routes.spec.ts --project=chromium --workers=1",
};

for (const [name, command] of Object.entries(expected)) {
	if (scripts[name] !== command) {
		failures.push(
			`package.json is missing script: \"${name}\": \"${command}\"`,
		);
	}
}

if (failures.length) {
	console.error("Store admin products validation failed:");
	failures.forEach((failure) => console.error(`- ${failure}`));
	process.exit(1);
}

console.log("Store admin products validation passed.");
