import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppConfig } from "../types/index.js";
import { JMeterService } from "../services/JMeterService.js";
import { diffPercent } from "../utils/stats.js";

export function registerResultsTools(server: McpServer, config: AppConfig): void {
  const service = new JMeterService(config);

  server.tool(
    "get_test_results",
    "Parse and summarize a JMeter results file (.jtl or .csv)",
    {
      resultsPath: z.string().describe("Absolute path to the .jtl or .csv results file"),
      detailed: z.boolean().optional().describe("Include per-request details (default: false)"),
    },
    async ({ resultsPath, detailed }) => {
      const summary = await service.parseJtlResults(resultsPath, detailed);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(summary, null, 2),
        }],
      };
    }
  );

  server.tool(
    "compare_results",
    "Compare two JMeter result files and show the difference in performance metrics",
    {
      baselinePath: z.string().describe("Path to the baseline results file"),
      currentPath: z.string().describe("Path to the current results file"),
    },
    async ({ baselinePath, currentPath }) => {
      const [baseline, current] = await Promise.all([
        service.parseJtlResults(baselinePath),
        service.parseJtlResults(currentPath),
      ]);

      const comparison = {
        baseline: baseline.overall,
        current: current.overall,
        diff: {
          avgResponseTime: diffPercent(baseline.overall.avgResponseTime, current.overall.avgResponseTime),
          p95ResponseTime: diffPercent(baseline.overall.p95ResponseTime, current.overall.p95ResponseTime),
          p99ResponseTime: diffPercent(baseline.overall.p99ResponseTime, current.overall.p99ResponseTime),
          errorRate: diffPercent(baseline.overall.errorRate, current.overall.errorRate),
          throughput: diffPercent(baseline.overall.throughput, current.overall.throughput),
        },
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(comparison, null, 2),
        }],
      };
    }
  );
}
