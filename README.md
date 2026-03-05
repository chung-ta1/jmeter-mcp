# jmeter-mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that integrates [Apache JMeter](https://jmeter.apache.org/) with AI assistants like Claude Code. Run load tests, parse results, inspect test plans, and compare performance — all through natural language.

## Prerequisites

- **Node.js** >= 18
- **Apache JMeter** installed locally ([download](https://jmeter.apache.org/download_jmeter.cgi))

## Installation

```bash
git clone https://github.com/chungta/jmeter-mcp.git
cd jmeter-mcp
npm install
npm run build
```

## Configuration

Set the `JMETER_HOME` environment variable to your JMeter installation path:

```bash
export JMETER_HOME=/usr/local/opt/jmeter
```

Or create a `.env` file in the project root (see `.env.example`):

```
JMETER_HOME=/usr/local/opt/jmeter
```

## Usage

### Adding to Claude Code

There are three ways to register this MCP server with Claude Code:

#### Option 1: CLI command (recommended)

```bash
claude mcp add jmeter -e JMETER_HOME=/usr/local/opt/jmeter -- node /absolute/path/to/jmeter-mcp/dist/index.js
```

This adds the server to your project-level config (`.claude/mcp.json`). To add it globally (available in all projects):

```bash
claude mcp add --scope user jmeter -e JMETER_HOME=/usr/local/opt/jmeter -- node /absolute/path/to/jmeter-mcp/dist/index.js
```

#### Option 2: Edit settings file manually

Add to `~/.claude/mcp.json` (global) or `.claude/mcp.json` (project-level):

```json
{
  "mcpServers": {
    "jmeter": {
      "command": "node",
      "args": ["/absolute/path/to/jmeter-mcp/dist/index.js"],
      "env": {
        "JMETER_HOME": "/usr/local/opt/jmeter"
      }
    }
  }
}
```

#### Option 3: From within Claude Code

Run the `/mcp` slash command inside a Claude Code session, then follow the prompts to add a new stdio server.

#### Verify it works

After adding, restart Claude Code and run:

```bash
claude mcp list
```

You should see `jmeter` listed with status `connected`. Then ask Claude things like:

- *"Run the load test at ~/tests/api-test.jmx with 50 threads"*
- *"Show me the results from /tmp/jmeter-results.jtl"*
- *"Compare the baseline and current test results"*
- *"List all test plans in my project"*
- *"Inspect the structure of my test plan"*

### Standalone

```bash
JMETER_HOME=/usr/local/opt/jmeter node dist/index.js
```

The server communicates over stdio using the MCP protocol.

## MCP Tools

| Tool | Description |
|------|-------------|
| `run_test_plan` | Execute a `.jmx` test plan in non-GUI mode and return a results summary |
| `get_test_results` | Parse and summarize a `.jtl` or `.csv` results file |
| `list_test_plans` | Find all `.jmx` files in a directory (optionally recursive) |
| `inspect_test_plan` | Parse a `.jmx` file and return its structure (thread groups, samplers, assertions) |
| `compare_results` | Compare two result files and show performance metric differences |

### Tool Examples

**Run a test plan with custom parameters:**
```json
{
  "tool": "run_test_plan",
  "arguments": {
    "testPlanPath": "/home/user/tests/api-load-test.jmx",
    "threads": 100,
    "duration": 60,
    "rampUp": 10,
    "properties": {
      "server": "api.example.com",
      "port": "8080"
    }
  }
}
```

**Get detailed test results:**
```json
{
  "tool": "get_test_results",
  "arguments": {
    "resultsPath": "/tmp/jmeter-results-1234567890.jtl",
    "detailed": true
  }
}
```

**Compare two test runs:**
```json
{
  "tool": "compare_results",
  "arguments": {
    "baselinePath": "/tmp/baseline-results.jtl",
    "currentPath": "/tmp/current-results.jtl"
  }
}
```

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| [TypeScript](https://www.typescriptlang.org/) | ^5.7 | Language — strict mode, ES2022 target, ESM modules |
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) | ^1.12 | MCP server SDK — `McpServer` high-level API with stdio transport |
| [Zod](https://zod.dev/) | ^3.24 | Schema validation for MCP tool parameters |
| [csv-parse](https://csv.js.org/parse/) | ^5.6 | Parse JMeter `.jtl` / `.csv` result files |
| [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) | ^4.5 | Parse JMeter `.jmx` test plan XML files |
| [dotenv](https://github.com/motdotla/dotenv) | ^17.3 | Load environment variables from `.env` files |
| [Vitest](https://vitest.dev/) | ^4.0 | Test framework (dev dependency) |

## Development

```bash
npm run dev            # Watch mode — recompiles on changes
npm run build          # One-time TypeScript compilation
npm test               # Run all tests
npx vitest run src/test/services/JMeterService.test.ts  # Run a single test file
```

## Project Structure

```
src/
├── index.ts              # Entry point: config → server → stdio transport
├── server.ts             # McpServer creation + tool registration wiring
├── config.ts             # Environment config loader (JMETER_HOME)
├── types/index.ts        # Shared interfaces (JtlRecord, OverallStats, AppConfig)
├── tools/
│   ├── testPlan.ts       # run_test_plan, list_test_plans, inspect_test_plan
│   └── results.ts        # get_test_results, compare_results
├── services/
│   └── JMeterService.ts  # Business logic: CLI execution, JTL/XML parsing
├── utils/
│   └── stats.ts          # percentile(), diffPercent() helpers
└── test/
    ├── config.test.ts
    └── services/
        └── JMeterService.test.ts
```

## License

MIT
