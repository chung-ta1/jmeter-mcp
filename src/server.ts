import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "./types/index.js";
import { registerTestPlanTools } from "./tools/testPlan.js";
import { registerResultsTools } from "./tools/results.js";

export function createServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: "jmeter-mcp",
    version: "1.0.0",
  });

  registerTestPlanTools(server, config);
  registerResultsTools(server, config);

  return server;
}
