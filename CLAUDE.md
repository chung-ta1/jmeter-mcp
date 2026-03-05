# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An MCP (Model Context Protocol) server that wraps Apache JMeter, exposing 5 tools: `run_test_plan`, `get_test_results`, `list_test_plans`, `inspect_test_plan`, and `compare_results`. It uses the `McpServer` high-level API from `@modelcontextprotocol/sdk` with Zod schemas for tool parameter validation.

## Build & Test Commands

```bash
npm run build          # TypeScript compilation (tsc) -> dist/
npm test               # Run all tests via vitest
npx vitest run src/test/services/JMeterService.test.ts  # Run a single test file
npm run dev            # Watch mode for TypeScript
```

To start the server: `JMETER_HOME=/path/to/jmeter node dist/index.js`

## Architecture

The codebase follows a layered MCP server pattern:

- **`src/index.ts`** — Minimal entry point: loads config, creates server, connects stdio transport, handles SIGINT
- **`src/server.ts`** — Creates `McpServer` instance and wires tool registrations
- **`src/config.ts`** — `loadConfig()` reads `JMETER_HOME` from env (with dotenv support), returns `AppConfig`
- **`src/tools/`** — Tool registration modules. Each exports a `register*Tools(server, config)` function that calls `server.tool()` with Zod schemas. Handlers are thin — they delegate to `JMeterService`
  - `testPlan.ts` — run, list, inspect tools
  - `results.ts` — get results, compare tools
- **`src/services/JMeterService.ts`** — All business logic: JMeter CLI execution (`execFile`), JTL/CSV parsing (`csv-parse`), JMX XML parsing (`fast-xml-parser`), file search
- **`src/types/index.ts`** — Shared interfaces: `JtlRecord`, `OverallStats`, `ParsedResults`, `AppConfig`
- **`src/utils/stats.ts`** — `percentile()` and `diffPercent()` helpers

## Key Patterns

- Tool handlers return `{ content: [{ type: "text", text: JSON.stringify(...) }] }` — all MCP responses are JSON-stringified text
- `JMeterService` takes `AppConfig` via constructor; tool modules instantiate it themselves
- Tests use `vi.mock("node:fs/promises")` at module level (hoisted) with `vi.mocked()` for type-safe mock setup inside each test — don't use variables in `vi.mock` factory callbacks
- Tests live in `src/test/` mirroring the source structure; vitest config restricts to `src/test/**/*.test.ts` to avoid running compiled JS in `dist/`

## Environment

- Requires `JMETER_HOME` env var pointing to a JMeter installation
- TypeScript targets ES2022 with bundler module resolution
- ESM-only (`"type": "module"` in package.json) — all local imports use `.js` extensions
