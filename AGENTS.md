<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## TDD / pi-lens stability rule

When adding RED tests for a new TypeScript/JavaScript module, do not import a non-existent module.
First create a minimal stub exporting the expected functions/classes, with implementations that throw
`new Error("Not implemented")`. RED tests should fail on behavior/contract, not module resolution.

Add new TypeScript test coverage in small batches to avoid overloading pi-lens/LSP analysis.
